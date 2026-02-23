/**
 * POST /api/admin/generate/bulk
 *
 * Single-batch question generator with advanced features:
 *  - Certification-specific prompts with few-shot examples
 *  - Auto-retry for failed validations
 *  - Domain coverage analysis
 *  - Bloom's taxonomy classification
 *  - AI quality scoring
 *  - Semantic deduplication
 *  - Multi-answer support
 *  - Feedback loop from user reports
 *  - Adaptive temperature per difficulty
 *
 * Admin-only.
 */

import { withAdmin, type RouteContext } from '@/lib/api-middleware';
import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import {
    type GeneratedQuestion,
    type CertDomain,
    type CertInfo,
    validateQuestion,
    cleanQ,
    buildPrompt,
    buildRetryPrompt,
    classifyBloomLevel,
    isBloomBelowExpected,
    analyzeDomainCoverage,
    buildQualityScorePrompt,
    parseQualityScores,
    buildAntiPatternBlock,
} from '@/lib/generator-utils';
import { KNOWN_CERTS, CERT_ALIASES } from '@/lib/cert-catalog';
import { findSemanticDuplicates } from '@/lib/semantic-dedup';

export const maxDuration = 300;

// ── OpenAI call helper ──

async function callOpenAI(
    apiKey: string,
    model: string,
    system: string,
    user: string,
    temperature: number,
): Promise<string> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: user },
            ],
            temperature,
            response_format: { type: 'json_object' },
        }),
    });
    if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
}

// ── Import batch to Firestore ──

async function importToFirestore(
    db: FirebaseFirestore.Firestore,
    studyId: string,
    questions: GeneratedQuestion[],
): Promise<number> {
    const CHUNK = 400;
    let imported = 0;
    for (let i = 0; i < questions.length; i += CHUNK) {
        const chunk = questions.slice(i, i + CHUNK);
        const batch = db.batch();
        for (const q of chunk) {
            batch.set(db.collection('marketplace_questions').doc(), {
                studyId,
                text: q.text,
                options: q.options,
                correctOptionIndex: q.correctOptionIndex,
                ...(q.correctOptionIndices ? { correctOptionIndices: q.correctOptionIndices } : {}),
                ...(q.questionType && q.questionType !== 'single' ? { questionType: q.questionType } : {}),
                explanation: q.explanation,
                difficulty: q.difficulty,
                domainIds: q.domainIds?.length ? q.domainIds : ['general'],
                tags: q.tags ?? [],
                bloomLevel: q.bloomLevel,
                qualityScore: q.qualityScore,
                isActive: true,
                source: 'bulk-generator',
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });
            imported++;
        }
        batch.update(db.collection('marketplace_studies').doc(studyId), {
            questionCount: FieldValue.increment(chunk.length),
            updatedAt: FieldValue.serverTimestamp(),
        });
        await batch.commit();
    }
    return imported;
}

// ── Load report patterns for feedback loop ──

async function loadReportPatterns(db: FirebaseFirestore.Firestore, studyId: string): Promise<string[]> {
    try {
        const snap = await db.collection('question_reports')
            .where('studyId', '==', studyId)
            .where('status', '==', 'open')
            .orderBy('createdAt', 'desc')
            .limit(30)
            .get();
        return snap.docs.map((d) => d.data().reason || d.data().type || '').filter(Boolean);
    } catch {
        return []; // Collection may not exist, non-critical
    }
}

// ── Main handler ──

export const POST = withAdmin(
    async (request: Request, { user, log }: RouteContext) => {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });

        const body = await request.json();
        const schema = z.object({
            certSlug: z.string().optional(),
            studyId: z.string().optional(),
            batchSize: z.number().int().min(5).max(30).default(25),
            lang: z.string().default('en'),
            model: z.string().default('gpt-4o-mini'),
            autoImport: z.boolean().default(true),
            domainId: z.string().optional(),
            existingStems: z.array(z.string()).default([]),
            enableMultiAnswer: z.boolean().default(false),
            enableQualityScore: z.boolean().default(false),
            enableSemanticDedup: z.boolean().default(false),
            qualityThreshold: z.number().min(0).max(100).default(60),
        }).refine((d) => d.certSlug || d.studyId, { message: 'certSlug or studyId required' });

        const parsed = schema.parse(body);
        const db = getAdminDb();
        const startMs = Date.now();

        // ── Resolve cert + study ──
        let cert: CertInfo;
        let studyId: string;

        if (parsed.studyId) {
            const snap = await db.collection('marketplace_studies').doc(parsed.studyId).get();
            if (!snap.exists) return NextResponse.json({ error: 'Study not found' }, { status: 404 });
            const data = snap.data()!;
            studyId = parsed.studyId;
            const nameKey = data.name?.toLowerCase().replace(/\s+/g, '-') ?? '';
            const aliasKey = CERT_ALIASES[nameKey] ?? CERT_ALIASES[data.abbreviation?.toLowerCase() ?? ''];
            const match = aliasKey ? KNOWN_CERTS[aliasKey] : null;
            cert = match || {
                slug: data.abbreviation?.toLowerCase() ?? 'study',
                name: data.name ?? 'Study',
                issuer: data.issuer ?? 'Unknown',
                domains: (data.domains ?? []) as CertDomain[],
            };
        } else {
            const slug = parsed.certSlug!;
            const resolved = CERT_ALIASES[slug] ?? slug;
            const known = KNOWN_CERTS[resolved];
            if (!known) return NextResponse.json({ error: `Unknown cert "${slug}"` }, { status: 400 });
            cert = known;
            const existing = await db.collection('marketplace_studies')
                .where('abbreviation', '==', slug.toUpperCase().slice(0, 20))
                .where('isActive', '==', true).limit(1).get();
            if (!existing.empty) {
                studyId = existing.docs[0].id;
            } else {
                const ref = db.collection('marketplace_studies').doc();
                await ref.set({
                    abbreviation: slug.toUpperCase().slice(0, 20),
                    name: cert.name, issuer: cert.issuer,
                    description: `Practice questions for ${cert.name} — generated by ExamFlow AI.`,
                    domains: cert.domains.map((d, i) => ({ id: d.id, name: d.name, order: i })),
                    questionCount: 0, domainQuestionCounts: {}, importCount: 0,
                    tags: [cert.issuer, slug], isActive: true,
                    createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), createdBy: user.uid,
                });
                studyId = ref.id;
            }
        }

        // ── Feature 9: Feedback loop — load report patterns ──
        const reportReasons = await loadReportPatterns(db, studyId);
        const antiPatterns = buildAntiPatternBlock(reportReasons);

        // ── Generate (with adaptive temperature, few-shot, multi-answer, feedback) ──
        const { system, user: userPrompt, temperature } = buildPrompt({
            certName: cert.name,
            issuer: cert.issuer,
            domains: cert.domains,
            targetDomainId: parsed.domainId,
            batchSize: parsed.batchSize,
            lang: parsed.lang,
            existingStems: parsed.existingStems,
            enableMultiAnswer: parsed.enableMultiAnswer,
            reportedPatterns: antiPatterns,
        });

        let rawContent: string;
        try {
            rawContent = await callOpenAI(apiKey, parsed.model, system, userPrompt, temperature);
        } catch (err: any) {
            log.error('Generation failed', { meta: { error: err.message } });
            return NextResponse.json({ error: err.message }, { status: 500 });
        }

        const rawParsed = JSON.parse(rawContent);
        let rawQuestions: GeneratedQuestion[] = Array.isArray(rawParsed.questions) ? rawParsed.questions : [];

        // ── Validate + Clean ──
        const validResults = rawQuestions.map((q, i) => ({ q, v: validateQuestion(q, i) }));
        let validQs = validResults.filter((r) => r.v.valid).map((r) => cleanQ(r.q));
        const invalidCount = rawQuestions.length - validQs.length;
        const allErrors = validResults.flatMap((r) => r.v.errors);
        const allWarnings = validResults.flatMap((r) => r.v.warnings);

        // ── Feature 2: Auto-retry for invalid questions ──
        if (invalidCount > 0 && invalidCount <= parsed.batchSize) {
            try {
                const retryPrompt = buildRetryPrompt({
                    certName: cert.name,
                    issuer: cert.issuer,
                    failedReasons: allErrors.slice(0, 15),
                    retryCount: Math.min(invalidCount, 10),
                    lang: parsed.lang,
                    domains: cert.domains,
                });
                const retryContent = await callOpenAI(apiKey, parsed.model, retryPrompt.system, retryPrompt.user, 0.6);
                const retryParsed = JSON.parse(retryContent);
                const retryQs: GeneratedQuestion[] = Array.isArray(retryParsed.questions) ? retryParsed.questions : [];
                const retryValid = retryQs.filter((q, i) => validateQuestion(q, i).valid).map(cleanQ);
                validQs = [...validQs, ...retryValid];
                log.info('Auto-retry recovered questions', { meta: { recovered: retryValid.length, attempted: invalidCount } });
            } catch (err: any) {
                log.warn('Auto-retry failed (non-critical)', { meta: { error: err.message } });
            }
        }

        // ── Feature 5: Bloom's taxonomy classification ──
        for (const q of validQs) {
            q.bloomLevel = classifyBloomLevel(q);
        }
        const bloomWarnings = validQs
            .filter((q) => q.bloomLevel && isBloomBelowExpected(q.bloomLevel, cert.issuer))
            .map((q) => `"${q.text.slice(0, 60)}..." is ${q.bloomLevel}, expected ${cert.issuer} level`);

        // ── Feature 7: Semantic dedup ──
        let semanticDuplicates: number[] = [];
        if (parsed.enableSemanticDedup && parsed.existingStems.length > 0) {
            try {
                const dups = await findSemanticDuplicates(
                    validQs.map((q) => q.text),
                    parsed.existingStems,
                    apiKey,
                );
                semanticDuplicates = [...new Set(dups.map((d) => d.newIndex))];
                if (semanticDuplicates.length > 0) {
                    validQs = validQs.filter((_, i) => !semanticDuplicates.includes(i));
                    log.info('Semantic dedup removed questions', { meta: { removed: semanticDuplicates.length } });
                }
            } catch (err: any) {
                log.warn('Semantic dedup failed (non-critical)', { meta: { error: err.message } });
            }
        }

        // ── Feature 6: Quality scoring ──
        if (parsed.enableQualityScore && validQs.length > 0) {
            try {
                const scorePrompt = buildQualityScorePrompt(validQs, cert.name, cert.issuer);
                const scoreContent = await callOpenAI(apiKey, 'gpt-4o-mini', scorePrompt, 'Rate the questions. Output JSON only.', 0.3);
                const scores = parseQualityScores(scoreContent);
                for (const s of scores) {
                    if (s.index >= 0 && s.index < validQs.length) {
                        validQs[s.index].qualityScore = s.score;
                    }
                }
                // Filter below threshold
                const before = validQs.length;
                validQs = validQs.filter((q) => (q.qualityScore ?? 100) >= parsed.qualityThreshold);
                if (validQs.length < before) {
                    log.info('Quality filter removed questions', { meta: { removed: before - validQs.length, threshold: parsed.qualityThreshold } });
                }
            } catch (err: any) {
                log.warn('Quality scoring failed (non-critical)', { meta: { error: err.message } });
            }
        }

        // ── Feature 3: Domain coverage analysis ──
        const domainCoverage = analyzeDomainCoverage(validQs, cert.domains);

        // ── Import if requested ──
        let importedCount = 0;
        if (parsed.autoImport && validQs.length > 0) {
            importedCount = await importToFirestore(db, studyId, validQs);
        }

        return NextResponse.json({
            data: {
                studyId,
                studyName: cert.name,
                generated: validQs.length,
                imported: importedCount,
                durationMs: Date.now() - startMs,
                stems: validQs.map((q) => q.text),
                invalidCount,
                retryRecovered: validQs.length - (rawQuestions.length - invalidCount),
                semanticDuplicatesRemoved: semanticDuplicates.length,
                domainCoverage,
                bloomDistribution: {
                    remember: validQs.filter(q => q.bloomLevel === 'remember').length,
                    understand: validQs.filter(q => q.bloomLevel === 'understand').length,
                    apply: validQs.filter(q => q.bloomLevel === 'apply').length,
                    analyze: validQs.filter(q => q.bloomLevel === 'analyze').length,
                    evaluate: validQs.filter(q => q.bloomLevel === 'evaluate').length,
                    create: validQs.filter(q => q.bloomLevel === 'create').length,
                },
                bloomWarnings,
                warnings: [...allWarnings, ...bloomWarnings],
                errors: allErrors,
            },
        });
    }
);

/**
 * POST /api/admin/generate
 * AI question generator for the admin panel (single study / free-form topic).
 *
 * Advanced features:
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
 * Returns generated questions for PREVIEW — does NOT auto-import.
 *
 * Admin-only endpoint.
 */

import { NextResponse } from 'next/server';
import { withAdmin, type RouteContext } from '@/lib/api-middleware';
import { getAdminDb } from '@/lib/firebase/admin';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import {
    type GeneratedQuestion,
    type CertDomain,
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

export const maxDuration = 120;

// ── Input schema ──

const bodySchema = z
    .object({
        studyId: z.string().min(1).optional(),
        domainId: z.string().optional(),
        topic: z.string().min(2).max(200).optional(),
        count: z.number().int().min(1).max(30).default(5),
        model: z.string().default('gpt-4o-mini'),
        lang: z.string().default('en'),
        enableMultiAnswer: z.boolean().default(false),
        enableQualityScore: z.boolean().default(false),
        enableSemanticDedup: z.boolean().default(false),
        qualityThreshold: z.number().min(0).max(100).default(50),
    })
    .refine((d) => d.studyId || d.topic, { message: 'studyId or topic required' });

// ── Types ──

interface StudyContext {
    studyId: string;
    studyName: string;
    issuer: string;
    domains: CertDomain[];
    isNewStudy: boolean;
}

// ── OpenAI call helper ──

async function callOpenAI(
    apiKey: string, model: string, system: string, user: string, temperature: number,
): Promise<string> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
            model,
            messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
            temperature,
            response_format: { type: 'json_object' },
        }),
    });
    if (!res.ok) throw new Error(`OpenAI API error (${res.status}): ${await res.text()}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
}

// ── Load existing question stems for dedup ──

async function loadExistingQuestions(
    db: FirebaseFirestore.Firestore, studyId: string, domainId?: string,
): Promise<string[]> {
    let query: FirebaseFirestore.Query = db.collection('marketplace_questions')
        .where('studyId', '==', studyId).where('isActive', '==', true);
    if (domainId) query = query.where('domainIds', 'array-contains', domainId);
    query = query.orderBy('createdAt', 'desc').limit(100);
    const snap = await query.get();
    return snap.docs.map((d) => (d.data().text || '').slice(0, 120));
}

// ── Load reports for feedback loop ──

async function loadReportPatterns(db: FirebaseFirestore.Firestore, studyId: string): Promise<string[]> {
    try {
        const snap = await db.collection('question_reports')
            .where('studyId', '==', studyId).where('status', '==', 'open')
            .orderBy('createdAt', 'desc').limit(30).get();
        return snap.docs.map((d) => d.data().reason || d.data().type || '').filter(Boolean);
    } catch { return []; }
}

// ── Enrich domains with cert catalog data ──

function enrichDomains(studyName: string, firestoreDomains: CertDomain[]): { domains: CertDomain[]; issuer: string } {
    const normalized = studyName.toLowerCase().trim();
    const aliasKey = CERT_ALIASES[normalized];
    const cert = aliasKey ? KNOWN_CERTS[aliasKey] : undefined;
    if (!cert) {
        for (const c of Object.values(KNOWN_CERTS)) {
            if (normalized.includes(c.slug) || c.name.toLowerCase().includes(normalized)) {
                return { domains: c.domains, issuer: c.issuer };
            }
        }
    }
    if (cert) return { domains: cert.domains, issuer: cert.issuer };
    return { domains: firestoreDomains, issuer: 'Unknown' };
}

// ── AI domain discovery for free-form topics ──

async function discoverDomains(apiKey: string, model: string, topic: string): Promise<{
    slug: string; name: string; issuer: string; description: string; domains: CertDomain[];
}> {
    const normalized = topic.toLowerCase().trim();
    const aliasKey = CERT_ALIASES[normalized];
    if (aliasKey && KNOWN_CERTS[aliasKey]) {
        const cert = KNOWN_CERTS[aliasKey];
        return { ...cert, description: `Official ${cert.name} certification exam by ${cert.issuer}` };
    }
    for (const cert of Object.values(KNOWN_CERTS)) {
        if (normalized.includes(cert.slug) || cert.name.toLowerCase().includes(normalized)) {
            return { ...cert, description: `Official ${cert.name} certification exam by ${cert.issuer}` };
        }
    }
    const prompt = `You are an expert on professional certifications. I need the FULL domain structure for: "${topic}"
Return JSON: {"slug":"...","name":"...","issuer":"...","description":"...","domains":[{"id":"xx","name":"...","weight":"XX%","topics":["..."]}]}
Rules: Use REAL official domains if it's a known cert. slug=lowercase-hyphenated, domain id=2-4 letter abbreviation. Output ONLY JSON.`;
    const content = await callOpenAI(apiKey, model, prompt, 'Discover domains. Output JSON only.', 0.3);
    const cert = JSON.parse(content);
    if (!cert.slug || !cert.name || !Array.isArray(cert.domains) || cert.domains.length === 0) {
        throw new Error('AI returned invalid structure. Try a more specific name.');
    }
    return cert;
}

// ── Auto-create study from discovered cert ──

async function autoCreateStudy(
    db: FirebaseFirestore.Firestore, cert: { slug: string; name: string; description: string; domains: CertDomain[] }, adminUid: string,
): Promise<string> {
    const ref = db.collection('marketplace_studies').doc();
    await ref.set({
        abbreviation: cert.slug.toUpperCase().slice(0, 20),
        name: cert.name,
        description: cert.description || `Auto-generated study for ${cert.name}`,
        domains: cert.domains.map((d, i) => ({ id: d.id, name: d.name, order: i })),
        questionCount: 0, domainQuestionCounts: {}, importCount: 0,
        tags: [], isActive: true,
        createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), createdBy: adminUid,
    });
    return ref.id;
}

// ── Handler ──

export const POST = withAdmin(
    async (request: Request, { user, log }: RouteContext) => {
        const body = await request.json();
        const parsed = bodySchema.parse(body);
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });

        const db = getAdminDb();
        let ctx: StudyContext;

        // ── Resolve study context ──
        if (parsed.studyId) {
            const snap = await db.collection('marketplace_studies').doc(parsed.studyId).get();
            if (!snap.exists) return NextResponse.json({ error: 'Study not found' }, { status: 404 });
            const study = snap.data()!;
            const enriched = enrichDomains(study.name || '', study.domains || []);
            ctx = {
                studyId: parsed.studyId,
                studyName: study.name || 'Unknown Study',
                issuer: enriched.issuer !== 'Unknown' ? enriched.issuer : study.issuer || 'Unknown',
                domains: enriched.domains.length > 0 ? enriched.domains : study.domains || [],
                isNewStudy: false,
            };
            if (parsed.domainId && !ctx.domains.some((d) => d.id === parsed.domainId)) {
                return NextResponse.json({ error: `Domain "${parsed.domainId}" not found` }, { status: 400 });
            }
        } else {
            const cert = await discoverDomains(apiKey, parsed.model, parsed.topic!);
            const studyId = await autoCreateStudy(db, cert, user.uid);
            ctx = { studyId, studyName: cert.name, issuer: cert.issuer, domains: cert.domains, isNewStudy: true };
        }

        // ── Load context for dedup + feedback ──
        const existingQuestions = await loadExistingQuestions(db, ctx.studyId, parsed.domainId);
        const reportReasons = await loadReportPatterns(db, ctx.studyId);
        const antiPatterns = buildAntiPatternBlock(reportReasons);

        log.info('Generate start', { meta: { studyId: ctx.studyId, count: parsed.count, model: parsed.model } });

        // ── Generate (with adaptive temperature, few-shot, multi-answer, feedback) ──
        const { system, user: userPrompt, temperature } = buildPrompt({
            certName: ctx.studyName,
            issuer: ctx.issuer,
            domains: ctx.domains,
            targetDomainId: parsed.domainId,
            batchSize: parsed.count,
            lang: parsed.lang,
            existingStems: existingQuestions,
            enableMultiAnswer: parsed.enableMultiAnswer,
            reportedPatterns: antiPatterns,
        });

        let rawContent: string;
        try {
            rawContent = await callOpenAI(apiKey, parsed.model, system, userPrompt, temperature);
        } catch (err: any) {
            return NextResponse.json({ error: err.message }, { status: 500 });
        }

        const rawParsed = JSON.parse(rawContent);
        let rawQuestions: GeneratedQuestion[] = Array.isArray(rawParsed.questions) ? rawParsed.questions : [];

        // ── Validate + clean ──
        const results = rawQuestions.map((q, i) => ({ q, v: validateQuestion(q, i) }));
        let validQs = results.filter((r) => r.v.valid).map((r) => cleanQ(r.q));
        const invalidCount = rawQuestions.length - validQs.length;
        const allErrors = results.flatMap((r) => r.v.errors);
        const allWarnings = results.flatMap((r) => r.v.warnings);

        // ── Feature 2: Auto-retry ──
        if (invalidCount > 0 && invalidCount <= parsed.count) {
            try {
                const retryPrompt = buildRetryPrompt({
                    certName: ctx.studyName, issuer: ctx.issuer,
                    failedReasons: allErrors.slice(0, 15),
                    retryCount: Math.min(invalidCount, 10),
                    lang: parsed.lang, domains: ctx.domains,
                });
                const retryContent = await callOpenAI(apiKey, parsed.model, retryPrompt.system, retryPrompt.user, 0.6);
                const retryQs: GeneratedQuestion[] = (JSON.parse(retryContent).questions || [])
                    .filter((q: GeneratedQuestion, i: number) => validateQuestion(q, i).valid).map(cleanQ);
                validQs = [...validQs, ...retryQs];
            } catch { /* non-critical */ }
        }

        // ── Feature 5: Bloom's taxonomy ──
        for (const q of validQs) q.bloomLevel = classifyBloomLevel(q);
        const bloomWarnings = validQs
            .filter((q) => q.bloomLevel && isBloomBelowExpected(q.bloomLevel, ctx.issuer))
            .map((q) => `"${q.text.slice(0, 60)}..." is ${q.bloomLevel}, expected higher for ${ctx.issuer}`);

        // ── Feature 7: Semantic dedup ──
        let semanticDupsRemoved = 0;
        if (parsed.enableSemanticDedup && existingQuestions.length > 0) {
            try {
                const dups = await findSemanticDuplicates(validQs.map(q => q.text), existingQuestions, apiKey);
                const dupIndices = new Set(dups.map(d => d.newIndex));
                if (dupIndices.size > 0) {
                    semanticDupsRemoved = dupIndices.size;
                    validQs = validQs.filter((_, i) => !dupIndices.has(i));
                }
            } catch { /* non-critical */ }
        }

        // ── Feature 6: Quality scoring ──
        if (parsed.enableQualityScore && validQs.length > 0) {
            try {
                const scorePrompt = buildQualityScorePrompt(validQs, ctx.studyName, ctx.issuer);
                const scoreContent = await callOpenAI(apiKey, 'gpt-4o-mini', scorePrompt, 'Rate. JSON only.', 0.3);
                const scores = parseQualityScores(scoreContent);
                for (const s of scores) {
                    if (s.index >= 0 && s.index < validQs.length) validQs[s.index].qualityScore = s.score;
                }
                validQs = validQs.filter((q) => (q.qualityScore ?? 100) >= parsed.qualityThreshold);
            } catch { /* non-critical */ }
        }

        // ── Feature 3: Domain coverage ──
        const domainCoverage = analyzeDomainCoverage(validQs, ctx.domains);

        return {
            questions: validQs,
            generated: rawQuestions.length,
            valid: validQs.length,
            invalid: invalidCount,
            retryRecovered: validQs.length - (rawQuestions.length - invalidCount),
            semanticDuplicatesRemoved: semanticDupsRemoved,
            model: parsed.model,
            studyId: ctx.studyId,
            studyName: ctx.studyName,
            isNewStudy: ctx.isNewStudy,
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
        };
    }
);

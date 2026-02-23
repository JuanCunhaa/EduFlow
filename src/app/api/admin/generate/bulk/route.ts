/**
 * POST /api/admin/generate/bulk
 *
 * Generates a batch of questions for a known cert or existing study
 * using the shared prompt builder for certification-specific exam styles.
 *
 * Called once per batch by the frontend orchestrator.
 *
 * Body:
 *   certSlug    — one of the KNOWN_CERTS keys OR a studyId
 *   studyId     — (optional) use an existing marketplace study instead of certSlug
 *   batchSize   — questions per OpenAI call (default 25, max 30)
 *   lang        — "en" | "pt-BR" | etc.
 *   model       — openai model (default "gpt-4o-mini")
 *   autoImport  — if true, imports directly; if false, returns preview only
 *   domainId    — optional: restrict to one domain
 *   existingStems — array of stems to avoid (dedup)
 *
 * Returns:
 *   { studyId, studyName, generated, imported, durationMs, stems }
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
} from '@/lib/generator-utils';
import { KNOWN_CERTS, CERT_ALIASES } from '@/lib/cert-catalog';

export const maxDuration = 300; // 5 minutes max execution time for bulk generation

// ── Helpers ──

function pLimit(concurrency: number) {
    let active = 0;
    const queue: Array<() => void> = [];

    const run = <T>(fn: () => Promise<T>): Promise<T> =>
        new Promise((resolve, reject) => {
            const exec = async () => {
                active++;
                try { resolve(await fn()); } catch (e) { reject(e); } finally {
                    active--;
                    if (queue.length > 0) queue.shift()!();
                }
            };
            if (active < concurrency) exec();
            else queue.push(exec);
        });

    return run;
}

// ── Generate one batch using shared prompt builder ──

async function generateBatch(
    apiKey: string,
    model: string,
    cert: CertInfo,
    batchSize: number,
    lang: string,
    domainId: string | undefined,
    existingStems: string[],
): Promise<GeneratedQuestion[]> {
    const { system, user } = buildPrompt({
        certName: cert.name,
        issuer: cert.issuer,
        domains: cert.domains,
        targetDomainId: domainId,
        batchSize,
        lang,
        existingStems,
    });

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: user },
            ],
            temperature: 0.75,
            response_format: { type: 'json_object' },
        }),
    });

    if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty OpenAI response');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed.questions) ? parsed.questions : [];
}

// ── Import batch to Firestore ──

async function importToFirestore(
    db: FirebaseFirestore.Firestore,
    studyId: string,
    questions: GeneratedQuestion[],
): Promise<number> {
    const BATCH_SIZE = 400;
    let imported = 0;

    for (let i = 0; i < questions.length; i += BATCH_SIZE) {
        const chunk = questions.slice(i, i + BATCH_SIZE);
        const batch = db.batch();
        for (const q of chunk) {
            const ref = db.collection('marketplace_questions').doc();
            batch.set(ref, {
                studyId,
                text: q.text,
                options: q.options,
                correctOptionIndex: q.correctOptionIndex,
                explanation: q.explanation,
                difficulty: q.difficulty,
                domainIds: Array.isArray(q.domainIds) && q.domainIds.length > 0 ? q.domainIds : ['general'],
                tags: q.tags ?? [],
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

// ── Main handler (Single Batch) ──

export const POST = withAdmin(
    async (request: Request, { user, log }: RouteContext) => {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
        }

        const body = await request.json();
        const batchSchema = z.object({
            certSlug: z.string().optional(),
            studyId: z.string().optional(),
            batchSize: z.number().int().min(5).max(30).default(25),
            lang: z.string().default('en'),
            model: z.string().default('gpt-4o-mini'),
            autoImport: z.boolean().default(true),
            domainId: z.string().optional(),
            existingStems: z.array(z.string()).default([]),
        }).refine((d) => d.certSlug || d.studyId, {
            message: 'Either certSlug or studyId is required',
        });

        const parsed = batchSchema.parse(body);
        const { batchSize, lang, model, autoImport, domainId, existingStems } = parsed;

        const db = getAdminDb();
        const startMs = Date.now();

        // ── Resolve cert + study ──

        let cert: CertInfo;
        let studyId: string;

        if (parsed.studyId) {
            const snap = await db.collection('marketplace_studies').doc(parsed.studyId).get();
            if (!snap.exists) {
                return NextResponse.json({ error: 'Study not found' }, { status: 404 });
            }
            const data = snap.data()!;
            studyId = parsed.studyId;

            // Try to match to a known cert for richer prompt data
            const nameKey = data.name?.toLowerCase().replace(/\s+/g, '-') ?? '';
            const aliasKey = CERT_ALIASES[nameKey] ?? CERT_ALIASES[data.abbreviation?.toLowerCase() ?? ''];
            const catalogMatch = aliasKey ? KNOWN_CERTS[aliasKey] : (KNOWN_CERTS[parsed.certSlug ?? ''] ?? null);

            if (catalogMatch) {
                cert = catalogMatch;
            } else {
                cert = {
                    slug: data.abbreviation?.toLowerCase() ?? 'study',
                    name: data.name ?? 'Study',
                    issuer: data.issuer ?? 'Unknown',
                    domains: (data.domains ?? []) as CertDomain[],
                };
            }
        } else {
            const certSlug = parsed.certSlug!;
            const resolvedSlug = CERT_ALIASES[certSlug] ?? certSlug;
            const knownCert = KNOWN_CERTS[resolvedSlug];
            if (!knownCert) {
                return NextResponse.json(
                    { error: `Unknown cert slug "${certSlug}".` },
                    { status: 400 }
                );
            }
            cert = knownCert;

            const existingSnap = await db
                .collection('marketplace_studies')
                .where('abbreviation', '==', certSlug.toUpperCase().slice(0, 20))
                .where('isActive', '==', true)
                .limit(1)
                .get();

            if (!existingSnap.empty) {
                studyId = existingSnap.docs[0].id;
            } else {
                const ref = db.collection('marketplace_studies').doc();
                await ref.set({
                    abbreviation: certSlug.toUpperCase().slice(0, 20),
                    name: cert.name,
                    issuer: cert.issuer,
                    description: `Practice questions for ${cert.name} — generated by ExamFlow AI.`,
                    domains: cert.domains.map((d, i) => ({ id: d.id, name: d.name, order: i })),
                    questionCount: 0,
                    domainQuestionCounts: {},
                    importCount: 0,
                    tags: [cert.issuer, certSlug],
                    isActive: true,
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                    createdBy: user.uid,
                });
                studyId = ref.id;
            }
        }

        // ── Generate one batch (using shared prompt builder) ──

        let generatedQuestions: GeneratedQuestion[] = [];
        try {
            const raw = await generateBatch(apiKey, model, cert, batchSize, lang, domainId, existingStems);
            generatedQuestions = raw
                .filter((q) => validateQuestion(q, 0).valid)
                .map((q) => cleanQ(q));
        } catch (error: any) {
            log.error('Batch generation failed', { error: error.message });
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // ── Import if requested ──

        let importedCount = 0;
        if (autoImport && generatedQuestions.length > 0) {
            importedCount = await importToFirestore(db, studyId, generatedQuestions);
        }

        return NextResponse.json({
            data: {
                studyId,
                studyName: cert.name,
                generated: generatedQuestions.length,
                imported: importedCount,
                durationMs: Date.now() - startMs,
                stems: generatedQuestions.map(q => q.text),
            }
        });
    }
);

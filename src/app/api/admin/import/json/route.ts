/**
 * POST /api/admin/import/json
 * Imports questions from a JSON file upload into a marketplace study.
 *
 * Accepted JSON shapes:
 *   1. Array of question objects: [ { text, options, correctOptionIndex, ... }, ... ]
 *   2. Wrapper object: { questions: [ ... ] }
 *
 * options must be an array of 4 items: { label: "A"|"B"|"C"|"D", text: string }
 *   OR a plain array of 4 strings (auto-labelled A-D).
 *
 * Admin-only. Max 500 questions per upload.
 */

import { NextResponse } from 'next/server';
import { withAdmin, type RouteContext } from '@/lib/api-middleware';
import { getAdminDb } from '@/lib/firebase/admin';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';

const MAX_QUESTIONS = 500;
const BATCH_SIZE = 400;

// Flexible option: either {label, text} or plain string
const optionSchema = z.union([
    z.object({ label: z.string(), text: z.string().min(1) }),
    z.string().min(1),
]);

const questionSchema = z.object({
    text: z.string().min(10),
    options: z.array(optionSchema).length(4),
    correctOptionIndex: z.number().int().min(0).max(3),
    explanation: z.union([
        z.object({
            short: z.string().min(1),
            whyOthersWrong: z.record(z.string(), z.string()).optional(),
            examTip: z.string().optional(),
        }),
        z.string().min(1), // plain string explanation
    ]),
    difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
    domainIds: z.array(z.string()).min(1).default(['general']),
    tags: z.array(z.string()).default([]),
});

type RawQuestion = z.infer<typeof questionSchema>;

function normalizeOption(opt: z.infer<typeof optionSchema>, idx: number): { label: string; text: string } {
    const labels = ['A', 'B', 'C', 'D'];
    if (typeof opt === 'string') return { label: labels[idx], text: opt };
    return { label: opt.label || labels[idx], text: opt.text };
}

function normalizeExplanation(exp: RawQuestion['explanation']): {
    short: string;
    whyOthersWrong: Record<string, string>;
    examTip: string;
} {
    if (typeof exp === 'string') return { short: exp, whyOthersWrong: {}, examTip: '' };
    return { short: exp.short, whyOthersWrong: exp.whyOthersWrong ?? {}, examTip: exp.examTip ?? '' };
}

export const POST = withAdmin(
    async (request: Request, { log }: RouteContext) => {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const studyId = formData.get('studyId') as string | null;

        if (!file || !studyId) {
            return NextResponse.json({ error: 'file and studyId are required' }, { status: 400 });
        }
        if (!file.name.endsWith('.json')) {
            return NextResponse.json({ error: 'File must be a .json' }, { status: 400 });
        }

        const db = getAdminDb();

        // Verify study exists
        const studySnap = await db.collection('marketplace_studies').doc(studyId).get();
        if (!studySnap.exists) {
            return NextResponse.json({ error: 'Study not found' }, { status: 404 });
        }

        // Parse JSON
        let rawJson: unknown;
        try {
            rawJson = JSON.parse(await file.text());
        } catch {
            return NextResponse.json({ error: 'Invalid JSON file' }, { status: 422 });
        }

        // Normalise to array
        let rawItems: unknown[];
        if (Array.isArray(rawJson)) {
            rawItems = rawJson;
        } else if (rawJson && typeof rawJson === 'object' && Array.isArray((rawJson as Record<string, unknown>).questions)) {
            rawItems = (rawJson as { questions: unknown[] }).questions;
        } else {
            return NextResponse.json(
                { error: 'JSON must be an array or an object with a "questions" array' },
                { status: 422 }
            );
        }

        if (rawItems.length === 0) {
            return NextResponse.json({ error: 'JSON has no questions' }, { status: 422 });
        }
        if (rawItems.length > MAX_QUESTIONS) {
            return NextResponse.json(
                { error: `Exceeds maximum of ${MAX_QUESTIONS} questions. Got ${rawItems.length}.` },
                { status: 422 }
            );
        }

        // Validate each item
        const valid: object[] = [];
        const errors: string[] = [];

        for (let i = 0; i < rawItems.length; i++) {
            const result = questionSchema.safeParse(rawItems[i]);
            if (!result.success) {
                errors.push(`Question ${i + 1}: ${result.error.issues[0].message}`);
                continue;
            }
            const q = result.data;
            valid.push({
                studyId,
                text: q.text,
                options: q.options.map((o, idx) => normalizeOption(o, idx)),
                correctOptionIndex: q.correctOptionIndex,
                explanation: normalizeExplanation(q.explanation),
                difficulty: q.difficulty,
                domainIds: q.domainIds,
                tags: q.tags,
                isActive: true,
                source: 'json-import',
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });
        }

        if (valid.length === 0) {
            return NextResponse.json({ error: 'No valid questions to import', details: errors }, { status: 422 });
        }

        // Batched Firestore writes
        let imported = 0;
        for (let i = 0; i < valid.length; i += BATCH_SIZE) {
            const chunk = valid.slice(i, i + BATCH_SIZE);
            const batch = db.batch();
            for (const q of chunk) {
                batch.set(db.collection('marketplace_questions').doc(), q);
                imported++;
            }
            batch.update(db.collection('marketplace_studies').doc(studyId), {
                questionCount: FieldValue.increment(chunk.length),
                updatedAt: FieldValue.serverTimestamp(),
            });
            await batch.commit();
        }

        log.info('JSON import complete', { meta: { studyId, imported, skipped: errors.length } });

        return { imported, skipped: rawItems.length - valid.length, errors: errors.slice(0, 20) };
    }
);

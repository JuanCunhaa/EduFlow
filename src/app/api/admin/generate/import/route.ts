/**
 * POST /api/admin/generate/import
 * Imports previously generated (previewed) questions into the marketplace.
 * Expects an array of questions and the target studyId.
 * Admin-only endpoint.
 */

import { NextResponse } from 'next/server';
import { withAdmin, type RouteContext } from '@/lib/api-middleware';
import { getAdminDb } from '@/lib/firebase/admin';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';

const questionSchema = z.object({
    text: z.string().min(10),
    options: z.array(z.object({
        label: z.string(),
        text: z.string().min(1),
    })).min(4).max(4),
    correctOptionIndex: z.number().int().min(0).max(3),
    explanation: z.object({
        short: z.string().min(10),
        whyOthersWrong: z.record(z.string(), z.string()),
        examTip: z.string().optional(),
    }),
    difficulty: z.string().refine(v => ['easy', 'medium', 'hard'].includes(v)),
    domainIds: z.array(z.string()).min(1),
    tags: z.array(z.string()).default([]),
});

const importSchema = z.object({
    studyId: z.string().min(1),
    questions: z.array(questionSchema).min(1).max(30),
});

export const POST = withAdmin(async (request: Request, { log }: RouteContext) => {
    const body = await request.json();
    const parsed = importSchema.parse(body);

    const db = getAdminDb();

    // Verify study exists
    const studySnap = await db.collection('marketplace_studies').doc(parsed.studyId).get();
    if (!studySnap.exists) {
        return NextResponse.json({ error: 'Study not found' }, { status: 404 });
    }

    const batch = db.batch();
    let imported = 0;

    for (const q of parsed.questions) {
        const docRef = db.collection('marketplace_questions').doc();
        batch.set(docRef, {
            studyId: parsed.studyId,
            text: q.text,
            options: q.options,
            correctOptionIndex: q.correctOptionIndex,
            explanation: q.explanation,
            difficulty: q.difficulty,
            domainIds: q.domainIds,
            tags: q.tags,
            isActive: true,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            source: 'admin-generator',
        });
        imported++;
    }

    if (imported > 0) {
        batch.update(db.collection('marketplace_studies').doc(parsed.studyId), {
            questionCount: FieldValue.increment(imported),
            updatedAt: FieldValue.serverTimestamp(),
        });
        await batch.commit();
    }

    log.info('Admin import complete', {
        meta: { studyId: parsed.studyId, imported },
    });

    return { imported };
});

import { NextResponse } from 'next/server';
import { withAuth, withPlan } from '@/lib/api-middleware';
import { getAdminDb } from '@/lib/firebase/admin';
import { z } from 'zod';

const noteSchema = z.object({
    questionId: z.string().min(1),
    note: z.string().max(2000),
});

function notesPath(uid: string): string {
    return `users/${uid}/questionNotes`;
}

/**
 * GET /api/notes?examId=xxx
 * Get all notes for questions in a specific exam.
 */
export const GET = withAuth(async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');

    if (!examId) {
        return NextResponse.json({ error: 'examId is required' }, { status: 400 });
    }

    // Get the exam to find question IDs
    const db = getAdminDb();
    const examSnap = await db.doc(`users/${user.uid}/exams/${examId}`).get();
    if (!examSnap.exists) {
        return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    const questionIds = (examSnap.data()?.questionIds as string[]) || [];
    if (questionIds.length === 0) {
        return NextResponse.json({ data: {} });
    }

    // Fetch notes for these questions
    const notesCol = db.collection(notesPath(user.uid));
    const refs = questionIds.map(id => notesCol.doc(id));
    const snaps = await db.getAll(...refs);

    const notes: Record<string, string> = {};
    for (const snap of snaps) {
        if (snap.exists) {
            notes[snap.id] = (snap.data()?.note as string) || '';
        }
    }

    return NextResponse.json({ data: notes });
});

/**
 * PUT /api/notes
 * Save a note for a question. Pro-only feature.
 */
export const PUT = withPlan(async (request, { user }) => {
    const body = await request.json();
    const parsed = noteSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Validation failed', details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    const { questionId, note } = parsed.data;
    const db = getAdminDb();
    const docRef = db.doc(`${notesPath(user.uid)}/${questionId}`);

    if (note.trim() === '') {
        // Delete empty notes
        await docRef.delete();
    } else {
        await docRef.set({
            questionId,
            note: note.trim(),
            updatedAt: Date.now(),
        });
    }

    return { data: { success: true } };
}, 'pro');

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/firebase/server-auth';
import { adminCreateDoc, serverTimestamp } from '@/lib/firebase/admin-firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { createQuestionSchema } from '@/lib/validators';
import type { Question } from '@/types';

/**
 * GET /api/questions
 * List the authenticated user's own questions.
 */
export async function GET(request: Request) {
    try {
        const user = await requireAuth();

        const { searchParams } = new URL(request.url);
        const certification = searchParams.get('certification');
        const domainNumber = searchParams.get('domainNumber');
        const difficulty = searchParams.get('difficulty');
        const cursor = searchParams.get('cursor');
        const limitCount = Math.min(
            Math.max(1, Number.parseInt(searchParams.get('limit') || '100', 10) || 100),
            200
        );

        const db = getAdminDb();
        const questionsPath = `users/${user.uid}/questions`;
        let q: FirebaseFirestore.Query = db.collection(questionsPath);

        if (certification) q = q.where('certification', '==', certification);
        if (domainNumber) q = q.where('domainNumber', '==', Number.parseInt(domainNumber, 10));
        if (difficulty && difficulty !== 'all') q = q.where('difficulty', '==', difficulty);

        q = q.orderBy('domainNumber', 'asc');

        // Cursor-based pagination
        if (cursor) {
            q = q.startAfter(db.doc(`${questionsPath}/${cursor}`));
        }

        const snap = await q.limit(limitCount + 1).get();
        const questions = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Question);

        const hasMore = questions.length > limitCount;
        const pageQuestions = hasMore ? questions.slice(0, limitCount) : questions;
        const nextCursor = hasMore ? pageQuestions.at(-1)?.id ?? null : null;

        const res = NextResponse.json({ data: pageQuestions, nextCursor });
        res.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
        return res;
    } catch (error) {
        if (error instanceof Response) return error;
        console.error('GET /api/questions error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * POST /api/questions
 * Create a new question in the user's personal bank.
 */
export async function POST(request: Request) {
    try {
        const user = await requireAuth();

        const body = await request.json();
        const parsed = createQuestionSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const now = serverTimestamp();
        const id = await adminCreateDoc(`users/${user.uid}/questions`, {
            ...parsed.data,
            createdAt: now,
            updatedAt: now,
        });

        return NextResponse.json({ data: { id } }, { status: 201 });
    } catch (error) {
        if (error instanceof Response) return error;
        console.error('POST /api/questions error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

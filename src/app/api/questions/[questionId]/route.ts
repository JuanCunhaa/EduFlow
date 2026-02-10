import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/firebase/server-auth';
import type { Question } from '@/types';
import {
    adminGetDoc,
    adminUpdateDoc,
    adminDeleteDoc,
    serverTimestamp,
} from '@/lib/firebase/admin-firestore';
import { updateQuestionSchema } from '@/lib/validators';

interface RouteParams {
    params: Promise<{ questionId: string }>;
}

/** Helper: returns the user-scoped questions collection path */
function questionsPath(uid: string) {
    return `users/${uid}/questions`;
}

/**
 * GET /api/questions/[questionId]
 * Get a single question from the user's bank.
 */
export async function GET(_request: Request, { params }: RouteParams) {
    try {
        const user = await requireAuth();
        const { questionId } = await params;
        const question = await adminGetDoc<Question>(questionsPath(user.uid), questionId);

        if (!question) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        return NextResponse.json({ data: question });
    } catch (error) {
        if (error instanceof Response) return error;
        console.error('GET /api/questions/[id] error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * PUT /api/questions/[questionId]
 * Update a question in the user's bank.
 */
export async function PUT(request: Request, { params }: RouteParams) {
    try {
        const user = await requireAuth();
        const { questionId } = await params;
        const path = questionsPath(user.uid);

        const existing = await adminGetDoc<Question>(path, questionId);
        if (!existing) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const body = await request.json();
        const parsed = updateQuestionSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        await adminUpdateDoc(path, questionId, {
            ...parsed.data,
            updatedAt: serverTimestamp(),
        });

        return NextResponse.json({ data: { id: questionId } });
    } catch (error) {
        if (error instanceof Response) return error;
        console.error('PUT /api/questions/[id] error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * DELETE /api/questions/[questionId]
 * Delete a question from the user's bank.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
    try {
        const user = await requireAuth();
        const { questionId } = await params;
        const path = questionsPath(user.uid);

        const existing = await adminGetDoc<Question>(path, questionId);
        if (!existing) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        await adminDeleteDoc(path, questionId);
        return NextResponse.json({ data: { deleted: true } });
    } catch (error) {
        if (error instanceof Response) return error;
        console.error('DELETE /api/questions/[id] error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

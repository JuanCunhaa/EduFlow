import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-middleware';
import { updateQuestionSchema } from '@/lib/validators';
import { getQuestion, updateQuestion, deleteQuestion } from '@/services/question-service';

/**
 * GET /api/questions/[questionId]
 * Get a single question from the user's bank.
 */
export const GET = withAuth(async (_request, { user, params }) => {
    const question = await getQuestion(user.uid, params.questionId);
    return { data: question };
});

/**
 * PUT /api/questions/[questionId]
 * Update a question in the user's bank.
 */
export const PUT = withAuth(async (request, { user, params }) => {
    const body = await request.json();
    const parsed = updateQuestionSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Validation failed', details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    await updateQuestion(user.uid, params.questionId, parsed.data);
    return { data: { id: params.questionId } };
});

/**
 * DELETE /api/questions/[questionId]
 * Delete a question from the user's bank.
 */
export const DELETE = withAuth(async (_request, { user, params }) => {
    await deleteQuestion(user.uid, params.questionId);
    return { data: { deleted: true } };
});

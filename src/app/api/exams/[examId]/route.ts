import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-middleware';
import { submitAnswerSchema } from '@/lib/validators';
import { getExamForClient, saveAnswer } from '@/services/exam-service';

/**
 * GET /api/exams/[examId]
 * Returns the exam. If in_progress, questions are fetched without correct answers.
 */
export const GET = withAuth(async (_request, { user, params }) => {
    const exam = await getExamForClient(user.uid, params.examId);
    return { data: exam };
});

/**
 * PATCH /api/exams/[examId]
 * Save a single answer during an active exam.
 */
export const PATCH = withAuth(async (request, { user, params }) => {
    const body = await request.json();
    const parsed = submitAnswerSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Validation failed', details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    const { questionId, selectedOptionIndex } = parsed.data;
    await saveAnswer(user.uid, params.examId, questionId, selectedOptionIndex);

    return { data: { saved: true } };
});

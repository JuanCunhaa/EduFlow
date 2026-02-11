import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-middleware';
import { submitAnswerSchema } from '@/lib/validators';
import { getExamForClient, saveAnswer } from '@/services/exam-service';
import { rateLimit } from '@/lib/rate-limit';
import { ANSWER_SAVE_RATE_LIMIT } from '@/lib/constants';

/**
 * GET /api/exams/[examId]
 * Returns the exam. If in_progress, questions are fetched without correct answers.
 */
export const GET = withAuth(async (_request, { user, params }) => {
    const exam = await getExamForClient(user.uid, params.examId);
    const res = NextResponse.json({ data: exam });
    res.headers.set('Cache-Control', 'private, max-age=10, stale-while-revalidate=60');
    return res;
});

/**
 * PATCH /api/exams/[examId]
 * Save a single answer during an active exam.
 * Rate-limited to prevent automated answer spamming (60/min per user).
 */
export const PATCH = withAuth(async (request, { user, params }) => {
    // P2-4: Rate limit answer saves to prevent spam writes
    const allowed = await rateLimit(`answer-save:${user.uid}`, ANSWER_SAVE_RATE_LIMIT, 60_000);
    if (!allowed) {
        return NextResponse.json(
            { error: 'Too many requests. Please slow down.' },
            { status: 429 }
        );
    }

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

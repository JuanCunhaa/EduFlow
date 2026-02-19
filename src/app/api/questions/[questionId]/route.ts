import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-middleware';
import { updateQuestionSchema } from '@/lib/validators';
import {
  getQuestion,
  updateQuestion,
  deleteQuestion,
  isQuestionInActiveExam,
} from '@/services/question-service';
import { checkScrapingSignals } from '@/lib/scraping-guard';

/**
 * GET /api/questions/[questionId]
 * Get a single question from the user's bank.
 * Returns full data including correctOptionIndex (for editing).
 * If the question is part of an active exam, strips correctOptionIndex + explanation
 * to prevent answer peeking during exams.
 * Protected by scraping guard — prevents bulk answer enumeration.
 */
export const GET = withAuth(async (request, { user, params }) => {
  const guard = await checkScrapingSignals(request, user.uid, {
    category: 'question-detail',
    maxRequestsPerMinute: 20,
    maxRequestsPerHour: 120,
    blockThreshold: 60,
  });
  if (guard.blocked) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429 }
    );
  }

  const question = await getQuestion(user.uid, params.questionId);

  // P1-1: Strip answers if question is in an active exam (prevent peeking)
  const inActiveExam = await isQuestionInActiveExam(
    user.uid,
    params.questionId
  );
  if (inActiveExam) {
    const { correctOptionIndex: _, explanation: __, ...safe } = question;
    return { data: safe };
  }

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
 * Uses checkRevoked to ensure compromised sessions cannot perform destructive operations.
 */
export const DELETE = withAuth(
  async (_request, { user, params }) => {
    await deleteQuestion(user.uid, params.questionId);
    return { data: { deleted: true } };
  },
  { checkRevoked: true }
);

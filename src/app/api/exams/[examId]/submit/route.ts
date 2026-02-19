import { withAuth } from '@/lib/api-middleware';
import { submitExam } from '@/services/exam-service';

/**
 * POST /api/exams/[examId]/submit
 * Finalize exam: validate timer, calculate score, update user stats, create history entry.
 * Accepts optional { answers } body for client-side reconciliation.
 */
export const POST = withAuth(async (request, { user, params }) => {
  // Try to read client-side answers for reconciliation
  let clientAnswers: Record<string, number | null> | undefined;
  try {
    const body = await request.json();
    if (body?.answers && typeof body.answers === 'object') {
      clientAnswers = body.answers;
    }
  } catch {
    // No body or invalid JSON — use server-side answers only
  }

  const result = await submitExam(user.uid, params.examId, clientAnswers);
  return { data: result };
});

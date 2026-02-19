import { withAuth } from '@/lib/api-middleware';
import { abandonExam } from '@/services/exam-service';

/**
 * POST /api/exams/[examId]/abandon
 * Abandon an in-progress exam (marks as 'abandoned').
 */
export const POST = withAuth(async (_request, { user, params }) => {
  await abandonExam(user.uid, params.examId);
  return { data: { abandoned: true } };
});

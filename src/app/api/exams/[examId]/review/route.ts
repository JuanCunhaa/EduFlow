import { withAuth } from '@/lib/api-middleware';
import { getExamReview } from '@/services/exam-service';

/**
 * GET /api/exams/[examId]/review
 * Get the post-exam review with correct/incorrect marking per question.
 * Only available for completed exams.
 */
export const GET = withAuth(async (_request, { user, params }) => {
    const review = await getExamReview(user.uid, params.examId);
    return { data: review };
});

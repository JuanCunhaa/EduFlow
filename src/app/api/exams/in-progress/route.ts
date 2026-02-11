import { withAuth } from '@/lib/api-middleware';
import { getInProgressExam, resumeExam } from '@/services/exam-service';

/**
 * GET /api/exams/in-progress
 * Check if user has an active in-progress exam.
 * Returns the exam ID if found, null otherwise.
 */
export const GET = withAuth(async (_request, { user }) => {
    const exam = await getInProgressExam(user.uid);

    if (!exam) {
        return { data: null };
    }

    // Return the resumed exam with sanitized questions
    const resumed = await resumeExam(user.uid, exam.id);
    return { data: { ...resumed, answers: exam.answers, startedAt: exam.startedAt } };
});

import { withAuth } from '@/lib/api-middleware';
import { getInProgressExam, resumeExam } from '@/services/exam-service';

/**
 * GET /api/exams/in-progress
 * Check if user has an active in-progress exam.
 * Returns the exam ID if found, null otherwise.
 */
export const GET = withAuth(async (request, { user }) => {
  const { searchParams } = new URL(request.url);
  const studyId = searchParams.get('studyId') || undefined;
  const exam = await getInProgressExam(user.uid, studyId);

  if (!exam) {
    return { data: null };
  }

  // Return the resumed exam with sanitized questions
  const resumed = await resumeExam(user.uid, exam.id);

  // Only forward user-facing answer selections (number | null), never internal fields
  const safeAnswers: Record<string, number | null> = {};
  for (const [qId, val] of Object.entries(exam.answers ?? {})) {
    safeAnswers[qId] = typeof val === 'number' ? val : null;
  }

  return {
    data: {
      ...resumed,
      answers: safeAnswers,
      startedAt: exam.startedAt,
      config: exam.config,
    },
  };
});

import { NextResponse } from 'next/server';
import { withAdmin } from '@/lib/api-middleware';
import { monitorStudyQuestions } from '@/services/content-quality-service';

/**
 * GET /api/content/monitoring/[studyId]
 * Admin: run monitoring scan on a study's questions.
 * Returns alerts for questions that are too easy, too hard, high skip rate, or heavily reported.
 */
export const GET = withAdmin(async (_request, { params }) => {
  const alerts = await monitorStudyQuestions(params.studyId);

  const res = NextResponse.json({
    data: alerts,
    meta: { count: alerts.length, studyId: params.studyId },
  });
  res.headers.set(
    'Cache-Control',
    'private, max-age=30, stale-while-revalidate=120'
  );
  return res;
});

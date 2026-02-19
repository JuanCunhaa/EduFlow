import { NextResponse } from 'next/server';
import { withAdmin } from '@/lib/api-middleware';
import { recalibrateStudyDifficulty } from '@/services/content-quality-service';

/**
 * POST /api/content/recalibrate/[studyId]
 * Admin: trigger difficulty recalibration for all questions in a study.
 * Returns summary of recalibrated questions.
 */
export const POST = withAdmin(async (_request, { params }) => {
  const results = await recalibrateStudyDifficulty(params.studyId);

  return {
    data: {
      recalibrated: results.filter((r) => r.changed).length,
      total: results.length,
      details: results,
    },
  };
});

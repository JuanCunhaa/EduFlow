import { NextResponse } from 'next/server';
import { withAdmin } from '@/lib/api-middleware';
import { analyzeDistractors } from '@/services/content-quality-service';

/**
 * GET /api/content/distractors/[studyId]
 * Admin: analyze distractor effectiveness for all questions in a study.
 * Returns per-question distractor distribution and effectiveness data.
 */
export const GET = withAdmin(async (_request, { params }) => {
    const analysis = await analyzeDistractors(params.studyId);

    const res = NextResponse.json({
        data: analysis,
        meta: { count: analysis.length, studyId: params.studyId },
    });
    res.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
    return res;
});

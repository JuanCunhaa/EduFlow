import { NextResponse } from 'next/server';
import { withAdmin } from '@/lib/api-middleware';
import { calculateCoverage } from '@/services/content-quality-service';

/**
 * GET /api/content/coverage/[studyId]
 * Admin: calculate domain coverage for a marketplace study.
 * Returns per-domain coverage, overall score, and badge.
 */
export const GET = withAdmin(async (_request, { params }) => {
    const coverage = await calculateCoverage(params.studyId);

    const res = NextResponse.json({ data: coverage });
    res.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
    return res;
});

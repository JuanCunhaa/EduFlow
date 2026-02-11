import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-middleware';
import { getAnalytics } from '@/services/exam-service';

/**
 * GET /api/analytics
 * Server-side analytics aggregation.
 * Returns score trends, domain breakdown, study breakdown, readiness.
 * Optional ?studyId= to scope to a single study.
 */
export const GET = withAuth(async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const studyId = searchParams.get('studyId') || undefined;

    const analytics = await getAnalytics(user.uid, studyId);

    const res = NextResponse.json({ data: analytics });
    res.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=120');
    return res;
});

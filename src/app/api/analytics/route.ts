import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-middleware';
import { getAnalytics } from '@/services/exam-service';

/**
 * GET /api/analytics
 * Server-side analytics aggregation.
 * Returns score trends, domain breakdown, cert breakdown, readiness.
 */
export const GET = withAuth(async (_request, { user }) => {
    const analytics = await getAnalytics(user.uid);

    const res = NextResponse.json({ data: analytics });
    res.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=120');
    return res;
});

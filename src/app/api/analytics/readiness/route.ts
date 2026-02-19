import { NextResponse } from 'next/server';
import { withPlan } from '@/lib/api-middleware';
import { computeReadiness } from '@/services/readiness-service';

/**
 * GET /api/analytics/readiness?studyId=xxx
 * Returns readiness score with factor breakdown.
 * Free users: readiness number + band only.
 * Pro users: full factor breakdown.
 */
export const GET = withPlan(async (request, { user, plan }) => {
    const { searchParams } = new URL(request.url);
    const studyId = searchParams.get('studyId');
    if (!studyId) {
        return NextResponse.json({ error: 'studyId required' }, { status: 400 });
    }

    const result = await computeReadiness(user.uid, studyId);

    // Free users get score + band + trend only, no factor breakdown
    if (plan === 'free') {
        return NextResponse.json({
            data: {
                readiness: result.readiness,
                band: result.band,
                trend: result.trend,
                factors: null,
            },
        });
    }

    const res = NextResponse.json({ data: result });
    res.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=120');
    return res;
});

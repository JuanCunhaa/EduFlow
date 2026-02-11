import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-middleware';
import { getDailyChallenge } from '@/services/stats-service';

/**
 * GET /api/daily-challenge?studyId=xxx
 * Get today's daily challenge (5 questions from weak domains).
 * Cached per day.
 */
export const GET = withAuth(async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const studyId = searchParams.get('studyId');

    if (!studyId) {
        return NextResponse.json(
            { error: 'studyId is required' },
            { status: 400 }
        );
    }

    const challenge = await getDailyChallenge(user.uid, studyId);

    const res = NextResponse.json({ data: challenge });
    res.headers.set('Cache-Control', 'private, max-age=300, stale-while-revalidate=600');
    return res;
});

import { withAuth } from '@/lib/api-middleware';
import { getStats, updateDailyGoal, updateWeeklyGoal } from '@/services/stats-service';
import { updateGoalSchema } from '@/lib/validators';
import { NextResponse } from 'next/server';

/**
 * GET /api/stats
 * Get user's retention stats (streak, goals, badges, recent days).
 */
export const GET = withAuth(async (_request, { user }) => {
    const stats = await getStats(user.uid);
    return { data: stats };
});

/**
 * PUT /api/stats
 * Update user's daily/weekly goals.
 */
export const PUT = withAuth(async (request, { user }) => {
    const body = await request.json();
    const parsed = updateGoalSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Validation failed', details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    if (parsed.data.dailyGoal !== undefined) {
        await updateDailyGoal(user.uid, parsed.data.dailyGoal);
    }
    if (parsed.data.weeklyGoal !== undefined) {
        await updateWeeklyGoal(user.uid, parsed.data.weeklyGoal);
    }
    return { data: { success: true } };
});

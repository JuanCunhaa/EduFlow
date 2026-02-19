import { NextResponse } from 'next/server';
import { withPlan } from '@/lib/api-middleware';
import { generateStudyPlan } from '@/services/study-plan-service';

/**
 * POST /api/analytics/study-plan
 * Generates a personalized 7-day study plan. Pro-only feature.
 * Body: { studyId, targetReadiness?, daysPerWeek?, minutesPerDay? }
 */
export const POST = withPlan(async (request, { user }) => {
  const body = await request.json();
  const studyId = body.studyId;
  if (!studyId) {
    return NextResponse.json({ error: 'studyId required' }, { status: 400 });
  }

  const plan = await generateStudyPlan(user.uid, {
    studyId,
    targetReadiness: body.targetReadiness,
    daysPerWeek: body.daysPerWeek,
    minutesPerDay: body.minutesPerDay,
  });

  return NextResponse.json({ data: plan });
}, 'pro');

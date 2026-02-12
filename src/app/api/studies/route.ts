import { NextResponse } from 'next/server';
import { withAuth, withPlan } from '@/lib/api-middleware';
import { createStudySchema } from '@/lib/validators';
import { listStudies, createStudy } from '@/services/study-service';
import { enforcePlanLimit } from '@/lib/plan-limits';

/**
 * GET /api/studies
 * List all studies for the authenticated user.
 */
export const GET = withAuth(async (_request, { user }) => {
    const studies = await listStudies(user.uid);

    const res = NextResponse.json({ data: studies });
    res.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=120');
    return res;
});

/**
 * POST /api/studies
 * Create a new study with domains.
 * Enforces: study creation limit (free tier).
 */
export const POST = withPlan(async (request, { user, plan }) => {
    const body = await request.json();
    const parsed = createStudySchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Validation failed', details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    // ── Plan enforcement ──
    await enforcePlanLimit(user.uid, plan, 'study_creation_limit');

    const id = await createStudy(user.uid, parsed.data);
    return { data: { id } };
});

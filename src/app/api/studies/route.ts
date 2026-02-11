import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-middleware';
import { createStudySchema } from '@/lib/validators';
import { listStudies, createStudy } from '@/services/study-service';

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
 */
export const POST = withAuth(async (request, { user }) => {
    const body = await request.json();
    const parsed = createStudySchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Validation failed', details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    const id = await createStudy(user.uid, parsed.data);
    return { data: { id } };
});

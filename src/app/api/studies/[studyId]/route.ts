import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-middleware';
import { updateStudySchema } from '@/lib/validators';
import { getStudy, updateStudy, deleteStudy } from '@/services/study-service';

/**
 * GET /api/studies/[studyId]
 * Get a single study with its domains.
 */
export const GET = withAuth(async (_request, { user, params }) => {
    const study = await getStudy(user.uid, params.studyId);

    const res = NextResponse.json({ data: study });
    res.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=120');
    return res;
});

/**
 * PUT /api/studies/[studyId]
 * Update study name, abbreviation, or domains.
 */
export const PUT = withAuth(async (request, { user, params }) => {
    const body = await request.json();
    const parsed = updateStudySchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Validation failed', details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    await updateStudy(user.uid, params.studyId, parsed.data);
    return { data: { success: true } };
});

/**
 * DELETE /api/studies/[studyId]
 * Delete a study and cascade-delete associated questions and exams.
 * Uses checkRevoked to ensure compromised sessions cannot perform destructive operations.
 */
export const DELETE = withAuth(async (_request, { user, params }) => {
    const result = await deleteStudy(user.uid, params.studyId);
    return { data: result };
}, { checkRevoked: true });

import { NextResponse } from 'next/server';
import { withAdmin } from '@/lib/api-middleware';
import { updateMarketplaceQuestionSchema } from '@/lib/validators';
import {
    updateMarketplaceQuestion,
    deleteMarketplaceQuestion,
} from '@/services/marketplace-service';

/**
 * PUT /api/marketplace/questions/[questionId]
 * Update a marketplace question. Admin only.
 * Requires studyId as query param for ownership verification.
 */
export const PUT = withAdmin(async (request, { params }) => {
    const body = await request.json();

    const { searchParams } = new URL(request.url);
    const studyId = searchParams.get('studyId');
    if (!studyId) {
        return NextResponse.json(
            { error: 'studyId query parameter is required' },
            { status: 400 }
        );
    }

    const parsed = updateMarketplaceQuestionSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Validation failed', details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    await updateMarketplaceQuestion(studyId, params.questionId, parsed.data);
    return { data: { success: true } };
});

/**
 * DELETE /api/marketplace/questions/[questionId]
 * Soft-delete a marketplace question. Admin only.
 * Requires studyId as query param for ownership verification.
 */
export const DELETE = withAdmin(async (request, { params }) => {
    const { searchParams } = new URL(request.url);
    const studyId = searchParams.get('studyId');
    if (!studyId) {
        return NextResponse.json(
            { error: 'studyId query parameter is required' },
            { status: 400 }
        );
    }

    await deleteMarketplaceQuestion(studyId, params.questionId);
    return { data: { success: true } };
});

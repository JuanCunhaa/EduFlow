import { NextResponse } from 'next/server';
import { withAdmin } from '@/lib/api-middleware';
import { updateQuestionLifecycleSchema } from '@/lib/validators';
import { updateQuestionLifecycle } from '@/services/content-quality-service';

/**
 * PATCH /api/marketplace/questions/[questionId]/lifecycle
 * Admin: update the lifecycle state of a marketplace question.
 * Valid transitions enforced by the service layer.
 */
export const PATCH = withAdmin(async (request, { user, params }) => {
    const body = await request.json();
    const parsed = updateQuestionLifecycleSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Validation failed', details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    await updateQuestionLifecycle(
        params.questionId,
        parsed.data.lifecycle,
        user.uid,
        parsed.data.reason
    );

    return { data: { success: true, lifecycle: parsed.data.lifecycle } };
});

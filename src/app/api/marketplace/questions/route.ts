import { NextResponse } from 'next/server';
import { withAdmin } from '@/lib/api-middleware';
import { marketplaceBulkQuestionsSchema } from '@/lib/validators';
import { bulkCreateMarketplaceQuestions } from '@/services/marketplace-service';
import { rateLimit } from '@/lib/rate-limit';
import { MARKETPLACE_ADMIN_RATE_LIMIT } from '@/lib/constants';

/**
 * POST /api/marketplace/questions
 * Bulk create marketplace questions (max 500). Admin only.
 * Requires studyId in the request body.
 */
export const POST = withAdmin(async (request, { user }) => {
    const allowed = await rateLimit(`mkt-admin:${user.uid}`, MARKETPLACE_ADMIN_RATE_LIMIT, 60_000, false);
    if (!allowed) {
        return NextResponse.json(
            { error: 'Too many admin requests. Max 30 per minute.' },
            { status: 429 }
        );
    }

    const body = await request.json();

    // Validate studyId is provided at top level
    const studyId = body?.studyId;
    if (!studyId || typeof studyId !== 'string') {
        return NextResponse.json(
            { error: 'studyId is required' },
            { status: 400 }
        );
    }

    const parsed = marketplaceBulkQuestionsSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Validation failed', details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    const result = await bulkCreateMarketplaceQuestions(user.uid, studyId, parsed.data.questions);
    return { data: result };
});

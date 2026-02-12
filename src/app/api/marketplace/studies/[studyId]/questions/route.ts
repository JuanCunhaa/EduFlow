import { NextResponse } from 'next/server';
import { withAuth, withAdmin } from '@/lib/api-middleware';
import { createMarketplaceQuestionSchema } from '@/lib/validators';
import {
    listMarketplaceQuestions,
    createMarketplaceQuestion,
} from '@/services/marketplace-service';
import { checkScrapingSignals, addGuardHeaders } from '@/lib/scraping-guard';
import { MARKETPLACE_BROWSE_RATE_LIMIT } from '@/lib/constants';

/**
 * GET /api/marketplace/studies/[studyId]/questions
 * List marketplace questions for a study.
 * SECURITY: Strips correctOptionIndex and explanation from responses.
 */
export const GET = withAuth(async (request, { user, params }) => {
    const guard = await checkScrapingSignals(request, user.uid, {
        category: 'marketplace-questions',
        maxRequestsPerMinute: MARKETPLACE_BROWSE_RATE_LIMIT,
        maxRequestsPerHour: 400,
    });
    if (guard.blocked) {
        return NextResponse.json(
            { error: 'Too many requests. Please slow down.' },
            { status: 429 }
        );
    }

    const { searchParams } = new URL(request.url);
    const domainIdsParam = searchParams.get('domainIds');
    const domainIds = domainIdsParam ? domainIdsParam.split(',').filter(Boolean) : undefined;

    const result = await listMarketplaceQuestions({
        studyId: params.studyId,
        domainIds,
        cursor: searchParams.get('cursor') || undefined,
        limit: Number.parseInt(searchParams.get('limit') || '50', 10) || 50,
    });

    // Strip sensitive fields — correctOptionIndex and explanation are the marketplace's value
    const safeQuestions = result.questions.map(
        ({ correctOptionIndex: _, explanation: __, ...rest }) => rest
    );

    const res = NextResponse.json({ data: safeQuestions, nextCursor: result.nextCursor });
    res.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    return addGuardHeaders(res, guard);
});

/**
 * POST /api/marketplace/studies/[studyId]/questions
 * Create a single marketplace question. Admin only.
 */
export const POST = withAdmin(async (request, { user, params }) => {
    const body = await request.json();
    const parsed = createMarketplaceQuestionSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Validation failed', details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    const id = await createMarketplaceQuestion(user.uid, params.studyId, parsed.data);
    return { data: { id } };
});

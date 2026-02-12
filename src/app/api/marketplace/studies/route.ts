import { NextResponse } from 'next/server';
import { withAuth, withAdmin } from '@/lib/api-middleware';
import { createMarketplaceStudySchema } from '@/lib/validators';
import { listMarketplaceStudies, createMarketplaceStudy } from '@/services/marketplace-service';
import { checkScrapingSignals, addGuardHeaders } from '@/lib/scraping-guard';
import { MARKETPLACE_BROWSE_RATE_LIMIT } from '@/lib/constants';

/**
 * GET /api/marketplace/studies
 * List active marketplace studies. Available to all authenticated users.
 * Protected by scraping guard.
 */
export const GET = withAuth(async (request, { user }) => {
    const guard = await checkScrapingSignals(request, user.uid, {
        category: 'marketplace-browse',
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

    const result = await listMarketplaceStudies({
        search: searchParams.get('search') || undefined,
        cursor: searchParams.get('cursor') || undefined,
        limit: Number.parseInt(searchParams.get('limit') || '50', 10) || 50,
    });

    const res = NextResponse.json({ data: result.studies, nextCursor: result.nextCursor });
    res.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    return addGuardHeaders(res, guard);
});

/**
 * POST /api/marketplace/studies
 * Create a new marketplace study. Admin only.
 */
export const POST = withAdmin(async (request, { user }) => {
    const body = await request.json();
    const parsed = createMarketplaceStudySchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Validation failed', details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    const id = await createMarketplaceStudy(user.uid, parsed.data);
    return { data: { id } };
});

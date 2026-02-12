import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-middleware';
import { marketplaceImportSchema } from '@/lib/validators';
import { importFromMarketplace } from '@/services/marketplace-service';
import { rateLimit } from '@/lib/rate-limit';
import {
    MARKETPLACE_IMPORT_RATE_LIMIT,
    MARKETPLACE_IMPORT_RATE_WINDOW,
} from '@/lib/constants';

/**
 * POST /api/marketplace/import
 * Import selected domains from a marketplace study into the user's personal namespace.
 *
 * Features:
 * - Idempotency: blocks reimport of same domains (returns 409)
 * - Atomicity: batch write with cleanup on failure
 * - Traceability: _source metadata on all created docs
 * - Rate limited: max 5 imports per hour per user
 */
export const POST = withAuth(async (request, { user }) => {
    // Rate limit: max imports per hour per user
    const allowed = await rateLimit(
        `mkt-import:${user.uid}`,
        MARKETPLACE_IMPORT_RATE_LIMIT,
        MARKETPLACE_IMPORT_RATE_WINDOW,
        false
    );
    if (!allowed) {
        return NextResponse.json(
            { error: `Too many import requests. Max ${MARKETPLACE_IMPORT_RATE_LIMIT} per hour.` },
            { status: 429 }
        );
    }

    const body = await request.json();
    const parsed = marketplaceImportSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Validation failed', details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    const result = await importFromMarketplace(
        user.uid,
        parsed.data.studyId,
        parsed.data.domainIds
    );

    return { data: result };
});

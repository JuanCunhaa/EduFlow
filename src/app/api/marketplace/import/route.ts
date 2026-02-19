import { NextResponse } from 'next/server';
import { withPlan } from '@/lib/api-middleware';
import { marketplaceImportSchema } from '@/lib/validators';
import { importFromMarketplace } from '@/services/marketplace-service';
import { rateLimit } from '@/lib/rate-limit';
import { enforcePlanLimit } from '@/lib/plan-limits';
import {
  MARKETPLACE_IMPORT_RATE_LIMIT,
  MARKETPLACE_IMPORT_RATE_WINDOW,
} from '@/lib/constants';

/**
 * POST /api/marketplace/import
 * Import selected domains from a marketplace study into the user's personal namespace.
 * Enforces: marketplace import limit (free tier).
 *
 * Features:
 * - Idempotency: blocks reimport of same domains (returns 409)
 * - Atomicity: batch write with cleanup on failure
 * - Traceability: _source metadata on all created docs
 * - Rate limited: max 5 imports per hour per user
 */
export const POST = withPlan(async (request, { user, plan }) => {
  // ── Plan enforcement ──
  await enforcePlanLimit(user.uid, plan, 'marketplace_import_limit');

  // Rate limit: max imports per hour per user
  const allowed = await rateLimit(
    `mkt-import:${user.uid}`,
    MARKETPLACE_IMPORT_RATE_LIMIT,
    MARKETPLACE_IMPORT_RATE_WINDOW,
    false
  );
  if (!allowed) {
    return NextResponse.json(
      {
        error: `Too many import requests. Max ${MARKETPLACE_IMPORT_RATE_LIMIT} per hour.`,
      },
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

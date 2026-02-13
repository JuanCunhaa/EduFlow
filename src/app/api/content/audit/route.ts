import { NextResponse } from 'next/server';
import { withAdmin } from '@/lib/api-middleware';
import { listContentAudit } from '@/services/content-audit-service';
import type { ContentAction } from '@/types';

/**
 * GET /api/content/audit
 * Admin: list content audit entries with optional filters.
 * Query params: action, actor, studyId, batchId, limit, cursor
 */
export const GET = withAdmin(async (request) => {
    const { searchParams } = new URL(request.url);

    const result = await listContentAudit({
        action: (searchParams.get('action') as ContentAction) || undefined,
        actor: searchParams.get('actor') || undefined,
        studyId: searchParams.get('studyId') || undefined,
        batchId: searchParams.get('batchId') || undefined,
        limit: Number.parseInt(searchParams.get('limit') || '50', 10) || 50,
        cursor: searchParams.get('cursor') || undefined,
    });

    const res = NextResponse.json({
        data: result.entries,
        nextCursor: result.nextCursor,
    });
    res.headers.set('Cache-Control', 'private, max-age=10, stale-while-revalidate=30');
    return res;
});

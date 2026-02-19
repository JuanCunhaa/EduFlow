import { NextResponse } from 'next/server';
import { withAuth, withAdmin } from '@/lib/api-middleware';
import { updateMarketplaceStudySchema } from '@/lib/validators';
import {
  getMarketplaceStudy,
  updateMarketplaceStudy,
  deleteMarketplaceStudy,
} from '@/services/marketplace-service';

/**
 * GET /api/marketplace/studies/[studyId]
 * Get a single marketplace study with its domains. Available to all authenticated users.
 */
export const GET = withAuth(async (_request, { params }) => {
  const study = await getMarketplaceStudy(params.studyId);

  const res = NextResponse.json({ data: study });
  res.headers.set(
    'Cache-Control',
    'public, max-age=300, stale-while-revalidate=600'
  );
  return res;
});

/**
 * PUT /api/marketplace/studies/[studyId]
 * Update a marketplace study. Admin only.
 */
export const PUT = withAdmin(async (request, { params }) => {
  const body = await request.json();
  const parsed = updateMarketplaceStudySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await updateMarketplaceStudy(params.studyId, parsed.data);
  return { data: { success: true } };
});

/**
 * DELETE /api/marketplace/studies/[studyId]
 * Soft-delete a marketplace study. Admin only.
 */
export const DELETE = withAdmin(async (_request, { params }) => {
  await deleteMarketplaceStudy(params.studyId);
  return { data: { success: true } };
});

import { NextResponse } from 'next/server';
import { withAuth, withPublicRoute } from '@/lib/api-middleware';
import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * GET /api/packs/[packId] — pack detail
 * Public for published packs, creator-only for drafts
 */
export const GET = withPublicRoute(async (_request, { log, params }) => {
  const { packId } = params;
  const db = getAdminDb();

  const doc = await db.collection('packs').doc(packId).get();
  if (!doc.exists) {
    return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
  }

  const data = doc.data()!;

  // Only show published packs publicly
  if (data.status !== 'published' || !data.isActive) {
    return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
  }

  log.done(200);
  return {
    pack: {
      id: doc.id,
      ...data,
      totalRevenue: undefined,
      stripeProductId: undefined,
      stripePriceId: undefined,
    },
  };
});

/**
 * PATCH /api/packs/[packId] — update pack (creator-only, own packs, draft/revision_needed only)
 */
export const PATCH = withAuth(async (request, { user, log, params }) => {
  const { packId } = params;
  const db = getAdminDb();

  const doc = await db.collection('packs').doc(packId).get();
  if (!doc.exists) {
    return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
  }

  const pack = doc.data()!;
  if (pack.creatorId !== user.uid) {
    return NextResponse.json({ error: 'Not your pack' }, { status: 403 });
  }

  if (!['draft', 'revision_needed', 'approved'].includes(pack.status)) {
    return NextResponse.json(
      { error: `Cannot edit pack in '${pack.status}' status` },
      { status: 400 }
    );
  }

  const body = await request.json();
  const allowedFields = [
    'title',
    'description',
    'domains',
    'pricing',
    'priceUsd',
    'tags',
    'accentColor',
    'sampleQuestionIds',
  ];
  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  if (updates.title && (updates.title as string).length > 80) {
    return NextResponse.json(
      { error: 'Title must be ≤ 80 characters' },
      { status: 400 }
    );
  }

  updates.updatedAt = FieldValue.serverTimestamp();
  await db.collection('packs').doc(packId).update(updates);

  log.done(200);
  return { ok: true, packId };
});

/**
 * DELETE /api/packs/[packId] — soft-delete (creator-only)
 */
export const DELETE = withAuth(async (_request, { user, log, params }) => {
  const { packId } = params;
  const db = getAdminDb();

  const doc = await db.collection('packs').doc(packId).get();
  if (!doc.exists) {
    return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
  }

  if (doc.data()!.creatorId !== user.uid) {
    return NextResponse.json({ error: 'Not your pack' }, { status: 403 });
  }

  await db.collection('packs').doc(packId).update({
    isActive: false,
    status: 'archived',
    updatedAt: FieldValue.serverTimestamp(),
  });

  log.done(200);
  return { ok: true, packId };
});

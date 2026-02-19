import { NextResponse } from 'next/server';
import { withAdmin } from '@/lib/api-middleware';
import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * GET /api/admin/packs/review — moderation queue (submitted packs)
 */
export const GET = withAdmin(async (request, { log }) => {
  const db = getAdminDb();
  const url = new URL(request.url);
  const status = url.searchParams.get('status') || 'submitted';

  const snap = await db
    .collection('packs')
    .where('status', '==', status)
    .orderBy('submittedAt', 'asc')
    .limit(50)
    .get();

  const packs = snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  log.done(200);
  return { packs };
});

/**
 * PATCH /api/admin/packs/review — approve/reject/request-revision on a pack
 * Body: { packId, decision: 'approved' | 'rejected' | 'revision_needed', reviewNotes? }
 */
export const PATCH = withAdmin(async (request, { user, log }) => {
  const db = getAdminDb();
  const body = await request.json();
  const { packId, decision, reviewNotes } = body;

  if (!packId || !decision) {
    return NextResponse.json(
      { error: 'packId and decision required' },
      { status: 400 }
    );
  }

  if (!['approved', 'rejected', 'revision_needed'].includes(decision)) {
    return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
  }

  const packDoc = await db.collection('packs').doc(packId).get();
  if (!packDoc.exists) {
    return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
  }

  const pack = packDoc.data()!;
  if (!['submitted', 'in_review'].includes(pack.status)) {
    return NextResponse.json(
      { error: `Pack is not in review queue (status: ${pack.status})` },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {
    status: decision,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (decision === 'rejected') {
    updates.rejectedAt = FieldValue.serverTimestamp();
    updates.rejectionReason = reviewNotes || 'No reason provided';
  }

  if (decision === 'approved') {
    updates.publishedAt = FieldValue.serverTimestamp();
    // Auto-publish approved packs
    updates.status = 'published';

    // Increment creator pack count
    await db
      .collection('creators')
      .doc(pack.creatorId)
      .update({
        packCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });
  }

  await db.collection('packs').doc(packId).update(updates);

  // Log moderation action
  await db.collection('moderation_actions').add({
    type: 'pack_review',
    targetId: packId,
    decision,
    notes: reviewNotes || null,
    moderatorUid: user.uid,
    createdAt: FieldValue.serverTimestamp(),
  });

  log.done(200);
  return { ok: true, packId, decision, finalStatus: updates.status };
});

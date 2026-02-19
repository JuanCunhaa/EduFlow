/**
 * Marketplace moderation API — admin approval/rejection of community packs.
 * Implements: docs/specs/9 creator-marketplace/marketplace-moderation.md
 */

import { withAdmin } from '@/lib/api-middleware';
import { getAdminDb } from '@/lib/firebase/admin';

// GET /api/marketplace/moderation — list packs pending moderation
export const GET = withAdmin(async (req) => {
  const db = getAdminDb();
  const url = new URL(req.url);
  const status = url.searchParams.get('status') || 'pending_review';

  const snap = await db
    .collection('marketplace_studies')
    .where('status', '==', status)
    .orderBy('createdAt', 'asc')
    .limit(50)
    .get();

  const items = snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return { items, total: snap.size };
});

// PUT /api/marketplace/moderation — approve/reject a pack
export const PUT = withAdmin(async (req, { user }) => {
  const body = await req.json();
  const { studyId, action, reason } = body;

  if (!studyId || typeof studyId !== 'string') {
    throw Object.assign(new Error('studyId required'), { status: 400 });
  }

  const validActions = ['approve', 'reject', 'request_changes'];
  if (!validActions.includes(action)) {
    throw Object.assign(
      new Error(`action must be one of: ${validActions.join(', ')}`),
      { status: 400 }
    );
  }

  if (action !== 'approve' && (!reason || typeof reason !== 'string')) {
    throw Object.assign(
      new Error('reason required for reject/request_changes'),
      { status: 400 }
    );
  }

  const db = getAdminDb();
  const studyRef = db.collection('marketplace_studies').doc(studyId);
  const studySnap = await studyRef.get();

  if (!studySnap.exists) {
    throw Object.assign(new Error('Study pack not found'), { status: 404 });
  }

  const STATUS_MAP: Record<string, string> = {
    approve: 'published',
    reject: 'rejected',
    request_changes: 'changes_requested',
  };
  const newStatus = STATUS_MAP[action];

  await studyRef.update({
    status: newStatus,
    moderatedBy: user.uid,
    moderatedAt: Date.now(),
    moderationReason: reason || null,
  });

  // Log moderation action
  await db.collection('moderation_log').add({
    studyId,
    action,
    reason: reason || null,
    moderatorUid: user.uid,
    previousStatus: studySnap.data()!.status,
    newStatus,
    createdAt: Date.now(),
  });

  return { studyId, status: newStatus };
});

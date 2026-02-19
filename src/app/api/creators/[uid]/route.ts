import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api-middleware';
import { getAdminDb } from '@/lib/firebase/admin';

/**
 * GET /api/creators/[uid] — public creator profile
 */
export const GET = withPublicRoute(async (_request, { log, params }) => {
  const { uid } = params;
  const db = getAdminDb();

  const doc = await db.collection('creators').doc(uid).get();
  if (!doc.exists) {
    return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
  }

  const data = doc.data()!;
  if (data.verificationStatus !== 'approved' || !data.isActive) {
    return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
  }

  // Fetch published packs
  const packsSnap = await db
    .collection('packs')
    .where('creatorId', '==', uid)
    .where('status', '==', 'published')
    .where('isActive', '==', true)
    .orderBy('salesCount', 'desc')
    .limit(50)
    .get();

  const packs = packsSnap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    // Strip internal fields
    stripeProductId: undefined,
    stripePriceId: undefined,
    totalRevenue: undefined,
  }));

  log.done(200);
  return {
    creator: {
      uid: doc.id,
      ...data,
      stripeConnectId: undefined,
      payoutMethod: undefined,
    },
    packs,
  };
});

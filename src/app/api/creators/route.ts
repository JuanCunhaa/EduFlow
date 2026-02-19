import { NextResponse } from 'next/server';
import { withAuth, withPublicRoute } from '@/lib/api-middleware';
import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { CreatorApplication } from '@/types';

/**
 * GET /api/creators — list verified creators (public)
 */
export const GET = withPublicRoute(async (request, { log }) => {
  const db = getAdminDb();
  const url = new URL(request.url);
  const limit = Math.min(
    parseInt(url.searchParams.get('limit') || '20', 10),
    50
  );

  const snap = await db
    .collection('creators')
    .where('verificationStatus', '==', 'approved')
    .where('isActive', '==', true)
    .orderBy('totalSales', 'desc')
    .limit(limit)
    .get();

  const creators = snap.docs.map((doc) => ({
    uid: doc.id,
    ...doc.data(),
    // Never expose payout details
    stripeConnectId: undefined,
    payoutMethod: undefined,
  }));

  log.done(200);
  return { creators };
});

/**
 * POST /api/creators — submit creator application (authenticated)
 */
export const POST = withAuth(async (request, { user, log }) => {
  const db = getAdminDb();
  const body = await request.json();

  const {
    fullName,
    linkedinUrl,
    certificationsHeld,
    certProofUrl,
    yearsExperience,
    writingSample,
    bio,
    payoutMethod,
    agreedToTos,
  } = body;

  // Validation
  if (
    !fullName ||
    !linkedinUrl ||
    !certificationsHeld?.length ||
    !writingSample ||
    !bio ||
    !agreedToTos
  ) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  // Check for existing application
  const existing = await db
    .collection('creator_applications')
    .where('uid', '==', user.uid)
    .where('status', '==', 'pending')
    .limit(1)
    .get();

  if (!existing.empty) {
    return NextResponse.json(
      { error: 'You already have a pending application' },
      { status: 409 }
    );
  }

  const application: Omit<CreatorApplication, 'id'> = {
    uid: user.uid,
    fullName,
    email: user.email || '',
    linkedinUrl,
    certificationsHeld,
    certProofUrl: certProofUrl || '',
    yearsExperience: yearsExperience || '1-3',
    writingSample,
    bio,
    payoutMethod: payoutMethod || 'stripe_connect',
    agreedToTos: true,
    status: 'pending',
    reviewNotes: null,
    reviewedBy: null,
    reviewedAt: null,
    createdAt: FieldValue.serverTimestamp() as never,
  };

  const docRef = await db.collection('creator_applications').add(application);
  log.done(201);
  return { id: docRef.id, status: 'pending' };
});

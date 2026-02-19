import { NextResponse } from 'next/server';
import { withAdmin } from '@/lib/api-middleware';
import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * GET /api/admin/creators — list pending creator applications
 */
export const GET = withAdmin(async (request, { log }) => {
  const db = getAdminDb();
  const url = new URL(request.url);
  const status = url.searchParams.get('status') || 'pending';

  const snap = await db
    .collection('creator_applications')
    .where('status', '==', status)
    .orderBy('createdAt', 'asc')
    .limit(50)
    .get();

  const applications = snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  log.done(200);
  return { applications };
});

/**
 * PATCH /api/admin/creators — approve/reject a creator application
 * Body: { applicationId, decision: 'approved' | 'rejected' | 'needs_revision', reviewNotes? }
 */
export const PATCH = withAdmin(async (request, { user, log }) => {
  const db = getAdminDb();
  const body = await request.json();
  const { applicationId, decision, reviewNotes } = body;

  if (!applicationId || !decision) {
    return NextResponse.json(
      { error: 'applicationId and decision required' },
      { status: 400 }
    );
  }

  if (!['approved', 'rejected', 'needs_revision'].includes(decision)) {
    return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
  }

  const appDoc = await db
    .collection('creator_applications')
    .doc(applicationId)
    .get();
  if (!appDoc.exists) {
    return NextResponse.json(
      { error: 'Application not found' },
      { status: 404 }
    );
  }

  const application = appDoc.data()!;

  // Update application status
  await db
    .collection('creator_applications')
    .doc(applicationId)
    .update({
      status: decision,
      reviewNotes: reviewNotes || null,
      reviewedBy: user.uid,
      reviewedAt: FieldValue.serverTimestamp(),
    });

  // If approved, create the creator profile
  if (decision === 'approved') {
    const slug = application.fullName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    await db
      .collection('creators')
      .doc(application.uid)
      .set({
        uid: application.uid,
        slug,
        displayName: application.fullName,
        bio: application.bio,
        linkedinUrl: application.linkedinUrl,
        certificationsHeld: application.certificationsHeld,
        yearsExperience: application.yearsExperience,
        badges: ['verified'],
        verificationStatus: 'approved',
        packCount: 0,
        totalSales: 0,
        averageRating: 0,
        payoutMethod: application.payoutMethod,
        stripeConnectId: null,
        isActive: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
  }

  log.done(200);
  return { ok: true, applicationId, decision };
});

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-middleware';
import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * POST /api/orgs/[orgId]/invites/accept — accept an invite
 * Body: { token }
 */
export const POST = withAuth(async (request, { user, log, params }) => {
    const { orgId } = params;
    const db = getAdminDb();
    const body = await request.json();
    const { token } = body;

    if (!token) {
        return NextResponse.json({ error: 'Invite token required' }, { status: 400 });
    }

    // Find invite
    const inviteSnap = await db
        .collection('org_invites')
        .where('orgId', '==', orgId)
        .where('token', '==', token)
        .where('status', '==', 'pending')
        .limit(1)
        .get();

    if (inviteSnap.empty) {
        return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 404 });
    }

    const inviteDoc = inviteSnap.docs[0];
    const invite = inviteDoc.data();

    // Check expiry
    const expiresAt = invite.expiresAt?.toDate?.() || invite.expiresAt;
    if (expiresAt && new Date() > new Date(expiresAt)) {
        await inviteDoc.ref.update({ status: 'expired' });
        return NextResponse.json({ error: 'Invite has expired' }, { status: 410 });
    }

    // Verify email matches
    if (invite.email !== user.email?.toLowerCase()) {
        return NextResponse.json({ error: 'This invite was sent to a different email' }, { status: 403 });
    }

    // Check if already a member
    const existingMember = await db
        .collection('orgs')
        .doc(orgId)
        .collection('members')
        .doc(user.uid)
        .get();

    if (existingMember.exists) {
        return NextResponse.json({ error: 'Already a member' }, { status: 409 });
    }

    const batch = db.batch();

    // Add membership
    const memberRef = db.collection('orgs').doc(orgId).collection('members').doc(user.uid);
    batch.set(memberRef, {
        uid: user.uid,
        orgId,
        role: invite.role || 'member',
        displayName: user.email || 'Member',
        email: user.email || '',
        joinedAt: FieldValue.serverTimestamp(),
    });

    // Update invite status
    batch.update(inviteDoc.ref, { status: 'accepted' });

    // Increment seat count
    const orgRef = db.collection('orgs').doc(orgId);
    batch.update(orgRef, {
        seatCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    log.done(200);
    return { ok: true, orgId, role: invite.role || 'member' };
});

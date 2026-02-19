import { NextResponse } from 'next/server';
import { withOrgRole } from '@/lib/rbac';
import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';

/**
 * GET /api/orgs/[orgId]/members — list members
 */
export const GET = withOrgRole(async (_request, { log, orgId }) => {
    const db = getAdminDb();

    const snap = await db
        .collection('orgs')
        .doc(orgId)
        .collection('members')
        .orderBy('joinedAt', 'asc')
        .get();

    const members = snap.docs.map((doc) => ({
        uid: doc.id,
        ...doc.data(),
    }));

    log.done(200);
    return { members };
});

/**
 * POST /api/orgs/[orgId]/members — invite a member (admin only)
 * Body: { email, role? }
 */
export const POST = withOrgRole(async (request, { user, log, orgId }) => {
    const db = getAdminDb();
    const body = await request.json();
    const { email, role } = body;

    if (!email || !email.includes('@')) {
        return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    // Check seat limit
    const orgDoc = await db.collection('orgs').doc(orgId).get();
    const org = orgDoc.data()!;
    if (org.seatCount >= org.seatLimit) {
        return NextResponse.json({ error: 'Seat limit reached' }, { status: 400 });
    }

    // Check for existing invite
    const existingInvite = await db
        .collection('org_invites')
        .where('orgId', '==', orgId)
        .where('email', '==', email.toLowerCase())
        .where('status', '==', 'pending')
        .limit(1)
        .get();

    if (!existingInvite.empty) {
        return NextResponse.json({ error: 'Invite already pending for this email' }, { status: 409 });
    }

    // Create invite
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiry

    const inviteRef = await db.collection('org_invites').add({
        orgId,
        email: email.toLowerCase(),
        role: role || 'member',
        invitedBy: user.uid,
        token,
        status: 'pending',
        expiresAt,
        createdAt: FieldValue.serverTimestamp(),
    });

    log.done(201);
    return {
        inviteId: inviteRef.id,
        // In production, send email with accept link containing token
        acceptUrl: `/api/orgs/${orgId}/invites/accept?token=${token}`,
    };
}, 'admin');

/**
 * DELETE /api/orgs/[orgId]/members — remove a member (admin only)
 * Body: { uid }
 */
export const DELETE = withOrgRole(async (request, { log, orgId }) => {
    const db = getAdminDb();
    const body = await request.json();
    const { uid } = body;

    if (!uid) {
        return NextResponse.json({ error: 'Member uid is required' }, { status: 400 });
    }

    // Cannot remove org owner
    const orgDoc = await db.collection('orgs').doc(orgId).get();
    if (orgDoc.data()?.ownerId === uid) {
        return NextResponse.json({ error: 'Cannot remove organization owner' }, { status: 400 });
    }

    const memberRef = db.collection('orgs').doc(orgId).collection('members').doc(uid);
    const memberDoc = await memberRef.get();
    if (!memberDoc.exists) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    await memberRef.delete();

    // Decrement seat count
    await db.collection('orgs').doc(orgId).update({
        seatCount: FieldValue.increment(-1),
        updatedAt: FieldValue.serverTimestamp(),
    });

    log.done(200);
    return { ok: true, removedUid: uid };
}, 'admin');

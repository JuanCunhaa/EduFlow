import { NextResponse } from 'next/server';
import { withOrgRole } from '@/lib/rbac';
import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * GET /api/orgs/[orgId] — org details (members only)
 */
export const GET = withOrgRole(async (_request, { log, orgId }) => {
    const db = getAdminDb();
    const doc = await db.collection('orgs').doc(orgId).get();

    if (!doc.exists || !doc.data()?.isActive) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    log.done(200);
    return { org: { id: doc.id, ...doc.data() } };
});

/**
 * PATCH /api/orgs/[orgId] — update org settings (admin only)
 */
export const PATCH = withOrgRole(async (request, { log, orgId }) => {
    const db = getAdminDb();
    const body = await request.json();

    const allowedFields = ['name', 'logo', 'accentColor', 'certFocus'];
    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
        if (body[field] !== undefined) updates[field] = body[field];
    }

    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updates.updatedAt = FieldValue.serverTimestamp();
    await db.collection('orgs').doc(orgId).update(updates);

    log.done(200);
    return { ok: true, orgId };
}, 'admin');

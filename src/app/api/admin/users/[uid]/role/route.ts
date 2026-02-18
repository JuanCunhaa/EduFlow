/**
 * PATCH /api/admin/users/[uid]/role
 * Set user role (admin or regular user).
 * Admin-only endpoint.
 *
 * NOTE: User must log out and back in for new role to take effect
 * (Firebase custom claims are embedded in the session cookie).
 */

import { NextResponse } from 'next/server';
import { withAdmin, type RouteContext } from '@/lib/api-middleware';
import { setUserRoles } from '@/lib/firebase/server-auth';
import { z } from 'zod';

const bodySchema = z.object({
    role: z.enum(['admin', 'user']),
});

export const PATCH = withAdmin(async (request: Request, { user, log, params }: RouteContext) => {
    const { uid } = params;
    const body = await request.json();
    const parsed = bodySchema.parse(body);

    // Prevent admin from removing their own admin role
    if (uid === user.uid && parsed.role === 'user') {
        return NextResponse.json(
            { error: 'Cannot remove your own admin role' },
            { status: 400 }
        );
    }

    const roles = parsed.role === 'admin' ? ['admin'] : [];
    await setUserRoles(uid, roles);

    log.info('Admin set user role', { meta: { targetUid: uid, role: parsed.role } });

    return { success: true, uid, role: parsed.role };
});

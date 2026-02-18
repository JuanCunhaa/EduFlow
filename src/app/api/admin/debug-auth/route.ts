/**
 * GET /api/admin/debug-auth
 * Temporary debug endpoint to check what claims are in the session cookie.
 * DELETE THIS AFTER DEBUGGING.
 */

import { NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('__session')?.value;

        if (!sessionCookie) {
            return NextResponse.json({ error: 'No __session cookie found' }, { status: 401 });
        }

        const decoded = await getAdminAuth().verifySessionCookie(sessionCookie, false);

        // Also check actual custom claims on the user record
        const userRecord = await getAdminAuth().getUser(decoded.uid);

        return NextResponse.json({
            sessionClaims: {
                uid: decoded.uid,
                email: decoded.email,
                roles: decoded.roles,
                admin: decoded.admin,
                iat: decoded.iat,
                exp: decoded.exp,
            },
            actualCustomClaims: userRecord.customClaims,
            diagnosis: decoded.roles?.includes?.('admin')
                ? '✅ Session has admin role'
                : '❌ Session cookie does NOT have admin role — user must log out and log back in',
        });
    } catch (error) {
        return NextResponse.json({
            error: 'Failed to verify session',
            details: error instanceof Error ? error.message : String(error),
        }, { status: 500 });
    }
}

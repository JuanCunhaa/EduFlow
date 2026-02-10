import { getAdminAuth } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

/**
 * Verifies the auth cookie and returns the decoded token.
 * Used in API routes to authenticate requests.
 * Returns null if no valid session exists.
 */
export async function verifyAuth(): Promise<{ uid: string; email: string } | null> {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('__session')?.value;

        if (!sessionCookie) return null;

        const decoded = await getAdminAuth().verifySessionCookie(sessionCookie, true);
        return { uid: decoded.uid, email: decoded.email || '' };
    } catch {
        return null;
    }
}

/**
 * Verifies auth and throws a Response if unauthorized.
 * Convenience wrapper for routes that always require auth.
 */
export async function requireAuth(): Promise<{ uid: string; email: string }> {
    const user = await verifyAuth();
    if (!user) {
        throw new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    return user;
}

/**
 * Check if the authenticated user is the admin.
 */
export function isAdmin(uid: string): boolean {
    const adminUid = process.env.ADMIN_UID;
    return !!adminUid && uid === adminUid;
}

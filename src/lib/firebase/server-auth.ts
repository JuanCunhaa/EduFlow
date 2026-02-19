import { getAdminAuth } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

/** Authenticated user info with role-based access control */
export interface AuthUser {
  uid: string;
  email: string;
  roles: string[];
}

/**
 * Verifies the auth cookie and returns the decoded token with roles.
 * Roles come from Firebase custom claims (set via Admin SDK).
 * Returns null if no valid session exists.
 */
export async function verifyAuth(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('__session')?.value;

    if (!sessionCookie) return null;

    // checkRevoked=false — we rely on cookie expiry (7 days) and explicit
    // logout (which clears the cookie). Checking revocation on every request
    // adds a network round-trip to Firebase and can cause false rejections
    // if tokens were revoked during a previous login flow.
    const decoded = await getAdminAuth().verifySessionCookie(
      sessionCookie,
      false
    );

    // Extract roles from custom claims (default to empty array)
    const roles: string[] = Array.isArray(decoded.roles)
      ? decoded.roles
      : decoded.admin === true
        ? ['admin']
        : [];

    return {
      uid: decoded.uid,
      email: decoded.email || '',
      roles,
    };
  } catch {
    return null;
  }
}

/**
 * Verifies the auth cookie with revocation check (checkRevoked=true).
 * Adds a network round-trip to Firebase but ensures revoked sessions
 * are rejected immediately. Use for sensitive operations (delete study,
 * question deletion, etc.).
 */
export async function verifyAuthStrict(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('__session')?.value;

    if (!sessionCookie) return null;

    const decoded = await getAdminAuth().verifySessionCookie(
      sessionCookie,
      true
    );

    const roles: string[] = Array.isArray(decoded.roles)
      ? decoded.roles
      : decoded.admin === true
        ? ['admin']
        : [];

    return {
      uid: decoded.uid,
      email: decoded.email || '',
      roles,
    };
  } catch {
    return null;
  }
}

/**
 * Verifies auth and throws if unauthorized.
 * Convenience wrapper for routes that always require auth.
 */
export async function requireAuth(): Promise<AuthUser> {
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
 * Check if the user has a specific role via custom claims.
 * Replaces the old ADMIN_UID env var approach.
 */
export function hasRole(user: AuthUser, role: string): boolean {
  return user.roles.includes(role);
}

/**
 * Check if the authenticated user is an admin.
 * Supports both:
 * 1. Firebase custom claims (roles array or admin boolean) — preferred
 * 2. Legacy ADMIN_UID env var — fallback for migration
 */
export function isAdmin(user: AuthUser): boolean {
  if (user.roles.includes('admin')) return true;

  // Legacy fallback — will be removed after migration
  const adminUid = process.env.ADMIN_UID;
  return !!adminUid && user.uid === adminUid;
}

/**
 * Set roles on a user via Firebase custom claims.
 * Call from an admin-only endpoint or script:
 *
 * ```ts
 * await setUserRoles(uid, ['admin']);
 * ```
 */
export async function setUserRoles(
  uid: string,
  roles: string[]
): Promise<void> {
  await getAdminAuth().setCustomUserClaims(uid, { roles });
}

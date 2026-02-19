/**
 * GET /api/admin/users
 * List platform users with search and pagination.
 * Admin-only endpoint.
 */

import { withAdmin, type RouteContext } from '@/lib/api-middleware';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';

export const GET = withAdmin(
  async (request: Request, { log }: RouteContext) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.trim() || '';
    const pageToken = url.searchParams.get('pageToken') || undefined;
    const limit = Math.min(
      Number.parseInt(url.searchParams.get('limit') || '20', 10),
      50
    );

    const db = getAdminDb();
    const auth = getAdminAuth();

    // If searching by email, use Firebase Auth lookup
    if (search) {
      try {
        const userRecord = await auth.getUserByEmail(search);
        const profileDoc = await db
          .collection('users')
          .doc(userRecord.uid)
          .get();
        const profile = profileDoc.exists ? profileDoc.data() : {};

        // Get custom claims
        const claims = userRecord.customClaims || {};
        const roles: string[] = Array.isArray(claims.roles) ? claims.roles : [];
        if (!roles.includes('admin') && claims.admin) roles.push('admin');

        return {
          users: [
            {
              uid: userRecord.uid,
              email: userRecord.email || '',
              displayName: userRecord.displayName || '',
              photoURL: userRecord.photoURL || null,
              plan: profile?.plan || 'free',
              isAdmin: roles.includes('admin'),
              examsTaken: profile?.examsTaken || 0,
              createdAt: userRecord.metadata.creationTime || null,
              lastActiveAt: profile?.lastActiveAt || null,
            },
          ],
          nextPageToken: null,
        };
      } catch {
        log.info('User search: no match', { meta: { search } });
        return { users: [], nextPageToken: null };
      }
    }

    // List users with pagination via Firebase Auth
    const listResult = await auth.listUsers(limit, pageToken);

    // Batch-fetch Firestore profiles
    const uids = listResult.users.map((u) => u.uid);
    const profileRefs = uids.map((uid) => db.collection('users').doc(uid));
    const profileSnaps =
      profileRefs.length > 0 ? await db.getAll(...profileRefs) : [];
    const profileMap = new Map<string, FirebaseFirestore.DocumentData>();
    for (const snap of profileSnaps) {
      if (snap.exists) profileMap.set(snap.id, snap.data()!);
    }

    const users = listResult.users.map((u) => {
      const profile = profileMap.get(u.uid) || {};
      const claims = u.customClaims || {};
      const roles: string[] = Array.isArray(claims.roles) ? claims.roles : [];
      if (!roles.includes('admin') && claims.admin) roles.push('admin');

      return {
        uid: u.uid,
        email: u.email || '',
        displayName: u.displayName || '',
        photoURL: u.photoURL || null,
        plan: profile.plan || 'free',
        isAdmin: roles.includes('admin'),
        examsTaken: profile.examsTaken || 0,
        createdAt: u.metadata.creationTime || null,
        lastActiveAt: profile.lastActiveAt || null,
      };
    });

    return {
      users,
      nextPageToken: listResult.pageToken || null,
    };
  }
);

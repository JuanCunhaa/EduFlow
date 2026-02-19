/**
 * Beta feature flags API — manage user beta opt-in/out.
 * Implements: docs/specs/7 beta/beta-feature-flags.md
 */

import { withAuth } from '@/lib/api-middleware';
import { getAdminDb } from '@/lib/firebase/admin';
import { getUserFlags, getAllFlagIds } from '@/lib/feature-flags';

// GET /api/beta/flags — get all flags with user's status
export const GET = withAuth(async (_req, { user }) => {
    const db = getAdminDb();
    const snap = await db.collection('users').doc(user.uid).get();
    const betaFlags: string[] = snap.data()?.betaFlags ?? [];

    return { flags: getUserFlags(betaFlags) };
});

// PUT /api/beta/flags — toggle a flag for the user
export const PUT = withAuth(async (req, { user }) => {
    const { flagId, enabled } = await req.json();

    if (!flagId || typeof enabled !== 'boolean') {
        throw Object.assign(new Error('flagId (string) and enabled (boolean) required'), { status: 400 });
    }

    const allFlags = getAllFlagIds();
    if (!allFlags.includes(flagId)) {
        throw Object.assign(new Error(`Unknown flag: ${flagId}`), { status: 400 });
    }

    const db = getAdminDb();
    const userRef = db.collection('users').doc(user.uid);
    const snap = await userRef.get();
    const currentFlags: string[] = snap.data()?.betaFlags ?? [];

    let updatedFlags: string[];
    if (enabled) {
        updatedFlags = currentFlags.includes(flagId) ? currentFlags : [...currentFlags, flagId];
    } else {
        updatedFlags = currentFlags.filter((f: string) => f !== flagId);
    }

    await userRef.update({ betaFlags: updatedFlags });

    return { betaFlags: updatedFlags, flags: getUserFlags(updatedFlags) };
});

/**
 * GET /api/admin/flags
 * List all feature flags with their configurations and enrolled user counts.
 * Admin-only endpoint.
 */

import { withAdmin } from '@/lib/api-middleware';
import { getAdminDb } from '@/lib/firebase/admin';
import { getAllFlagIds, getUserFlags } from '@/lib/feature-flags';

export const GET = withAdmin(async () => {
    const db = getAdminDb();

    // Load any persisted overrides from Firestore
    const configSnap = await db.collection('_config').doc('featureFlags').get();
    const overrides: Record<string, boolean> = configSnap.exists
        ? (configSnap.data() as Record<string, boolean>)
        : {};

    const flagIds = getAllFlagIds();

    // Get enrolled user counts per flag
    const enrolledCounts: Record<string, number> = {};
    await Promise.all(
        flagIds.map(async (id) => {
            const snap = await db
                .collection('users')
                .where('betaFlags', 'array-contains', id)
                .count()
                .get();
            enrolledCounts[id] = snap.data().count;
        })
    );

    // Build merged flag list (registry + overrides)
    const flags = getUserFlags().map((flag) => ({
        id: flag.id,
        description: flag.description,
        defaultEnabled:
            flag.id in overrides ? overrides[flag.id] : flag.enabled,
        enrolledUsers: enrolledCounts[flag.id] ?? 0,
    }));

    return { data: { flags } };
});

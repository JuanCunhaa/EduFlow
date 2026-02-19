/**
 * Creator analytics API — stats for content creators.
 * Implements: docs/specs/9 creator-marketplace/marketplace-creator-analytics.md
 */

import { withAuth } from '@/lib/api-middleware';
import { getAdminDb } from '@/lib/firebase/admin';

// GET /api/marketplace/analytics — creator's pack performance stats
export const GET = withAuth(async (req, { user }) => {
    const db = getAdminDb();
    const url = new URL(req.url);
    const period = url.searchParams.get('period') || '30d';

    // Get all studies by this creator
    const studiesSnap = await db.collection('marketplace_studies')
        .where('creatorUid', '==', user.uid)
        .get();

    if (studiesSnap.empty) {
        return {
            totalPacks: 0,
            totalDownloads: 0,
            totalRevenue: 0,
            avgRating: 0,
            packs: [],
        };
    }

    // Get purchase data for this creator's packs
    const purchasesSnap = await db.collection('marketplace_purchases')
        .where('creatorUid', '==', user.uid)
        .where('status', '==', 'completed')
        .get();

    // Calculate period filter
    const PERIOD_MAP: Record<string, number> = { '7d': 7, '90d': 90 };
    const periodMs = (PERIOD_MAP[period] ?? 30) * 86400000;
    const cutoff = Date.now() - periodMs;

    let totalRevenue = 0;
    let periodDownloads = 0;
    let periodRevenue = 0;

    for (const doc of purchasesSnap.docs) {
        const data = doc.data();
        totalRevenue += data.price || 0;
        if (data.createdAt >= cutoff) {
            periodDownloads++;
            periodRevenue += data.price || 0;
        }
    }

    // Build per-pack stats
    const packs = studiesSnap.docs.map((doc) => {
        const data = doc.data();
        const packPurchases = purchasesSnap.docs.filter((p) => p.data().studyId === doc.id);
        const packPeriodPurchases = packPurchases.filter((p) => p.data().createdAt >= cutoff);

        return {
            id: doc.id,
            title: data.title,
            status: data.status,
            downloadCount: data.downloadCount || 0,
            rating: data.rating || 0,
            reviewCount: data.reviewCount || 0,
            totalRevenue: packPurchases.reduce((sum, p) => sum + (p.data().price || 0), 0),
            periodDownloads: packPeriodPurchases.length,
            periodRevenue: packPeriodPurchases.reduce((sum, p) => sum + (p.data().price || 0), 0),
        };
    });

    // Calculate avg rating
    const ratedPacks = packs.filter((p) => p.rating > 0);
    const avgRating = ratedPacks.length > 0
        ? Math.round((ratedPacks.reduce((sum, p) => sum + p.rating, 0) / ratedPacks.length) * 10) / 10
        : 0;

    return {
        totalPacks: studiesSnap.size,
        totalDownloads: studiesSnap.docs.reduce((sum, d) => sum + (d.data().downloadCount || 0), 0),
        totalRevenue,
        avgRating,
        period,
        periodDownloads,
        periodRevenue,
        packs,
    };
});

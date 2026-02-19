/**
 * Marketplace purchasing API — buy/unlock community study packs.
 * Implements: docs/specs/9 creator-marketplace/marketplace-economy.md
 */

import { withAuth } from '@/lib/api-middleware';
import { getAdminDb } from '@/lib/firebase/admin';

// POST /api/marketplace/purchase — purchase/unlock a study pack
export const POST = withAuth(async (req, { user }) => {
    const { studyId } = await req.json();

    if (!studyId || typeof studyId !== 'string') {
        throw Object.assign(new Error('studyId required'), { status: 400 });
    }

    const db = getAdminDb();

    // Get the study pack
    const studyRef = db.collection('marketplace_studies').doc(studyId);
    const studySnap = await studyRef.get();

    if (!studySnap.exists) {
        throw Object.assign(new Error('Study pack not found'), { status: 404 });
    }

    const study = studySnap.data()!;

    // Check if already purchased
    const purchaseCheck = await db.collection('marketplace_purchases')
        .where('uid', '==', user.uid)
        .where('studyId', '==', studyId)
        .limit(1)
        .get();

    if (!purchaseCheck.empty) {
        return { alreadyPurchased: true, purchaseId: purchaseCheck.docs[0].id };
    }

    // Check if free
    const isFree = !study.price || study.price === 0;

    // Create purchase record
    const purchaseRef = await db.collection('marketplace_purchases').add({
        uid: user.uid,
        studyId,
        creatorUid: study.creatorUid,
        price: study.price || 0,
        currency: 'USD',
        status: isFree ? 'completed' : 'pending_payment',
        createdAt: Date.now(),
    });

    // For free packs, update download count immediately
    if (isFree) {
        await studyRef.update({
            downloadCount: (study.downloadCount || 0) + 1,
        });
    }

    return {
        purchaseId: purchaseRef.id,
        status: isFree ? 'completed' : 'pending_payment',
    };
});

// GET /api/marketplace/purchase — list user's purchases
export const GET = withAuth(async (_req, { user }) => {
    const db = getAdminDb();
    const snap = await db.collection('marketplace_purchases')
        .where('uid', '==', user.uid)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

    const purchases = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));

    return { purchases };
});

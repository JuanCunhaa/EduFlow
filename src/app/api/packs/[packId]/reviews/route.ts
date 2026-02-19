import { NextResponse } from 'next/server';
import { withAuth, withPublicRoute } from '@/lib/api-middleware';
import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * GET /api/packs/[packId]/reviews — list reviews for a pack (public)
 */
export const GET = withPublicRoute(async (request, { log, params }) => {
    const { packId } = params;
    const db = getAdminDb();
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 50);

    const snap = await db
        .collection('pack_reviews')
        .where('packId', '==', packId)
        .where('isHidden', '==', false)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

    const reviews = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));

    log.done(200);
    return { reviews };
});

/**
 * POST /api/packs/[packId]/reviews — submit a review (verified purchaser only)
 */
export const POST = withAuth(async (request, { user, log, params }) => {
    const { packId } = params;
    const db = getAdminDb();
    const body = await request.json();

    const { rating, text } = body;

    if (!rating || rating < 1 || rating > 5) {
        return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 });
    }
    if (text && text.length > 1000) {
        return NextResponse.json({ error: 'Review text must be ≤ 1000 characters' }, { status: 400 });
    }

    // Verify purchase
    const purchaseSnap = await db
        .collection('purchases')
        .where('packId', '==', packId)
        .where('buyerUid', '==', user.uid)
        .where('status', '==', 'completed')
        .limit(1)
        .get();

    if (purchaseSnap.empty) {
        // Also allow creators of free packs who imported them
        const packDoc = await db.collection('packs').doc(packId).get();
        if (!packDoc.exists || packDoc.data()?.pricing !== 'free') {
            return NextResponse.json({ error: 'Only verified purchasers can review' }, { status: 403 });
        }
    }

    // Check for existing review
    const existingSnap = await db
        .collection('pack_reviews')
        .where('packId', '==', packId)
        .where('reviewerUid', '==', user.uid)
        .limit(1)
        .get();

    if (!existingSnap.empty) {
        return NextResponse.json({ error: 'You already reviewed this pack' }, { status: 409 });
    }

    // Get reviewer display name
    const userDoc = await db.collection('users').doc(user.uid).get();
    const reviewerName = userDoc.exists ? userDoc.data()?.displayName || 'Anonymous' : 'Anonymous';

    const review = {
        packId,
        reviewerUid: user.uid,
        reviewerName,
        rating: Math.round(rating),
        text: text?.trim() || null,
        isVerifiedPurchase: !purchaseSnap.empty,
        creatorResponse: null,
        creatorRespondedAt: null,
        reportCount: 0,
        isHidden: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('pack_reviews').add(review);

    // Update pack average rating
    const allReviewsSnap = await db
        .collection('pack_reviews')
        .where('packId', '==', packId)
        .where('isHidden', '==', false)
        .get();

    const ratings = allReviewsSnap.docs.map((d) => d.data().rating as number);
    const avgRating = ratings.length >= 3
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : null;

    await db.collection('packs').doc(packId).update({
        averageRating: avgRating,
        reviewCount: ratings.length,
        updatedAt: FieldValue.serverTimestamp(),
    });

    log.done(201);
    return { id: docRef.id };
});

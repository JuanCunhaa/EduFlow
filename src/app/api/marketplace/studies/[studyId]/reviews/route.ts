/**
 * GET /api/marketplace/studies/[studyId]/reviews
 * List reviews for a marketplace study. Available to all authenticated users.
 *
 * POST /api/marketplace/studies/[studyId]/reviews
 * Submit a review for a marketplace study (rate-limited: 1 per user per study per 24h).
 */

import { withAuth, type RouteContext } from '@/lib/api-middleware';
import { getAdminDb, getAdminAuth } from '@/lib/firebase/admin';
import { serverTimestamp } from '@/lib/firebase/admin-firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

const reviewSchema = z.object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(500).optional(),
});

export const GET = withAuth(async (_request: Request, { params }: RouteContext) => {
    const { studyId } = params;
    const db = getAdminDb();

    const snap = await db
        .collection('pack_reviews')
        .where('studyId', '==', studyId)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

    const reviews = snap.docs.map((doc) => {
        const d = doc.data();
        const seconds = (d.createdAt as { _seconds?: number } | null)?._seconds;
        return {
            id: doc.id,
            rating: d.rating as number,
            comment: (d.comment ?? undefined) as string | undefined,
            authorName: d.authorName as string,
            createdAt: seconds ? new Date(seconds * 1000).toISOString() : null,
        };
    });

    const avgRating =
        reviews.length > 0
            ? Math.round(
                (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10
            ) / 10
            : null;

    return { data: { reviews, avgRating, totalReviews: reviews.length } };
});

export const POST = withAuth(
    async (request: Request, { user, params }: RouteContext) => {
        const { studyId } = params;

        // Rate limit: 1 review per user per study per 24h
        const ok = await rateLimit(`review:${user.uid}:${studyId}`, 1, 86_400_000, false);
        if (!ok) {
            return NextResponse.json(
                { error: 'You have already reviewed this study recently' },
                { status: 429 }
            );
        }

        const body = await request.json();
        const parsed = reviewSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid review', details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const db = getAdminDb();

        // Verify study exists
        const studyDoc = await db.collection('marketplace_studies').doc(studyId).get();
        if (!studyDoc.exists || !studyDoc.data()?.isActive) {
            return NextResponse.json({ error: 'Study not found' }, { status: 404 });
        }

        // Get display name from Firebase Auth
        const authRecord = await getAdminAuth().getUser(user.uid);
        const authorName = authRecord.displayName ?? 'Anonymous';

        const ref = db.collection('pack_reviews').doc();
        await ref.set({
            studyId,
            uid: user.uid,
            authorName,
            rating: parsed.data.rating,
            ...(parsed.data.comment ? { comment: parsed.data.comment } : {}),
            createdAt: serverTimestamp(),
        });

        // Denormalize stats on the study for fast reads
        await db.collection('marketplace_studies').doc(studyId).update({
            reviewCount: FieldValue.increment(1),
            ratingSum: FieldValue.increment(parsed.data.rating),
        });

        return { data: { id: ref.id } };
    }
);

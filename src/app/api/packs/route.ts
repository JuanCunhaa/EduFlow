import { NextResponse } from 'next/server';
import { withAuth, withPublicRoute } from '@/lib/api-middleware';
import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { QuestionPack } from '@/types';

/**
 * GET /api/packs — list published packs (public), with filters
 */
export const GET = withPublicRoute(async (request, { log }) => {
  const db = getAdminDb();
  const url = new URL(request.url);

  const certId = url.searchParams.get('certId');
  const pricing = url.searchParams.get('pricing');
  const sort = url.searchParams.get('sort') || 'popular';
  const limit = Math.min(
    parseInt(url.searchParams.get('limit') || '20', 10),
    50
  );

  let query = db
    .collection('packs')
    .where('status', '==', 'published')
    .where('isActive', '==', true) as FirebaseFirestore.Query;

  if (certId) query = query.where('certId', '==', certId);
  if (pricing) query = query.where('pricing', '==', pricing);

  // Sort
  const sortMap: Record<string, [string, FirebaseFirestore.OrderByDirection]> =
    {
      popular: ['salesCount', 'desc'],
      newest: ['publishedAt', 'desc'],
      rating: ['averageRating', 'desc'],
      'price-asc': ['priceUsd', 'asc'],
      'price-desc': ['priceUsd', 'desc'],
    };
  const [sortField, sortDir] = sortMap[sort] || sortMap.popular;
  query = query.orderBy(sortField, sortDir).limit(limit);

  const snap = await query.get();
  const packs = snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    totalRevenue: undefined,
    stripeProductId: undefined,
    stripePriceId: undefined,
  }));

  log.done(200);
  return { packs };
});

/**
 * POST /api/packs — create a new pack draft (creator-only)
 */
export const POST = withAuth(async (request, { user, log }) => {
  const db = getAdminDb();

  // Verify user is an approved creator
  const creatorDoc = await db.collection('creators').doc(user.uid).get();
  if (
    !creatorDoc.exists ||
    creatorDoc.data()?.verificationStatus !== 'approved'
  ) {
    return NextResponse.json(
      { error: 'Creator account required' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const {
    certId,
    title,
    description,
    domains,
    pricing,
    priceUsd,
    tags,
    accentColor,
  } = body;

  if (!certId || !title || !description) {
    return NextResponse.json(
      { error: 'certId, title, and description are required' },
      { status: 400 }
    );
  }
  if (title.length > 80) {
    return NextResponse.json(
      { error: 'Title must be ≤ 80 characters' },
      { status: 400 }
    );
  }

  const creator = creatorDoc.data()!;
  const slug = `${certId}-${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')}`;

  const pack: Omit<QuestionPack, 'id'> = {
    slug,
    certId,
    title,
    description,
    domains: domains || [],
    questionCount: 0,
    domainQuestionCounts: {},
    sampleQuestionIds: [],
    difficultyDistribution: { easy: 0, medium: 0, hard: 0 },
    tags: tags || [],
    creatorId: user.uid,
    creatorSlug: creator.slug || user.uid,
    creatorName: creator.displayName || 'Unknown',
    creatorBadges: creator.badges || [],
    pricing: pricing || 'free',
    priceUsd: pricing === 'paid' ? priceUsd || 0 : 0,
    stripePriceId: null,
    stripeProductId: null,
    salesCount: 0,
    totalRevenue: 0,
    averageRating: null,
    reviewCount: 0,
    status: 'draft',
    submittedAt: null,
    publishedAt: null,
    rejectedAt: null,
    rejectionReason: null,
    isActive: true,
    version: 1,
    accentColor: accentColor || undefined,
    createdAt: FieldValue.serverTimestamp() as never,
    updatedAt: FieldValue.serverTimestamp() as never,
  };

  const docRef = await db.collection('packs').add(pack);
  log.done(201);
  return { id: docRef.id, slug, status: 'draft' };
});

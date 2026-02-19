import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-middleware';
import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * GET /api/orgs — list user's organizations
 */
export const GET = withAuth(async (_request, { user, log }) => {
  const db = getAdminDb();

  // Find all orgs where user is a member
  const memberSnaps = await db
    .collectionGroup('members')
    .where('uid', '==', user.uid)
    .get();

  const orgIds = memberSnaps.docs
    .map((doc) => doc.ref.parent.parent?.id)
    .filter(Boolean) as string[];

  if (orgIds.length === 0) {
    return { orgs: [] };
  }

  // Fetch org details
  const orgs = await Promise.all(
    orgIds.map(async (orgId) => {
      const orgDoc = await db.collection('orgs').doc(orgId).get();
      if (!orgDoc.exists) return null;
      return { id: orgDoc.id, ...orgDoc.data() };
    })
  );

  log.done(200);
  return { orgs: orgs.filter(Boolean) };
});

/**
 * POST /api/orgs — create a new organization
 */
export const POST = withAuth(async (request, { user, log }) => {
  const db = getAdminDb();
  const body = await request.json();
  const { name, certFocus, accentColor } = body;

  if (!name || name.length < 2 || name.length > 100) {
    return NextResponse.json(
      { error: 'Name must be 2-100 characters' },
      { status: 400 }
    );
  }

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  // Check slug uniqueness
  const existing = await db
    .collection('orgs')
    .where('slug', '==', slug)
    .limit(1)
    .get();
  if (!existing.empty) {
    return NextResponse.json(
      { error: 'Organization name already taken' },
      { status: 409 }
    );
  }

  const batch = db.batch();

  // Create org
  const orgRef = db.collection('orgs').doc();
  batch.set(orgRef, {
    name,
    slug,
    ownerId: user.uid,
    logo: null,
    accentColor: accentColor || null,
    seatLimit: 50,
    seatCount: 1,
    certFocus: certFocus || [],
    isActive: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Add creator as admin member
  const memberRef = orgRef.collection('members').doc(user.uid);
  batch.set(memberRef, {
    uid: user.uid,
    orgId: orgRef.id,
    role: 'admin',
    displayName: user.email || 'Admin',
    email: user.email || '',
    joinedAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  log.done(201);
  return { id: orgRef.id, slug };
});

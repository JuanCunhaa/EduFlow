/**
 * Feedback API — user feedback and bug reports.
 * Implements: docs/specs/7 beta/beta-feedback-widget.md
 */

import { withAuth } from '@/lib/api-middleware';
import { getAdminDb } from '@/lib/firebase/admin';

// POST /api/beta/feedback — submit feedback
export const POST = withAuth(async (req, { user }) => {
  const body = await req.json();
  const { category, rating, text, page } = body;

  // Validation
  const validCategories = [
    'bug',
    'feature_request',
    'content_issue',
    'general',
  ];
  if (!validCategories.includes(category)) {
    throw Object.assign(
      new Error(`category must be one of: ${validCategories.join(', ')}`),
      { status: 400 }
    );
  }
  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    throw Object.assign(new Error('rating must be 1-5'), { status: 400 });
  }
  if (!text || typeof text !== 'string' || text.length < 10) {
    throw Object.assign(new Error('text must be at least 10 characters'), {
      status: 400,
    });
  }
  if (text.length > 2000) {
    throw Object.assign(new Error('text must be at most 2000 characters'), {
      status: 400,
    });
  }

  const db = getAdminDb();
  const docRef = await db.collection('feedback').add({
    uid: user.uid,
    category,
    rating,
    text: text.trim(),
    page: page || null,
    userAgent: req.headers.get('user-agent') || null,
    status: 'new',
    createdAt: Date.now(),
  });

  return { id: docRef.id };
});

// GET /api/beta/feedback — list user's own feedback
export const GET = withAuth(async (_req, { user }) => {
  const db = getAdminDb();
  const snap = await db
    .collection('feedback')
    .where('uid', '==', user.uid)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();

  const items = snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return { items };
});

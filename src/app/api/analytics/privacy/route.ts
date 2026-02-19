/**
 * Analytics privacy toggle — opt in/out of cross-user analytics.
 * Implements: docs/specs/3 analytics/privacy-anonymization.md
 */

import { withAuth } from '@/lib/api-middleware';

// PUT /api/analytics/privacy — toggle analyticsOptOut
export const PUT = withAuth(async (req, { user }) => {
  const body = await req.json();
  const optOut = Boolean(body.optOut);

  const { getAdminDb } = await import('@/lib/firebase/admin');
  const db = getAdminDb();
  await db.collection('users').doc(user.uid).update({
    analyticsOptOut: optOut,
  });

  return { analyticsOptOut: optOut };
});

// GET /api/analytics/privacy — get current opt-out status
export const GET = withAuth(async (_req, { user }) => {
  const { getAdminDb } = await import('@/lib/firebase/admin');
  const db = getAdminDb();
  const snap = await db.collection('users').doc(user.uid).get();
  const data = snap.data();

  return { analyticsOptOut: data?.analyticsOptOut ?? false };
});

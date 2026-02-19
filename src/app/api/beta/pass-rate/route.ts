/**
 * Pass-rate self-reporting API.
 * Implements: docs/specs/7 beta/beta-pass-rate.md
 */

import { withAuth } from '@/lib/api-middleware';
import { getAdminDb } from '@/lib/firebase/admin';

// POST /api/beta/pass-rate — report real exam result
export const POST = withAuth(async (req, { user }) => {
  const body = await req.json();
  const { certId, passed, examDate, notes } = body;

  if (!certId || typeof passed !== 'boolean') {
    throw Object.assign(
      new Error('certId (string) and passed (boolean) required'),
      { status: 400 }
    );
  }

  const db = getAdminDb();

  // Get user's current readiness for the cert (if available)
  let readinessAtTime: number | null = null;
  try {
    const readinessSnap = await db
      .collection('users')
      .doc(user.uid)
      .collection('readiness')
      .doc(certId)
      .get();
    if (readinessSnap.exists) {
      readinessAtTime = readinessSnap.data()?.score ?? null;
    }
  } catch {
    // Non-critical — proceed without readiness data
  }

  const docRef = await db.collection('pass_rate_reports').add({
    uid: user.uid,
    certId,
    passed,
    examDate: examDate || null,
    readinessAtTime,
    notes: notes ? String(notes).slice(0, 500) : null,
    createdAt: Date.now(),
  });

  return { id: docRef.id };
});

// GET /api/beta/pass-rate — get aggregated pass rate stats (anonymized)
export const GET = withAuth(async (req) => {
  const url = new URL(req.url);
  const certId = url.searchParams.get('certId');

  if (!certId) {
    throw Object.assign(new Error('certId query param required'), {
      status: 400,
    });
  }

  const db = getAdminDb();
  const snap = await db
    .collection('pass_rate_reports')
    .where('certId', '==', certId)
    .get();

  if (snap.size < 5) {
    // K-anonymity: don't expose data with fewer than 5 reports
    return { insufficient: true, minReports: 5, currentReports: snap.size };
  }

  let passCount = 0;
  let totalReadiness = 0;
  let readinessCount = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.passed) passCount++;
    if (data.readinessAtTime !== null && data.readinessAtTime !== undefined) {
      totalReadiness += data.readinessAtTime;
      readinessCount++;
    }
  }

  return {
    certId,
    totalReports: snap.size,
    passRate: Math.round((passCount / snap.size) * 100),
    avgReadinessAtExam:
      readinessCount > 0 ? Math.round(totalReadiness / readinessCount) : null,
  };
});

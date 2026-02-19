/**
 * GET /api/admin/stats
 * Platform overview statistics.
 * Admin-only endpoint.
 */

import { withAdmin } from '@/lib/api-middleware';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';

export const GET = withAdmin(async () => {
  const db = getAdminDb();

  // Count marketplace studies
  const studiesSnap = await db
    .collection('marketplace_studies')
    .where('isActive', '==', true)
    .count()
    .get();
  const totalStudies = studiesSnap.data().count;

  // Count marketplace questions
  const questionsSnap = await db
    .collection('marketplace_questions')
    .where('isActive', '==', true)
    .count()
    .get();
  const totalQuestions = questionsSnap.data().count;

  // Count total users (Firebase Auth)
  let totalUsers = 0;
  let pageToken: string | undefined;
  do {
    const result = await getAdminAuth().listUsers(1000, pageToken);
    totalUsers += result.users.length;
    pageToken = result.pageToken;
  } while (pageToken);

  // Count content audit entries
  const auditSnap = await db.collection('content_audit').count().get();
  const totalAuditEntries = auditSnap.data().count;

  // Count question reports
  const reportsSnap = await db
    .collection('question_reports')
    .where('status', '==', 'open')
    .count()
    .get();
  const openReports = reportsSnap.data().count;

  return {
    data: {
      totalUsers,
      totalStudies,
      totalQuestions,
      totalAuditEntries,
      openReports,
    },
  };
});

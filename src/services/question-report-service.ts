/**
 * QuestionReportService — handles user-submitted reports on question quality.
 *
 * Firestore collection: question_reports/{reportId}
 *
 * Flow:
 * 1. User reports a question (wrong answer, ambiguous, etc.)
 * 2. Report stored with 'open' status
 * 3. Admin reviews and resolves (fixed, rejected, archived)
 * 4. If fixed: question is edited or archived + recreated
 * 5. Marketplace question's reportCount incremented
 */

import { getAdminDb } from '@/lib/firebase/admin';
import {
  adminGetDoc,
  adminCreateDoc,
  adminUpdateDoc,
  adminQuery,
  serverTimestamp,
} from '@/lib/firebase/admin-firestore';
import { FieldValue } from 'firebase-admin/firestore';
import {
  QuestionReportNotFoundError,
  DuplicateReportError,
} from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { QuestionReport, ReportStatus } from '@/types';
import type {
  CreateQuestionReportInput,
  ResolveQuestionReportInput,
} from '@/lib/validators';

// ── Collection ───────────────────────────────────

const REPORTS_COL = 'question_reports';
const MARKETPLACE_QUESTIONS_COL = 'marketplace_questions';

// ── Create Report ────────────────────────────────

export async function createQuestionReport(
  uid: string,
  data: CreateQuestionReportInput
): Promise<string> {
  const db = getAdminDb();

  // Idempotency: prevent duplicate reports from same user for same question
  const existingSnap = await db
    .collection(REPORTS_COL)
    .where('reportedBy', '==', uid)
    .where('questionId', '==', data.questionId)
    .where('status', '==', 'open')
    .limit(1)
    .get();

  if (!existingSnap.empty) {
    throw new DuplicateReportError();
  }

  const now = serverTimestamp();
  const id = await adminCreateDoc(REPORTS_COL, {
    questionId: data.questionId,
    marketplaceQuestionId: data.marketplaceQuestionId ?? null,
    studyId: data.studyId,
    reportedBy: uid,
    reason: data.reason,
    description: data.description,
    status: 'open' as ReportStatus,
    resolution: null,
    resolvedBy: null,
    resolvedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  // Increment reportCount on marketplace question if applicable
  if (data.marketplaceQuestionId) {
    try {
      const mqRef = db
        .collection(MARKETPLACE_QUESTIONS_COL)
        .doc(data.marketplaceQuestionId);
      await mqRef.update({
        'performanceStats.reportCount': FieldValue.increment(1),
      });
    } catch {
      // Non-critical: don't fail the report if counter update fails
      logger.warn('Failed to increment marketplace question report count', {
        meta: { marketplaceQuestionId: data.marketplaceQuestionId },
      });
    }
  }

  logger.info('Question report created', {
    userId: uid,
    meta: { reportId: id, questionId: data.questionId, reason: data.reason },
  });

  return id;
}

// ── List Reports ─────────────────────────────────

export interface ListReportsOptions {
  status?: ReportStatus;
  studyId?: string;
  questionId?: string;
  limit?: number;
  cursor?: string;
}

export async function listQuestionReports(
  options: ListReportsOptions = {}
): Promise<{ reports: QuestionReport[]; nextCursor: string | null }> {
  const {
    status,
    studyId,
    questionId,
    limit: limitParam = 50,
    cursor,
  } = options;
  const limitCount = Math.min(Math.max(1, limitParam), 100);
  const db = getAdminDb();

  let q: FirebaseFirestore.Query = db
    .collection(REPORTS_COL)
    .orderBy('createdAt', 'desc');

  if (status) q = q.where('status', '==', status);
  if (studyId) q = q.where('studyId', '==', studyId);
  if (questionId) q = q.where('questionId', '==', questionId);

  if (cursor) {
    const cursorDoc = await db.collection(REPORTS_COL).doc(cursor).get();
    if (cursorDoc.exists) {
      q = q.startAfter(cursorDoc);
    }
  }

  const snap = await q.limit(limitCount + 1).get();
  const reports = snap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as QuestionReport
  );

  const hasMore = reports.length > limitCount;
  const pageReports = hasMore ? reports.slice(0, limitCount) : reports;
  const nextCursor = hasMore ? (pageReports.at(-1)?.id ?? null) : null;

  return { reports: pageReports, nextCursor };
}

// ── Get Report ───────────────────────────────────

export async function getQuestionReport(
  reportId: string
): Promise<QuestionReport> {
  const report = await adminGetDoc<QuestionReport>(REPORTS_COL, reportId);
  if (!report) throw new QuestionReportNotFoundError();
  return report;
}

// ── Resolve Report (Admin) ───────────────────────

export async function resolveQuestionReport(
  reportId: string,
  adminUid: string,
  data: ResolveQuestionReportInput
): Promise<void> {
  const existing = await adminGetDoc<QuestionReport>(REPORTS_COL, reportId);
  if (!existing) throw new QuestionReportNotFoundError();

  const now = serverTimestamp();
  await adminUpdateDoc(REPORTS_COL, reportId, {
    status: data.status,
    resolution: data.resolution,
    resolvedBy: adminUid,
    resolvedAt: now,
    updatedAt: now,
  });

  logger.info('Question report resolved', {
    userId: adminUid,
    meta: { reportId, status: data.status, questionId: existing.questionId },
  });
}

// ── Count open reports per question ──────────────

export async function getOpenReportCount(questionId: string): Promise<number> {
  const db = getAdminDb();
  const snap = await db
    .collection(REPORTS_COL)
    .where('questionId', '==', questionId)
    .where('status', '==', 'open')
    .get();

  return snap.size;
}

// ── List reports by user ─────────────────────────

export async function listUserReports(
  uid: string,
  limit = 20
): Promise<QuestionReport[]> {
  const db = getAdminDb();
  const snap = await db
    .collection(REPORTS_COL)
    .where('reportedBy', '==', uid)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as QuestionReport);
}

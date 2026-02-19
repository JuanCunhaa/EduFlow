/**
 * ExamAnalyticsService — aggregated analytics and score tracking.
 * Extracted from exam-service to improve cohesion (exam-service focuses on lifecycle).
 */

import { getAdminDb } from '@/lib/firebase/admin';
import { listExams } from '@/services/exam-service';
import { getPerformanceSummary } from '@/services/performance-service';
import type { DomainScore } from '@/types';

// ── Types ────────────────────────────────────────

export interface AnalyticsData {
  totalExams: number;
  avgScore: number;
  passRate: number;
  scoreTrend: Array<{
    examId: string;
    score: number;
    studyId: string;
    date: string;
  }>;
  studyBreakdown: Record<string, { exams: number; avgScore: number }>;
  domainStats: Array<{
    domainId: string;
    domain: string;
    percentage: number;
    correct: number;
    total: number;
  }>;
  readiness: number;
}

// ── Analytics ────────────────────────────────────

export async function getAnalytics(
  uid: string,
  studyId?: string
): Promise<AnalyticsData> {
  const exams = await listExams({
    uid,
    studyId,
    limit: 50,
    status: 'completed',
  });

  const total = exams.length;
  const avg =
    total > 0
      ? Math.round(exams.reduce((sum, e) => sum + (e.score || 0), 0) / total)
      : 0;
  const passedCount = exams.filter((e) => (e.score || 0) >= 70).length;
  const passRate = total > 0 ? Math.round((passedCount / total) * 100) : 0;

  // Score trend (chronological)
  const trend = [...exams].reverse().map((e) => ({
    examId: e.id,
    score: e.score || 0,
    studyId: e.studyId,
    date: formatTimestamp(e.completedAt),
  }));

  // Study breakdown
  const studies: Record<string, { exams: number; scores: number[] }> = {};
  for (const exam of exams) {
    const sid = exam.studyId;
    if (!studies[sid]) studies[sid] = { exams: 0, scores: [] };
    studies[sid].exams++;
    studies[sid].scores.push(exam.score || 0);
  }
  const studyBreakdown: Record<string, { exams: number; avgScore: number }> =
    {};
  for (const [sid, data] of Object.entries(studies)) {
    studyBreakdown[sid] = {
      exams: data.exams,
      avgScore: Math.round(
        data.scores.reduce((a, b) => a + b, 0) / data.scores.length
      ),
    };
  }

  // Domain stats — prefer PerformanceSummary (single-doc read) over re-aggregation
  let domainStats: AnalyticsData['domainStats'] = [];
  const studyIdsForSummary = studyId ? [studyId] : Object.keys(studies);

  if (studyIdsForSummary.length > 0) {
    const domainAgg: Record<
      string,
      { domainId: string; domain: string; correct: number; total: number }
    > = {};
    let usedSummary = false;

    for (const sid of studyIdsForSummary) {
      const summary = await getPerformanceSummary(uid, sid);
      if (summary) {
        usedSummary = true;
        for (const [domainId, acc] of Object.entries(summary.domainAccuracy)) {
          if (!domainAgg[domainId]) {
            domainAgg[domainId] = {
              domainId,
              domain: domainId,
              correct: 0,
              total: 0,
            };
          }
          domainAgg[domainId].correct += acc.correct;
          domainAgg[domainId].total += acc.total;
        }
      }
    }

    // Fallback: aggregate from exam domainScores if no summaries found
    if (!usedSummary) {
      for (const exam of exams) {
        if (exam.domainScores) {
          for (const [domainId, ds] of Object.entries(exam.domainScores)) {
            if (!domainAgg[domainId]) {
              domainAgg[domainId] = {
                domainId,
                domain: ds.domain,
                correct: 0,
                total: 0,
              };
            }
            domainAgg[domainId].correct += ds.correct;
            domainAgg[domainId].total += ds.total;
          }
        }
      }
    }

    domainStats = Object.entries(domainAgg)
      .map(([, { domainId, domain, correct, total }]) => ({
        domainId,
        domain,
        percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
        correct,
        total,
      }))
      .sort((a, b) => a.percentage - b.percentage);
  }

  const readiness =
    domainStats.length > 0
      ? Math.round(
          domainStats.reduce((sum, d) => sum + d.percentage, 0) /
            domainStats.length
        )
      : 0;

  return {
    totalExams: total,
    avgScore: avg,
    passRate,
    scoreTrend: trend,
    studyBreakdown,
    domainStats,
    readiness,
  };
}

// ── Average Score Recalculation ──────────────────

/** Recalculate averageScore from actual exam history to prevent drift */
export async function recalculateAverageScore(uid: string): Promise<void> {
  const db = getAdminDb();
  const historySnap = await db
    .collection(`users/${uid}/examHistory`)
    .orderBy('completedAt', 'desc')
    .limit(100)
    .get();

  if (historySnap.empty) return;

  let totalScore = 0;
  let count = 0;
  for (const doc of historySnap.docs) {
    const data = doc.data();
    if (typeof data.score === 'number') {
      totalScore += data.score;
      count++;
    }
  }

  if (count > 0) {
    await db
      .collection('users')
      .doc(uid)
      .set(
        {
          averageScore: Math.round(totalScore / count),
          examsTaken: count,
        },
        { merge: true }
      );
  }
}

// ── Helpers ──────────────────────────────────────

function formatTimestamp(ts: unknown): string {
  if (!ts) return '';
  const date =
    typeof ts === 'object' && ts !== null && 'seconds' in ts
      ? new Date((ts as { seconds: number }).seconds * 1000)
      : new Date(ts as string);
  return date.toISOString().split('T')[0];
}

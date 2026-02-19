/**
 * ContentQualityService — coverage scoring, difficulty recalibration,
 * and question lifecycle management.
 *
 * Implements the data moat from content-moat-strategy.md:
 * - Coverage score calculation per cert
 * - Difficulty recalibration from cross-user performance data
 * - Question lifecycle transitions (active → flagged → archived)
 * - Post-publish monitoring thresholds
 */

import { getAdminDb } from '@/lib/firebase/admin';
import {
  adminGetDoc,
  adminUpdateDoc,
  serverTimestamp,
} from '@/lib/firebase/admin-firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import {
  MIN_QUESTIONS_PER_DOMAIN,
  COVERAGE_FULL_THRESHOLD,
  COVERAGE_GOOD_THRESHOLD,
  RECALIBRATION_MIN_ATTEMPTS,
  CALIBRATED_DIFFICULTY_EASY_THRESHOLD,
  CALIBRATED_DIFFICULTY_HARD_THRESHOLD,
  MONITORING_TOO_EASY_THRESHOLD,
  MONITORING_TOO_HARD_THRESHOLD,
  MONITORING_HIGH_SKIP_THRESHOLD,
} from '@/lib/constants';
import {
  logQuestionFlagged,
  logQuestionArchived,
} from '@/services/content-audit-service';
import type {
  MarketplaceStudy,
  MarketplaceQuestion,
  Difficulty,
  CoverageBadge,
  DomainCoverage,
  CertCoverage,
  RecalibrationResult,
  QuestionPerformanceStats,
  QuestionLifecycle,
} from '@/types';

// ── Collection paths ─────────────────────────────

const STUDIES_COL = 'marketplace_studies';
const QUESTIONS_COL = 'marketplace_questions';

// ═══════════════════════════════════════════════════
// COVERAGE SCORE
// ═══════════════════════════════════════════════════

/**
 * Calculate coverage score for a marketplace study.
 * coverage = min(domain_counts) / target_per_domain
 */
export async function calculateCoverage(
  studyId: string
): Promise<CertCoverage> {
  const study = await adminGetDoc<MarketplaceStudy>(STUDIES_COL, studyId);
  if (!study) {
    throw new Error(`Study ${studyId} not found`);
  }

  const certId = study.abbreviation.toLowerCase();
  const targetPerDomain =
    MIN_QUESTIONS_PER_DOMAIN[certId] ?? MIN_QUESTIONS_PER_DOMAIN.default;

  const domains: DomainCoverage[] = study.domains.map((d) => {
    const count = study.domainQuestionCounts[d.id] ?? 0;
    return {
      domainId: d.id,
      domainName: d.name,
      questionCount: count,
      target: targetPerDomain,
      percentage: targetPerDomain > 0 ? (count / targetPerDomain) * 100 : 0,
    };
  });

  const minCount = Math.min(...domains.map((d) => d.questionCount));
  const overallScore = targetPerDomain > 0 ? minCount / targetPerDomain : 0;

  let badge: CoverageBadge;
  if (overallScore >= COVERAGE_FULL_THRESHOLD) {
    badge = 'full';
  } else if (overallScore >= COVERAGE_GOOD_THRESHOLD) {
    badge = 'good';
  } else {
    badge = 'partial';
  }

  const totalQuestions = domains.reduce((sum, d) => sum + d.questionCount, 0);

  return {
    certId,
    badge,
    overallScore: Math.round(overallScore * 100) / 100,
    domains,
    totalQuestions,
  };
}

// ═══════════════════════════════════════════════════
// DIFFICULTY RECALIBRATION
// ═══════════════════════════════════════════════════

/**
 * Calibrate difficulty for a single question based on cross-user performance.
 *
 * Thresholds (from question-quality-standard.md §6.2):
 *   >80% correct → Easy
 *    40-80% correct → Medium
 *   <40% correct → Hard
 */
export function calibrateDifficulty(
  correctRate: number,
  totalAttempts: number
): Difficulty | null {
  if (totalAttempts < RECALIBRATION_MIN_ATTEMPTS) {
    return null; // Not enough data
  }

  if (correctRate > CALIBRATED_DIFFICULTY_EASY_THRESHOLD) {
    return 'easy';
  } else if (correctRate < CALIBRATED_DIFFICULTY_HARD_THRESHOLD) {
    return 'hard';
  }
  return 'medium';
}

/**
 * Recalibrate difficulty for all questions in a study.
 * Returns list of questions whose calibrated difficulty differs from author-assigned.
 */
export async function recalibrateStudyDifficulty(
  studyId: string
): Promise<RecalibrationResult[]> {
  const db = getAdminDb();
  const results: RecalibrationResult[] = [];

  const snap = await db
    .collection(QUESTIONS_COL)
    .where('studyId', '==', studyId)
    .where('isActive', '==', true)
    .get();

  for (const doc of snap.docs) {
    const q = { id: doc.id, ...doc.data() } as MarketplaceQuestion;
    const stats = q.performanceStats;

    if (!stats || stats.totalAttempts < RECALIBRATION_MIN_ATTEMPTS) {
      continue;
    }

    const correctRate =
      stats.totalAttempts > 0 ? stats.correctCount / stats.totalAttempts : 0;

    const calibrated = calibrateDifficulty(correctRate, stats.totalAttempts);
    if (!calibrated) continue;

    const changed = calibrated !== q.difficulty;

    results.push({
      questionId: q.id,
      authorDifficulty: q.difficulty,
      calibratedDifficulty: calibrated,
      correctRate: Math.round(correctRate * 100) / 100,
      totalAttempts: stats.totalAttempts,
      changed,
    });

    // Update calibrated difficulty on the question
    if (changed) {
      await adminUpdateDoc(QUESTIONS_COL, q.id, {
        'performanceStats.calibratedDifficulty': calibrated,
        updatedAt: serverTimestamp(),
      });
    }
  }

  logger.info('Study difficulty recalibration complete', {
    meta: {
      studyId,
      total: results.length,
      changed: results.filter((r) => r.changed).length,
    },
  });

  return results;
}

// ═══════════════════════════════════════════════════
// CROSS-USER PERFORMANCE AGGREGATION
// ═══════════════════════════════════════════════════

/**
 * Update aggregated performance stats for a marketplace question.
 * Called after each exam submission to accumulate cross-user data.
 */
export async function updateQuestionPerformanceStats(
  marketplaceQuestionId: string,
  isCorrect: boolean,
  selectedOptionIndex: number,
  timeSpentMs: number,
  skipped: boolean
): Promise<void> {
  const db = getAdminDb();
  const ref = db.collection(QUESTIONS_COL).doc(marketplaceQuestionId);

  const updates: Record<string, unknown> = {
    'performanceStats.totalAttempts': FieldValue.increment(1),
    'performanceStats.lastUpdatedAt': Date.now(),
  };

  if (isCorrect) {
    updates['performanceStats.correctCount'] = FieldValue.increment(1);
  }

  if (skipped) {
    updates['performanceStats.skipCount'] = FieldValue.increment(1);
  }

  // Track which option was selected
  const optionLabels = ['A', 'B', 'C', 'D', 'E'];
  const label = optionLabels[selectedOptionIndex];
  if (label) {
    updates[`performanceStats.optionDistribution.${label}`] =
      FieldValue.increment(1);
  }

  // Running average for time
  // We use a simple incremental approach: store sum and count, compute avg on read
  updates['performanceStats._totalTimeMs'] = FieldValue.increment(timeSpentMs);

  try {
    await ref.update(updates);
  } catch {
    // Question might not exist in marketplace (user's personal question)
    // This is expected and non-critical
  }
}

/**
 * Recompute derived fields (correctRate, avgTimeMs) for a question.
 * Called periodically or on-demand.
 */
export async function recomputeQuestionStats(
  questionId: string
): Promise<void> {
  const doc = await adminGetDoc<
    MarketplaceQuestion & {
      performanceStats?: QuestionPerformanceStats & { _totalTimeMs?: number };
    }
  >(QUESTIONS_COL, questionId);
  if (!doc?.performanceStats) return;

  const stats = doc.performanceStats;
  const totalAttempts = stats.totalAttempts || 0;
  const correctCount = stats.correctCount || 0;
  const totalTimeMs =
    ((stats as unknown as Record<string, unknown>)._totalTimeMs as number) || 0;

  const correctRate =
    totalAttempts > 0 ? (correctCount / totalAttempts) * 100 : 0;
  const avgTimeMs = totalAttempts > 0 ? totalTimeMs / totalAttempts : 0;
  const calibrated = calibrateDifficulty(correctRate / 100, totalAttempts);

  await adminUpdateDoc(QUESTIONS_COL, questionId, {
    'performanceStats.correctRate': Math.round(correctRate * 100) / 100,
    'performanceStats.avgTimeMs': Math.round(avgTimeMs),
    ...(calibrated
      ? { 'performanceStats.calibratedDifficulty': calibrated }
      : {}),
    updatedAt: serverTimestamp(),
  });
}

// ═══════════════════════════════════════════════════
// QUESTION LIFECYCLE MANAGEMENT
// ═══════════════════════════════════════════════════

/**
 * Transition a marketplace question through its lifecycle.
 * Follows the pipeline from content-pipeline.md §6.3:
 *   active → flagged → archived / revised → re-published
 */
export async function updateQuestionLifecycle(
  questionId: string,
  newLifecycle: QuestionLifecycle,
  adminUid: string,
  reason?: string
): Promise<void> {
  const existing = await adminGetDoc<MarketplaceQuestion>(
    QUESTIONS_COL,
    questionId
  );
  if (!existing) throw new Error(`Question ${questionId} not found`);

  const currentLifecycle = existing.lifecycle ?? 'active';

  // Validate transitions
  const validTransitions: Record<string, QuestionLifecycle[]> = {
    active: ['flagged', 'archived'],
    flagged: ['active', 'archived', 'revised'],
    archived: [], // Terminal state (can only be manually overridden)
    revised: ['active'], // Re-publish after revision
  };

  const allowed = validTransitions[currentLifecycle] ?? [];
  if (!allowed.includes(newLifecycle)) {
    throw new Error(
      `Invalid lifecycle transition: ${currentLifecycle} → ${newLifecycle}. ` +
        `Allowed: ${allowed.join(', ') || 'none'}`
    );
  }

  const updates: Record<string, unknown> = {
    lifecycle: newLifecycle,
    updatedAt: serverTimestamp(),
  };

  // If archiving, also set isActive = false
  if (newLifecycle === 'archived') {
    updates.isActive = false;
  }

  // If reactivating from flagged/revised, ensure isActive = true
  if (newLifecycle === 'active') {
    updates.isActive = true;
  }

  await adminUpdateDoc(QUESTIONS_COL, questionId, updates);

  // Log audit
  if (newLifecycle === 'flagged') {
    await logQuestionFlagged(
      adminUid,
      questionId,
      existing.studyId,
      reason ?? 'Flagged for review'
    );
  } else if (newLifecycle === 'archived') {
    await logQuestionArchived(
      adminUid,
      questionId,
      existing.studyId,
      reason ?? 'Archived'
    );
  }

  logger.info('Question lifecycle updated', {
    meta: { questionId, from: currentLifecycle, to: newLifecycle, reason },
  });
}

// ═══════════════════════════════════════════════════
// POST-PUBLISH MONITORING
// ═══════════════════════════════════════════════════

export interface MonitoringAlert {
  questionId: string;
  studyId: string;
  alertType: 'too_easy' | 'too_hard' | 'high_skip' | 'reported';
  value: number;
  threshold: number;
  message: string;
}

/**
 * Scan all active questions in a study for monitoring threshold violations.
 * Returns alerts for questions that need human review.
 */
export async function monitorStudyQuestions(
  studyId: string
): Promise<MonitoringAlert[]> {
  const db = getAdminDb();
  const alerts: MonitoringAlert[] = [];

  const snap = await db
    .collection(QUESTIONS_COL)
    .where('studyId', '==', studyId)
    .where('isActive', '==', true)
    .get();

  for (const doc of snap.docs) {
    const q = { id: doc.id, ...doc.data() } as MarketplaceQuestion;
    const stats = q.performanceStats;

    if (!stats || stats.totalAttempts < RECALIBRATION_MIN_ATTEMPTS) {
      continue;
    }

    const correctRate =
      stats.totalAttempts > 0 ? stats.correctCount / stats.totalAttempts : 0;

    // Too easy: >95% correct
    if (correctRate > MONITORING_TOO_EASY_THRESHOLD) {
      alerts.push({
        questionId: q.id,
        studyId: q.studyId,
        alertType: 'too_easy',
        value: Math.round(correctRate * 100),
        threshold: MONITORING_TOO_EASY_THRESHOLD * 100,
        message: `${Math.round(correctRate * 100)}% correct rate — consider harder distractors or reclassify`,
      });
    }

    // Too hard: <15% correct
    if (correctRate < MONITORING_TOO_HARD_THRESHOLD) {
      alerts.push({
        questionId: q.id,
        studyId: q.studyId,
        alertType: 'too_hard',
        value: Math.round(correctRate * 100),
        threshold: MONITORING_TOO_HARD_THRESHOLD * 100,
        message: `${Math.round(correctRate * 100)}% correct rate — may be ambiguous or incorrect`,
      });
    }

    // High skip rate
    const skipRate =
      stats.totalAttempts > 0 ? stats.skipCount / stats.totalAttempts : 0;

    if (skipRate > MONITORING_HIGH_SKIP_THRESHOLD) {
      alerts.push({
        questionId: q.id,
        studyId: q.studyId,
        alertType: 'high_skip',
        value: Math.round(skipRate * 100),
        threshold: MONITORING_HIGH_SKIP_THRESHOLD * 100,
        message: `${Math.round(skipRate * 100)}% skip rate — confusing stem`,
      });
    }

    // Reported
    if (stats.reportCount > 0) {
      alerts.push({
        questionId: q.id,
        studyId: q.studyId,
        alertType: 'reported',
        value: stats.reportCount,
        threshold: 1,
        message: `${stats.reportCount} report(s) — immediate manual review needed`,
      });
    }
  }

  logger.info('Study monitoring scan complete', {
    meta: { studyId, questionsScanned: snap.size, alerts: alerts.length },
  });

  return alerts;
}

// ═══════════════════════════════════════════════════
// DISTRACTOR ANALYSIS
// ═══════════════════════════════════════════════════

export interface DistractorInsight {
  questionId: string;
  optionDistribution: Record<string, number>;
  /** The most commonly selected wrong answer */
  mostCommonWrongAnswer: string;
  /** Percentage who selected the most common wrong answer */
  mostCommonWrongPct: number;
  /** Whether the question has evenly distributed wrong answers (sign of good distractors) */
  wellDistributed: boolean;
}

/**
 * Analyze distractor effectiveness for questions in a study.
 * Identifies which wrong answers attract the most selections.
 */
export async function analyzeDistractors(
  studyId: string
): Promise<DistractorInsight[]> {
  const db = getAdminDb();
  const insights: DistractorInsight[] = [];

  const snap = await db
    .collection(QUESTIONS_COL)
    .where('studyId', '==', studyId)
    .where('isActive', '==', true)
    .get();

  for (const doc of snap.docs) {
    const q = { id: doc.id, ...doc.data() } as MarketplaceQuestion;
    const stats = q.performanceStats;

    if (!stats?.optionDistribution || stats.totalAttempts < 20) {
      continue;
    }

    const dist = stats.optionDistribution;
    const optionLabels = ['A', 'B', 'C', 'D', 'E'];
    const correctLabel = optionLabels[q.correctOptionIndex];

    // Find most common wrong answer
    let maxWrong = '';
    let maxWrongCount = 0;
    let totalWrong = 0;

    for (const [label, count] of Object.entries(dist)) {
      if (label === correctLabel) continue;
      totalWrong += count;
      if (count > maxWrongCount) {
        maxWrongCount = count;
        maxWrong = label;
      }
    }

    const mostCommonWrongPct =
      totalWrong > 0 ? (maxWrongCount / totalWrong) * 100 : 0;

    // Check distribution: if one wrong answer gets >60% of wrong selections,
    // the other distractors are too weak
    const wellDistributed = mostCommonWrongPct < 60;

    insights.push({
      questionId: q.id,
      optionDistribution: dist,
      mostCommonWrongAnswer: maxWrong,
      mostCommonWrongPct: Math.round(mostCommonWrongPct),
      wellDistributed,
    });
  }

  return insights;
}

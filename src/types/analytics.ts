/**
 * Analytics event schemas and aggregation types.
 * Implements: docs/specs/3 analytics/event-tracking-schema.md
 *             docs/specs/3 analytics/cross-user-analytics.md
 *             docs/specs/3 analytics/privacy-anonymization.md
 */

// ── Event Categories ────────────────────────────

export type EventCategory = 'exam' | 'question' | 'navigation' | 'billing';

// ── Common Properties ───────────────────────────

export interface EventCommon {
  /** HMAC-SHA256 hash of uid — never store raw uid in analytics */
  anonId: string;
  /** Random session ID (rotated per browser session) */
  sessionId: string;
  /** ISO-8601 timestamp */
  timestamp: string;
  /** Certification ID (e.g. 'cissp', 'cc') */
  certId: string;
  /** Client locale */
  locale: string;
  /** Event schema version for forward compatibility */
  schemaVersion: number;
}

// ── Event Schemas ───────────────────────────────

/** Batched answers submitted at exam completion */
export interface ExamAnswersBatchEvent extends EventCommon {
  category: 'exam';
  action: 'answers_batch';
  examId: string;
  studyId: string;
  mode: string;
  answers: Array<{
    questionId: string;
    selectedIndex: number | null;
    correct: boolean;
    timeMs: number;
    difficulty: string;
    domainIds: string[];
  }>;
  score: number;
  totalQuestions: number;
  timeSpentSeconds: number;
}

/** Exam started event */
export interface ExamStartedEvent extends EventCommon {
  category: 'exam';
  action: 'started';
  examId: string;
  studyId: string;
  mode: string;
  questionCount: number;
  timeLimitMinutes: number;
}

/** Exam abandoned event */
export interface ExamAbandonedEvent extends EventCommon {
  category: 'exam';
  action: 'abandoned';
  examId: string;
  studyId: string;
  answeredCount: number;
  totalQuestions: number;
  timeSpentSeconds: number;
}

/** Question reported by user */
export interface QuestionReportedEvent extends EventCommon {
  category: 'question';
  action: 'reported';
  questionId: string;
  studyId: string;
  reason: string;
}

/** Union of all analytics events */
export type AnalyticsEvent =
  | ExamAnswersBatchEvent
  | ExamStartedEvent
  | ExamAbandonedEvent
  | QuestionReportedEvent;

// ── Aggregation Types ───────────────────────────

/** Per-question aggregated stats (Firestore: analytics/questions/{questionId}) */
export interface AggregatedQuestionStats {
  questionId: string;
  certId: string;
  domainIds: string[];
  totalAttempts: number;
  correctCount: number;
  correctRate: number;
  /** Distribution of selected options: { "0": 120, "1": 340, "2": 50, "3": 90 } */
  optionDistribution: Record<string, number>;
  avgTimeMs: number;
  skipCount: number;
  reportCount: number;
  /** Calibrated difficulty based on correctRate thresholds */
  calibratedDifficulty: 'easy' | 'medium' | 'hard';
  /** Number of unique users (anonIds) who attempted — for K-anonymity */
  uniqueUsers: number;
  lastUpdatedAt: number;
}

/** Per-domain aggregated stats (Firestore: analytics/domains/{certId}_{domainId}) */
export interface AggregatedDomainStats {
  certId: string;
  domainId: string;
  totalAttempts: number;
  correctRate: number;
  avgTimePerQuestion: number;
  questionCount: number;
  /** Hardest questions by correctRate (bottom 5) */
  hardestQuestionIds: string[];
  uniqueUsers: number;
  lastUpdatedAt: number;
}

/** Cohort statistics for readiness comparison */
export interface CohortStats {
  certId: string;
  /** Sample size — only expose if >= K_THRESHOLD */
  sampleSize: number;
  avgReadiness: number;
  readinessPercentiles: { p25: number; p50: number; p75: number; p90: number };
  avgScore: number;
  avgTimePerQuestion: number;
  lastUpdatedAt: number;
}

// ── Privacy Constants ───────────────────────────

/** Minimum number of unique users before exposing aggregated data */
export const K_ANONYMITY_THRESHOLD = 5;

/** Schema version for current event format */
export const CURRENT_SCHEMA_VERSION = 1;

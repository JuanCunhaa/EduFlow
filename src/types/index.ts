import type { Timestamp } from 'firebase/firestore';

// === Enums & Literals ===

export type Difficulty = 'easy' | 'medium' | 'hard';

export type ExamStatus = 'in_progress' | 'completed' | 'abandoned';

export type ExamMode = 'practice' | 'weak_domains' | 'recent_misses' | 'real_mix' | 'domain_focus' | 'spaced_review';

// === Study ===

export interface StudyDomain {
    id: string;           // short ID, e.g. "d1"
    abbreviation: string; // e.g. "SAM"
    name: string;         // e.g. "Security and Risk Management"
    order: number;
}

export interface Study {
    id: string;
    abbreviation: string;    // e.g. "CISSP", "AWS-SAA"
    name: string;            // e.g. "Certified Information Systems Security Professional"
    domains: StudyDomain[];
    questionCount: number;   // denormalized counter
    examCount: number;       // denormalized counter
    accentColor?: string;    // optional hex accent color for visual differentiation
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// === Question ===

export interface Option {
    label: string; // "A", "B", "C", "D", optionally "E"
    text: string;
}

/** Structured explanation for a question */
export interface Explanation {
    /** Concise reason why the correct answer is correct */
    short: string;
    /** Per-option reasoning keyed by label (e.g. "A", "B"). Correct option may be omitted. */
    whyOthersWrong: Record<string, string>;
}

export interface Question {
    id: string;
    studyId: string;
    domainIds: string[];              // always an array (replaces domain + domainNumber)
    text: string;
    options: Option[];                // 4 or 5 items
    correctOptionIndex: number;       // 0–3 or 0–4
    explanation: Explanation;
    difficulty: Difficulty;
    tags: string[];
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

/** Question as sent to the client during an active exam (no correct answer) */
export type ExamQuestion = Omit<Question, 'correctOptionIndex' | 'explanation'>;

// === Exam ===

export interface ExamConfig {
    questionCount: number;
    timeLimitMinutes: number;     // 0 = untimed
    domainIds: string[];          // empty = all domains
    difficulty: Difficulty | 'all';
    mode: ExamMode;
}

export interface DomainScore {
    domainId: string;
    domain: string;       // display name
    correct: number;
    total: number;
    percentage: number;
}

export interface Exam {
    id: string;
    userId: string;
    studyId: string;
    status: ExamStatus;
    config: ExamConfig;
    questionIds: string[];
    answers: Record<string, number | null>; // questionId → selectedOptionIndex
    score: number | null;
    domainScores: Record<string, DomainScore>;
    startedAt: Timestamp;
    completedAt: Timestamp | null;
    timeSpentSeconds: number;
}

// === User ===

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    photoURL: string | null;
    activeStudyId: string | null;
    examsTaken: number;
    averageScore: number;
    createdAt: Timestamp;
    lastActiveAt: Timestamp;
}

export interface ExamAttemptSummary {
    examId: string;
    studyId: string;
    score: number;
    questionCount: number;
    timeSpentSeconds: number;
    completedAt: Timestamp;
}

// === Retention / Stats ===

export interface DailyRecord {
    date: string;           // "2026-02-11"
    questionsAnswered: number;
    correctAnswers: number;
    examsCompleted: number;
}

export interface UserStats {
    currentStreak: number;
    longestStreak: number;
    lastActiveDate: string;           // "2026-02-11"
    totalQuestionsAnswered: number;
    totalExamsCompleted: number;
    dailyGoal: number;                // questions per day (default 10)
    weeklyGoal: number;               // questions per week (default 50)
    badges: string[];                 // badge IDs earned
    recentDays: DailyRecord[];        // last 30 days (rolling)
}

export type BadgeId =
    | 'first_exam'
    | 'streak_3'
    | 'streak_7'
    | 'streak_30'
    | 'perfect_score'
    | 'centurion'
    | 'domain_master';

// === API ===

// === Performance Summary (Firestore: users/{uid}/performanceSummary/{studyId}) ===

/** Per-question attempt record stored in the performance summary */
export interface QuestionAttemptRecord {
    /** Number of times attempted */
    attempts: number;
    /** Number of times answered correctly */
    correct: number;
    /** Epoch ms of last attempt */
    lastAttemptAt: number;
    /** Was the last attempt correct? */
    lastCorrect: boolean;
    /** SM-2 ease factor (default 2.5, min 1.3) */
    easeFactor?: number;
    /** SM-2 interval in days */
    interval?: number;
    /** Epoch ms of next scheduled review */
    nextReviewAt?: number;
}

/**
 * Denormalized performance summary per study.
 * Single-doc read provides all data needed for smart exam strategies.
 * Updated atomically on exam submission.
 */
export interface PerformanceSummary {
    studyId: string;
    /** Per-domain aggregate: { [domainId]: { correct, total } } */
    domainAccuracy: Record<string, { correct: number; total: number }>;
    /** Per-question attempt history (only keeps last-seen data, not full history) */
    questionAttempts: Record<string, QuestionAttemptRecord>;
    /** Question IDs from the last N completed exams (flat set for repeat avoidance) */
    recentExamQuestionIds: string[];
    /** How many past exams contributed to recentExamQuestionIds */
    recentExamWindow: number;
    updatedAt: number; // epoch ms
}

// === Question Notes ===

export interface QuestionNote {
    questionId: string;
    note: string;
    updatedAt: number; // epoch ms
}

// === Marketplace ===

/** Domain with optional description for marketplace display */
export interface MarketplaceDomain extends StudyDomain {
    description?: string;
}

/** A study published in the global marketplace (not user-scoped) */
export interface MarketplaceStudy {
    id: string;
    abbreviation: string;
    name: string;
    description: string;
    domains: MarketplaceDomain[];
    questionCount: number;
    domainQuestionCounts: Record<string, number>;
    importCount: number;
    accentColor?: string;
    tags: string[];
    isActive: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    createdBy: string;
}

/** A question published in the global marketplace */
export interface MarketplaceQuestion {
    id: string;
    studyId: string;
    domainIds: string[];
    text: string;
    options: Option[];
    correctOptionIndex: number;
    explanation: Explanation;
    difficulty: Difficulty;
    tags: string[];
    isActive: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    createdBy: string;
}

/** Lineage metadata added to user docs after marketplace import */
export interface SourceMetadata {
    type: 'marketplace';
    marketplaceStudyId: string;
    importedAt: Timestamp;
    /** Domain IDs that were selected during import (study only) */
    importedDomainIds?: string[];
    /** Question count at time of import (study only) */
    marketplaceQuestionCount?: number;
    /** Original question ID in marketplace (question only) */
    marketplaceQuestionId?: string;
}

/** Result returned by the import operation */
export interface MarketplaceImportResult {
    studyId: string;
    importedQuestions: number;
    importedDomains: number;
}

// === API ===

// Re-export API types from dedicated module
export type { ApiResponse, ApiError, PaginatedResponse } from '@/types/api';

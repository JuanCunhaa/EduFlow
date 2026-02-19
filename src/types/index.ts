import type { Timestamp } from 'firebase/firestore';

// === Enums & Literals ===

export type Difficulty = 'easy' | 'medium' | 'hard';

export type ExamStatus = 'in_progress' | 'completed' | 'abandoned';

export type ExamMode =
  | 'practice'
  | 'weak_domains'
  | 'recent_misses'
  | 'real_mix'
  | 'domain_focus'
  | 'spaced_review';

// === Content Pipeline ===

export type ReviewStatus =
  | 'draft'
  | 'founder_reviewed'
  | 'expert_reviewed'
  | 'needs_revision'
  | 'approved'
  | 'published'
  | 'archived';

export type QuestionType = 'mcq' | 'ordering' | 'hotspot';

export type ContentAction =
  | 'created'
  | 'reviewed'
  | 'approved'
  | 'rejected'
  | 'imported'
  | 'archived'
  | 'edited'
  | 'flagged'
  | 'reported';

export type ReportReason =
  | 'wrong_answer'
  | 'ambiguous'
  | 'outdated'
  | 'duplicate'
  | 'unclear'
  | 'offensive'
  | 'other';

export type ReportStatus =
  | 'open'
  | 'reviewing'
  | 'resolved_fixed'
  | 'resolved_rejected'
  | 'resolved_archived';

export type QuestionLifecycle = 'active' | 'flagged' | 'archived' | 'revised';

export type CoverageBadge = 'full' | 'good' | 'partial';

// === Study ===

export interface StudyDomain {
  id: string; // short ID, e.g. "d1"
  abbreviation: string; // e.g. "SAM"
  name: string; // e.g. "Security and Risk Management"
  order: number;
}

export interface Study {
  id: string;
  abbreviation: string; // e.g. "CISSP", "AWS-SAA"
  name: string; // e.g. "Certified Information Systems Security Professional"
  domains: StudyDomain[];
  questionCount: number; // denormalized counter
  examCount: number; // denormalized counter
  accentColor?: string; // optional hex accent color for visual differentiation
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
  /** Optional exam-taking strategy tip */
  examTip?: string;
}

export interface Question {
  id: string;
  studyId: string;
  domainIds: string[]; // always an array (replaces domain + domainNumber)
  text: string;
  options: Option[]; // 4 or 5 items
  correctOptionIndex: number; // 0–3 or 0–4
  explanation: Explanation;
  difficulty: Difficulty;
  tags: string[];
  questionType?: QuestionType; // default: 'mcq'
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Question as sent to the client during an active exam (no correct answer) */
export type ExamQuestion = Omit<Question, 'correctOptionIndex' | 'explanation'>;

// === Exam ===

export interface ExamConfig {
  questionCount: number;
  timeLimitMinutes: number; // 0 = untimed
  domainIds: string[]; // empty = all domains
  difficulty: Difficulty | 'all';
  mode: ExamMode;
}

export interface DomainScore {
  domainId: string;
  domain: string; // display name
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
  /** Per-question time tracking in milliseconds (questionId → ms) */
  perQuestionTimeMs?: Record<string, number>;
}

// === Billing ===

export type PlanTier = 'free' | 'pro' | 'team';

export type StripeSubStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete';

export type PaywallFeature =
  | 'daily_exam_limit'
  | 'exam_question_limit'
  | 'advanced_exam_modes'
  | 'question_pool_limit'
  | 'analytics'
  | 'csv_export'
  | 'marketplace_import_limit'
  | 'question_creation_limit'
  | 'study_creation_limit'
  | 'bulk_import'
  | 'question_notes';

export interface BillingStatus {
  plan: PlanTier;
  status: StripeSubStatus | null;
  periodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  trial: boolean;
  trialEndsAt: number | null;
  isAdmin?: boolean;
}

export interface PaywallDetails {
  requiredPlan: PlanTier;
  feature: PaywallFeature;
  currentUsage?: number;
  limit?: number;
  upgradeUrl: string;
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

  // ── Billing ──
  plan: PlanTier;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeSubscriptionStatus: StripeSubStatus | null;
  planPeriodEnd: number | null; // epoch ms
  trialEndsAt: number | null; // epoch ms
  cancelAtPeriodEnd?: boolean;

  // ── Analytics & Beta ──
  /** User opted out of cross-user analytics */
  analyticsOptOut?: boolean;
  /** Active beta feature flags for this user */
  betaFlags?: string[];
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
  date: string; // "2026-02-11"
  questionsAnswered: number;
  correctAnswers: number;
  examsCompleted: number;
}

export interface UserStats {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string; // "2026-02-11"
  totalQuestionsAnswered: number;
  totalExamsCompleted: number;
  dailyGoal: number; // questions per day (default 10)
  weeklyGoal: number; // questions per week (default 50)
  badges: string[]; // badge IDs earned
  recentDays: DailyRecord[]; // last 30 days (rolling)
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
  /** Last selected option index (for distractor analysis) */
  lastSelectedIndex?: number;
  /** Distribution of selected options across attempts: { "0": 2, "1": 1, "3": 4 } */
  selectedDistribution?: Record<string, number>;
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

// === Readiness Score ===

export type ReadinessBand =
  | 'not_ready'
  | 'building'
  | 'getting_close'
  | 'likely_ready'
  | 'highly_ready';

export interface ReadinessFactor {
  value: number; // 0.0–1.0
  weight: number; // 0.0–1.0
}

export interface ReadinessResult {
  readiness: number; // 0–100
  band: ReadinessBand;
  trend: {
    direction: 'improving' | 'declining' | 'stable';
    delta: number;
    examsAnalyzed: number;
  };
  factors: {
    weightedDomainAccuracy: ReadinessFactor;
    recentScores: ReadinessFactor & { scores: number[] };
    hardQuestionAccuracy: ReadinessFactor;
    questionCoverage: ReadinessFactor & { attempted: number; total: number };
    weakDomainPenalty: ReadinessFactor & { weakDomains: string[] };
    trendBonus: ReadinessFactor;
    timeManagement: ReadinessFactor;
  };
}

// === Study Plan ===

export interface StudyPlan {
  studyId: string;
  generatedAt: number;
  targetReadiness: number;
  currentReadiness: number;
  entries: PlanEntry[];
  weakDomains: string[];
  spReviewDue: number;
  hardQuestionAccuracy: number;
  questionCoverage: number;
}

export interface PlanEntry {
  day: number;
  dayOfWeek: string;
  activity: PlanActivity;
  rationale: string;
  estimatedMinutes: number;
  examConfig: {
    mode: ExamMode;
    questionCount: number;
    timeLimitMinutes: number;
    difficulty: Difficulty | 'all';
    domainIds: string[];
  } | null;
}

export type PlanActivity =
  | { type: 'domain_focus'; domainId: string; domainName: string }
  | { type: 'weak_domains' }
  | { type: 'spaced_review'; questionsDue: number }
  | { type: 'hard_questions' }
  | { type: 'full_length_exam' }
  | { type: 'review_mistakes' }
  | { type: 'rest' };

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
  questionType?: QuestionType;
  isActive: boolean;
  lifecycle?: QuestionLifecycle;
  reviewStatus?: ReviewStatus;
  /** Aggregated cross-user performance data */
  performanceStats?: QuestionPerformanceStats;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

// === Question Performance (Cross-User Data) ===

/** Aggregated performance stats for a marketplace question */
export interface QuestionPerformanceStats {
  totalAttempts: number;
  correctCount: number;
  /** Percentage of users who answered correctly (0-100) */
  correctRate: number;
  /** Distribution of selected options: { "A": 120, "B": 340, "C": 50, "D": 90 } */
  optionDistribution: Record<string, number>;
  /** Average time spent in milliseconds */
  avgTimeMs: number;
  /** Number of times skipped */
  skipCount: number;
  /** Number of times reported */
  reportCount: number;
  /** Calibrated difficulty based on correctRate thresholds */
  calibratedDifficulty?: Difficulty;
  lastUpdatedAt: number; // epoch ms
}

// === Question Report ===

/** User-submitted report on a question quality issue */
export interface QuestionReport {
  id: string;
  questionId: string;
  /** Marketplace question ID (if reporting marketplace content) */
  marketplaceQuestionId?: string;
  studyId: string;
  reportedBy: string; // uid
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  /** Admin resolution notes */
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// === Content Audit Trail ===

/** Audit entry for content pipeline actions */
export interface ContentAuditEntry {
  id: string;
  action: ContentAction;
  actor: string; // uid or email
  batchId?: string; // links to content/cert/domain/batch-NNN.json
  studyId?: string;
  questionId?: string;
  questionCount?: number;
  notes?: string; // reviewer feedback, rejection reason, etc.
  metadata?: Record<string, unknown>;
  createdAt: Timestamp;
}

// === Content Batch (Staging) ===

/** Metadata for a content batch file */
export interface ContentBatchMetadata {
  certId: string;
  domainId: string;
  batchNumber: number;
  generatedAt: string; // ISO datetime
  generatedBy: string; // 'gpt-4o' | 'claude' | author email
  reviewedBy?: string;
  reviewedAt?: string;
  qaResult?: {
    passed: number;
    failed: number;
    warnings: number;
  };
}

export interface ContentBatch {
  metadata: ContentBatchMetadata;
  questions: ContentBatchQuestion[];
}

/** Question as it appears in a staging batch (pre-import) */
export interface ContentBatchQuestion {
  text: string;
  options: Option[];
  correctOptionIndex: number;
  explanation: Explanation;
  difficulty: Difficulty;
  domainIds: string[];
  tags: string[];
  questionType?: QuestionType;
  /** Review status in the pipeline */
  reviewStatus?: ReviewStatus;
  /** Quality rubric score (1-5 average across 6 dimensions) */
  qualityScore?: number;
  /** Reviewer notes */
  reviewNotes?: string;
}

// === Exam Objective Mapping ===

export interface ExamObjective {
  id: string; // e.g. "1.1"
  text: string;
  domain: string; // domain abbreviation
  questionCount: number;
  lastQuestionAdded?: string; // ISO date
}

export interface CertObjectiveMapping {
  certId: string;
  outlineVersion: string;
  lastChecked: string; // ISO date
  objectives: ExamObjective[];
}

// === Coverage Score ===

export interface DomainCoverage {
  domainId: string;
  domainName: string;
  questionCount: number;
  target: number;
  percentage: number;
}

export interface CertCoverage {
  certId: string;
  badge: CoverageBadge;
  overallScore: number; // min(domain_counts) / target_per_domain
  domains: DomainCoverage[];
  totalQuestions: number;
}

// === Difficulty Recalibration ===

export interface RecalibrationResult {
  questionId: string;
  authorDifficulty: Difficulty;
  calibratedDifficulty: Difficulty;
  correctRate: number;
  totalAttempts: number;
  changed: boolean;
}

// === Expert/Contributor ===

export interface ContentContributor {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'reviewer' | 'author';
  certifications?: string[]; // e.g. ['CISSP', 'CCSP']
  isActive: boolean;
  questionsReviewed?: number;
  questionsAuthored?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
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

// === SEO / Email Leads ===

export type CaptureSource =
  | 'cert-hub'
  | 'domain-page'
  | 'practice-quiz'
  | 'blog-post'
  | 'exit-intent'
  | 'in-app'
  | 'unknown';

export interface EmailLead {
  email: string;
  uid: string | null;
  source: CaptureSource;
  tags: string[];
  certInterest: string[];
  consent: boolean;
  status: 'active' | 'unsubscribed' | 'bounced';
  capturedAt: Date;
  lastEmailedAt: Date | null;
  convertedAt: Date | null;
}

// === Creator Marketplace ===

export type PackStatus =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'revision_needed'
  | 'approved'
  | 'published'
  | 'suspended'
  | 'archived';

export type CreatorVerificationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'needs_revision';

export interface CreatorProfile {
  uid: string;
  slug: string;
  displayName: string;
  bio: string;
  linkedinUrl: string;
  certificationsHeld: string[];
  yearsExperience: '1-3' | '3-5' | '5-10' | '10+';
  badges: string[];
  verificationStatus: CreatorVerificationStatus;
  packCount: number;
  totalSales: number;
  averageRating: number;
  payoutMethod: 'stripe_connect' | 'paypal';
  stripeConnectId: string | null;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreatorApplication {
  id: string;
  uid: string;
  fullName: string;
  email: string;
  linkedinUrl: string;
  certificationsHeld: string[];
  certProofUrl: string;
  yearsExperience: '1-3' | '3-5' | '5-10' | '10+';
  writingSample: string;
  bio: string;
  payoutMethod: 'stripe_connect' | 'paypal';
  agreedToTos: boolean;
  status: CreatorVerificationStatus;
  reviewNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: Timestamp | null;
  createdAt: Timestamp;
}

export interface QuestionPack {
  id: string;
  slug: string;
  certId: string;
  title: string;
  description: string;
  domains: MarketplaceDomain[];
  questionCount: number;
  domainQuestionCounts: Record<string, number>;
  sampleQuestionIds: string[];
  difficultyDistribution: { easy: number; medium: number; hard: number };
  tags: string[];
  creatorId: string;
  creatorSlug: string;
  creatorName: string;
  creatorBadges: string[];
  pricing: 'free' | 'paid';
  priceUsd: number;
  stripePriceId: string | null;
  stripeProductId: string | null;
  salesCount: number;
  totalRevenue: number;
  averageRating: number | null;
  reviewCount: number;
  status: PackStatus;
  submittedAt: Timestamp | null;
  publishedAt: Timestamp | null;
  rejectedAt: Timestamp | null;
  rejectionReason: string | null;
  isActive: boolean;
  version: number;
  accentColor?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PackReview {
  id: string;
  packId: string;
  reviewerUid: string;
  reviewerName: string;
  rating: number;
  text: string | null;
  isVerifiedPurchase: boolean;
  creatorResponse: string | null;
  creatorRespondedAt: Timestamp | null;
  reportCount: number;
  isHidden: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PackPurchase {
  id: string;
  packId: string;
  buyerUid: string;
  creatorId: string;
  priceAtPurchase: number;
  currency: string;
  stripePaymentIntentId: string | null;
  status: 'completed' | 'refunded' | 'disputed';
  refundedAt: Timestamp | null;
  purchasedAt: Timestamp;
}

// === Team / Organization ===

export type OrgRole = 'admin' | 'member';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  logo: string | null;
  accentColor: string | null;
  seatLimit: number;
  seatCount: number;
  certFocus: string[];
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface OrgMember {
  uid: string;
  orgId: string;
  role: OrgRole;
  displayName: string;
  email: string;
  joinedAt: Timestamp;
}

export interface OrgInvite {
  id: string;
  orgId: string;
  email: string;
  role: OrgRole;
  invitedBy: string;
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: Timestamp;
  createdAt: Timestamp;
}

// === Feedback ===

export type FeedbackCategory =
  | 'bug'
  | 'feature_request'
  | 'content_issue'
  | 'general';

export interface FeedbackEntry {
  id: string;
  uid: string;
  category: FeedbackCategory;
  rating: number; // 1-5
  text: string;
  page?: string; // URL path where feedback was submitted
  userAgent?: string;
  status: 'new' | 'reviewed' | 'resolved';
  adminNotes?: string;
  createdAt: Timestamp;
}

// === Pass-Rate Self-Reporting ===

export interface PassRateReport {
  id: string;
  uid: string;
  certId: string;
  passed: boolean;
  examDate?: string; // ISO date
  readinessAtTime?: number; // readiness score when they took the real exam
  notes?: string;
  createdAt: Timestamp;
}

// === Email Drip ===

export type DripSequenceId =
  | 'welcome'
  | 're_engagement'
  | 'cert_tips'
  | 'upgrade_nudge';

export interface DripStep {
  delayDays: number;
  templateId: string;
  subject: string;
  condition?: 'not_signed_up' | 'not_active_7d' | 'free_plan';
}

export interface DripSequence {
  id: DripSequenceId;
  name: string;
  trigger: 'email_capture' | 'signup' | 'inactivity' | 'manual';
  steps: DripStep[];
}

export interface DripEnrollment {
  id: string;
  email: string;
  uid: string | null;
  sequenceId: DripSequenceId;
  currentStep: number;
  status: 'active' | 'completed' | 'unsubscribed';
  nextSendAt: number; // epoch ms
  startedAt: Timestamp;
  completedAt: Timestamp | null;
}

// === API ===

// Re-export API types from dedicated module
export type { ApiResponse, ApiError, PaginatedResponse } from '@/types/api';

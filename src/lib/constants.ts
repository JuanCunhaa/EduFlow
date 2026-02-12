/**
 * Centralized application constants.
 * Domain-level magic numbers that affect business logic across services.
 */

// ── Exam Engine ──────────────────────────────────

/** Time-decay half-life in days for recent_misses weighting */
export const DECAY_HALF_LIFE_DAYS = 7;

/** λ for exponential decay: weight = e^(-λ * daysSinceAttempt) */
export const DECAY_LAMBDA = Math.LN2 / DECAY_HALF_LIFE_DAYS;

/** Proportion of weak-domain questions in weak_domains mode */
export const WEAK_DOMAIN_RATIO = 0.7;

/** Accuracy threshold below which a domain is considered "weak" */
export const WEAK_DOMAIN_THRESHOLD = 0.7;

/** Target difficulty distribution for real_mix mode */
export const REAL_MIX_DIFFICULTY: Record<string, number> = { easy: 0.2, medium: 0.5, hard: 0.3 };

/** Default number of recent exams to avoid repeats from */
export const RECENT_EXAM_WINDOW = 3;

// ── Exam Service ─────────────────────────────────

/** Grace period (seconds) added to timed exams for network latency */
export const GRACE_PERIOD_SECONDS = 30;

// ── Stats ────────────────────────────────────────

/** Number of questions in each daily challenge */
export const DAILY_CHALLENGE_COUNT = 5;

/** Rolling window (days) for activity heatmap */
export const HEATMAP_ROLLING_DAYS = 180;

// ── Rate Limits ──────────────────────────────────

/** Max exam creations per minute per user */
export const EXAM_CREATE_RATE_LIMIT = 5;

/** Max answer saves per minute per user */
export const ANSWER_SAVE_RATE_LIMIT = 60;

// ── Marketplace ──────────────────────────────────

/** Max marketplace imports per hour per user */
export const MARKETPLACE_IMPORT_RATE_LIMIT = 5;

/** Rate window for marketplace imports (1 hour) */
export const MARKETPLACE_IMPORT_RATE_WINDOW = 3_600_000;

/** Max marketplace browse requests per minute per user */
export const MARKETPLACE_BROWSE_RATE_LIMIT = 60;

/** Max marketplace admin writes per minute */
export const MARKETPLACE_ADMIN_RATE_LIMIT = 30;

/** Max questions per single marketplace import */
export const MARKETPLACE_IMPORT_MAX_QUESTIONS = 498;

/** Max domains selectable per import */
export const MARKETPLACE_IMPORT_MAX_DOMAINS = 10;

/** Firestore batch write limit (reserved 2 for study doc + marketplace counter update) */
export const FIRESTORE_BATCH_LIMIT = 500;

// ── Plan Limits (Free Tier) ─────────────────────

/** Max exams a free user can create per calendar day */
export const FREE_MAX_EXAMS_PER_DAY = 3;

/** Max questions per exam for free users */
export const FREE_MAX_QUESTIONS_PER_EXAM = 25;

/** Max questions per exam for Pro users */
export const PRO_MAX_QUESTIONS_PER_EXAM = 150;

/** Max questions accessible per study for free users */
export const FREE_MAX_QUESTIONS_PER_STUDY = 50;

/** Max personal questions a free user can create */
export const FREE_MAX_PERSONAL_QUESTIONS = 10;

/** Max studies a free user can create */
export const FREE_MAX_STUDIES = 2;

/** Max marketplace imports for free users */
export const FREE_MAX_MARKETPLACE_IMPORTS = 1;

/** Max marketplace domains per import for free users */
export const FREE_MAX_MARKETPLACE_IMPORT_DOMAINS = 2;

/** Max marketplace question previews per study for free users */
export const FREE_MAX_MARKETPLACE_QUESTION_PREVIEWS = 5;

/** Activity heatmap days for free users */
export const FREE_HEATMAP_DAYS = 30;

/** Exam modes available to free users */
export const FREE_EXAM_MODES: readonly string[] = ['practice', 'domain_focus'] as const;

/** Exam modes that require Pro */
export const PRO_EXAM_MODES: readonly string[] = ['real_mix', 'weak_domains', 'recent_misses', 'spaced_review'] as const;

/** All exam modes */
export const ALL_EXAM_MODES: readonly string[] = [...FREE_EXAM_MODES, ...PRO_EXAM_MODES] as const;

/** Trial period in days */
export const TRIAL_PERIOD_DAYS = 7;

/** Allowed Stripe price IDs (loaded from env vars) */
export function getAllowedPriceIds(): string[] {
    return [
        process.env.STRIPE_PRICE_PRO_MONTHLY,
        process.env.STRIPE_PRICE_PRO_ANNUAL,
        process.env.STRIPE_PRICE_TEAM_MONTHLY,
    ].filter((id): id is string => Boolean(id));
}

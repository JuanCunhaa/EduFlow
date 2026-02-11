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

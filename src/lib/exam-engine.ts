import type { Question, DomainScore, ExamConfig, ExamMode, Exam, PerformanceSummary, QuestionAttemptRecord } from '@/types';

// ── Public types for strategy data ──────────────

export interface StrategyPerformanceData {
    /** Aggregated domain scores (used by weak_domains) */
    domainScores?: Record<string, DomainScore>;
    /** Full performance summary (used by recent_misses & real_mix) */
    performanceSummary?: PerformanceSummary;
}

// ── Constants ───────────────────────────────────

/** Time-decay half-life in days for recent_misses weighting */
const DECAY_HALF_LIFE_DAYS = 7;
/** λ for exponential decay: weight = e^(-λ * daysSinceAttempt) */
const DECAY_LAMBDA = Math.LN2 / DECAY_HALF_LIFE_DAYS;
/** Proportion of weak-domain questions in weak_domains mode */
const WEAK_DOMAIN_RATIO = 0.7;
/** Accuracy threshold below which a domain is considered "weak" */
const WEAK_DOMAIN_THRESHOLD = 0.7;
/** Target difficulty distribution for real_mix mode */
const REAL_MIX_DIFFICULTY: Record<string, number> = { easy: 0.2, medium: 0.5, hard: 0.3 };
/** Default number of recent exams to avoid repeats from */
const RECENT_EXAM_WINDOW = 3;

/**
 * Select questions for an exam based on the configuration and mode.
 * Modes: practice, weak_domains, recent_misses, real_mix, domain_focus.
 */
export function selectQuestions(
    allQuestions: Question[],
    config: ExamConfig & { studyId: string },
    performanceData?: StrategyPerformanceData
): Question[] {
    // Filter by study
    let pool = allQuestions.filter((q) => q.studyId === config.studyId);

    // Filter by difficulty (except real_mix which handles its own distribution)
    if (config.difficulty !== 'all' && config.mode !== 'real_mix') {
        pool = pool.filter((q) => q.difficulty === config.difficulty);
    }

    // Filter by domains
    if (config.domainIds.length > 0) {
        pool = pool.filter((q) =>
            q.domainIds.some((did) => config.domainIds.includes(did))
        );
    }

    const requestedCount = Math.min(config.questionCount, pool.length);
    if (requestedCount === 0) return [];

    // Apply mode-specific strategy
    const selected = applyMode(pool, config.mode, requestedCount, performanceData);

    // Final shuffle so domains aren't grouped
    shuffleArray(selected);

    return selected.slice(0, requestedCount);
}

/**
 * Apply mode-specific question selection strategy.
 */
function applyMode(
    pool: Question[],
    mode: ExamMode,
    count: number,
    performanceData?: StrategyPerformanceData
): Question[] {
    switch (mode) {
        case 'weak_domains':
            return selectWeakDomains(pool, count, performanceData);

        case 'recent_misses':
            return selectRecentMisses(pool, count, performanceData);

        case 'real_mix':
            return selectRealMix(pool, count, performanceData);

        case 'domain_focus':
            shuffleArray(pool);
            return pool;

        case 'practice':
        default:
            return roundRobinSelect(pool, count);
    }
}

// ── Strategy: weak_domains ──────────────────────
//
// Algorithm:
// 1. Compute per-domain accuracy from performance summary.
// 2. Rank domains by accuracy (ascending) — weakest first.
// 3. Fill ~70% of the exam from weak domains (accuracy < 70%),
//    weighted inversely proportional to accuracy.
// 4. Fill remaining ~30% from random other-domain questions (diversity).
// 5. Within weak domains, prefer unattempted questions, then questions
//    the user has gotten wrong most often.

function selectWeakDomains(
    pool: Question[],
    count: number,
    performanceData?: StrategyPerformanceData
): Question[] {
    const summary = performanceData?.performanceSummary;
    const domainScores = performanceData?.domainScores;

    // Build domain accuracy map
    const domainAccuracy: Record<string, number> = {};

    if (summary?.domainAccuracy) {
        for (const [domainId, acc] of Object.entries(summary.domainAccuracy)) {
            domainAccuracy[domainId] = acc.total > 0 ? acc.correct / acc.total : 1;
        }
    } else if (domainScores) {
        for (const [domainId, ds] of Object.entries(domainScores)) {
            domainAccuracy[domainId] = ds.total > 0 ? ds.correct / ds.total : 1;
        }
    }

    if (Object.keys(domainAccuracy).length === 0) return roundRobinSelect(pool, count);

    // Identify weak domains
    const weakDomainIds = Object.entries(domainAccuracy)
        .filter(([, acc]) => acc < WEAK_DOMAIN_THRESHOLD)
        .sort((a, b) => a[1] - b[1]) // weakest first
        .map(([id]) => id);

    if (weakDomainIds.length === 0) return roundRobinSelect(pool, count);

    const weakSet = new Set(weakDomainIds);
    const weakPool = pool.filter(q => q.domainIds.some(d => weakSet.has(d)));
    const restPool = pool.filter(q => !q.domainIds.some(d => weakSet.has(d)));

    // Score weak-pool questions: prefer unattempted, then most-missed
    const attempts = summary?.questionAttempts ?? {};
    const scoredWeak = weakPool.map(q => ({
        question: q,
        score: computeWeakScore(q, domainAccuracy, attempts),
    }));

    // Sort descending by score (higher = more important to practice)
    scoredWeak.sort((a, b) => b.score - a.score);

    const weakCount = Math.min(Math.ceil(count * WEAK_DOMAIN_RATIO), scoredWeak.length);
    const diversityCount = count - weakCount;

    const selected = scoredWeak.slice(0, weakCount).map(s => s.question);

    // Fill diversity from rest
    shuffleArray(restPool);
    selected.push(...restPool.slice(0, diversityCount));

    return selected;
}

/** Score a question for weak_domains: higher = more important to practice */
function computeWeakScore(
    q: Question,
    domainAccuracy: Record<string, number>,
    attempts: Record<string, QuestionAttemptRecord>
): number {
    // Domain weakness factor: inverse accuracy (0..1) → (0..1)
    const primaryDomain = q.domainIds[0] || '_none';
    const accuracy = domainAccuracy[primaryDomain] ?? 1;
    const domainFactor = 1 - accuracy; // 0 = strong, 1 = very weak

    // Attempt factor
    const attempt = attempts[q.id];
    let attemptFactor: number;

    if (!attempt) {
        // Never attempted → high priority
        attemptFactor = 0.8;
    } else {
        // More misses → higher score
        const missRate = attempt.attempts > 0 ? 1 - (attempt.correct / attempt.attempts) : 0;
        attemptFactor = missRate * 0.6;
    }

    // Small random jitter to avoid deterministic ordering
    const jitter = Math.random() * 0.1;

    return domainFactor * 0.5 + attemptFactor * 0.4 + jitter;
}

// ── Strategy: recent_misses ─────────────────────
//
// Algorithm:
// 1. Read per-question attempt records from PerformanceSummary.
// 2. Filter to questions where lastCorrect = false (missed recently).
// 3. Apply exponential time-decay weighting: weight = e^(-λ * daysSinceMiss).
//    Recent misses get much higher weight.
// 4. Exclude questions the user got correct on their last 2 consecutive attempts
//    (they've "learned" it — avoid boring repeats).
// 5. Weighted random sampling from the scored pool.
// 6. Fill remaining slots with random questions.

function selectRecentMisses(
    pool: Question[],
    count: number,
    performanceData?: StrategyPerformanceData
): Question[] {
    const summary = performanceData?.performanceSummary;
    const attempts = summary?.questionAttempts;

    if (!attempts || Object.keys(attempts).length === 0) {
        return roundRobinSelect(pool, count);
    }

    const now = Date.now();
    const poolMap = new Map(pool.map(q => [q.id, q]));

    // Score each question
    interface ScoredQuestion { question: Question; weight: number }
    const missed: ScoredQuestion[] = [];
    const nonMissed: Question[] = [];

    for (const q of pool) {
        const attempt = attempts[q.id];

        if (!attempt) {
            // Never attempted — put in non-missed pool
            nonMissed.push(q);
            continue;
        }

        // Skip questions where user got last attempt correct (avoid immediate repeats)
        if (attempt.lastCorrect) {
            nonMissed.push(q);
            continue;
        }

        // Time-decay weight
        const daysSince = (now - attempt.lastAttemptAt) / (1000 * 60 * 60 * 24);
        const decayWeight = Math.exp(-DECAY_LAMBDA * daysSince);

        // Miss-rate factor
        const missRate = attempt.attempts > 0 ? 1 - (attempt.correct / attempt.attempts) : 0;

        // Combined weight: recent misses with high miss-rate get top priority
        const weight = decayWeight * 0.6 + missRate * 0.3 + Math.random() * 0.1;

        missed.push({ question: q, weight });
    }

    // Weighted sampling from missed pool
    const selected: Question[] = weightedSample(missed, Math.min(count, missed.length));

    // Fill remaining with non-missed (shuffled)
    if (selected.length < count) {
        shuffleArray(nonMissed);
        selected.push(...nonMissed.slice(0, count - selected.length));
    }

    return selected;
}

// ── Strategy: real_mix ──────────────────────────
//
// Algorithm:
// 1. Balanced domain distribution via round-robin.
// 2. Within each domain bucket, apply difficulty distribution:
//    20% easy / 50% medium / 30% hard (configurable).
// 3. Avoid questions from the last N (default 3) completed exams
//    using recentExamQuestionIds from PerformanceSummary.
// 4. If not enough questions after filtering repeats, relax the constraint.

function selectRealMix(
    pool: Question[],
    count: number,
    performanceData?: StrategyPerformanceData
): Question[] {
    const summary = performanceData?.performanceSummary;
    const recentIds = new Set(summary?.recentExamQuestionIds ?? []);

    // Separate into preferred (not recent) and fallback (recent) pools
    const preferred = pool.filter(q => !recentIds.has(q.id));
    const fallback = pool.filter(q => recentIds.has(q.id));

    // Use preferred pool first; if not enough, add fallback
    let workPool: Question[];
    if (preferred.length >= count) {
        workPool = preferred;
    } else {
        workPool = [...preferred, ...fallback];
    }

    // Group by primary domain
    const domainBuckets = new Map<string, Question[]>();
    for (const q of workPool) {
        const key = q.domainIds[0] || '_none';
        const bucket = domainBuckets.get(key) || [];
        bucket.push(q);
        domainBuckets.set(key, bucket);
    }

    // Within each bucket, sort by difficulty distribution
    for (const [key, bucket] of domainBuckets) {
        domainBuckets.set(key, sortByDifficultyDistribution(bucket));
    }

    // Round-robin pick across domains
    const selected: Question[] = [];
    const domainKeys = Array.from(domainBuckets.keys()).sort();
    let domainIndex = 0;

    while (selected.length < count && domainKeys.length > 0) {
        const domainKey = domainKeys[domainIndex % domainKeys.length];
        const bucket = domainBuckets.get(domainKey);

        if (bucket && bucket.length > 0) {
            selected.push(bucket.shift()!);
        } else {
            domainKeys.splice(domainIndex % domainKeys.length, 1);
            if (domainKeys.length === 0) break;
            continue;
        }
        domainIndex++;
    }

    return selected;
}

/**
 * Sort a question bucket to approximate the target difficulty distribution.
 * Groups by difficulty, then interleaves according to REAL_MIX_DIFFICULTY ratios.
 */
function sortByDifficultyDistribution(bucket: Question[]): Question[] {
    const byDifficulty: Record<string, Question[]> = { easy: [], medium: [], hard: [] };
    for (const q of bucket) {
        const d = q.difficulty || 'medium';
        (byDifficulty[d] || byDifficulty.medium).push(q);
    }

    // Shuffle within each difficulty
    for (const arr of Object.values(byDifficulty)) shuffleArray(arr);

    // Interleave: build ordering based on target ratios
    const total = bucket.length;
    const result: Question[] = [];
    const targets = {
        easy: Math.round(total * REAL_MIX_DIFFICULTY.easy),
        medium: Math.round(total * REAL_MIX_DIFFICULTY.medium),
        hard: Math.round(total * REAL_MIX_DIFFICULTY.hard),
    };

    // Take up to target per difficulty
    for (const diff of ['easy', 'medium', 'hard'] as const) {
        const take = Math.min(targets[diff], byDifficulty[diff].length);
        result.push(...byDifficulty[diff].splice(0, take));
    }

    // Fill remainder from whatever is left
    result.push(...byDifficulty.easy, ...byDifficulty.medium, ...byDifficulty.hard);

    shuffleArray(result);
    return result;
}

/**
 * Round-robin selection across domains for equal distribution.
 */
function roundRobinSelect(pool: Question[], count: number): Question[] {
    // Group by first domainId
    const domainBuckets = new Map<string, Question[]>();
    for (const q of pool) {
        const key = q.domainIds[0] || '_none';
        const bucket = domainBuckets.get(key) || [];
        bucket.push(q);
        domainBuckets.set(key, bucket);
    }

    // Shuffle each bucket
    for (const bucket of domainBuckets.values()) {
        shuffleArray(bucket);
    }

    // Round-robin pick
    const selected: Question[] = [];
    const domainKeys = Array.from(domainBuckets.keys()).sort();
    let domainIndex = 0;

    while (selected.length < count && domainKeys.length > 0) {
        const domainKey = domainKeys[domainIndex % domainKeys.length];
        const bucket = domainBuckets.get(domainKey);

        if (bucket && bucket.length > 0) {
            selected.push(bucket.shift()!);
        } else {
            domainKeys.splice(domainIndex % domainKeys.length, 1);
            if (domainKeys.length === 0) break;
            continue;
        }

        domainIndex++;
    }

    return selected;
}

/**
 * Score an exam by comparing answers to correct answers.
 */
export function scoreExam(
    questions: Question[],
    answers: Record<string, number | null>
): { score: number; domainScores: Record<string, DomainScore> } {
    const domainMap = new Map<string, { correct: number; total: number; domainId: string; domain: string }>();

    let totalCorrect = 0;

    for (const q of questions) {
        const answer = answers[q.id];
        const isCorrect = answer === q.correctOptionIndex;

        if (isCorrect) totalCorrect++;

        // Accumulate per primary domainId
        const primaryDomainId = q.domainIds[0] || '_none';
        const existing = domainMap.get(primaryDomainId) || {
            correct: 0,
            total: 0,
            domainId: primaryDomainId,
            domain: primaryDomainId,  // will be resolved to name at display time
        };

        existing.total++;
        if (isCorrect) existing.correct++;
        domainMap.set(primaryDomainId, existing);
    }

    const domainScores: Record<string, DomainScore> = {};
    for (const [key, val] of domainMap) {
        domainScores[key] = {
            domainId: val.domainId,
            domain: val.domain,
            correct: val.correct,
            total: val.total,
            percentage: val.total > 0 ? Math.round((val.correct / val.total) * 100) : 0,
        };
    }

    const score = questions.length > 0 ? Math.round((totalCorrect / questions.length) * 100) : 0;

    return { score, domainScores };
}

/**
 * Strip sensitive fields from questions for client-side display during an active exam.
 */
export function sanitizeQuestionsForExam(
    questions: Question[]
): Omit<Question, 'correctOptionIndex' | 'explanation' | 'whyOthersWrong'>[] {
    return questions.map(({ correctOptionIndex: _, explanation: __, whyOthersWrong: ___, ...rest }) => rest);
}

/**
 * Get the IDs of questions the user answered incorrectly in recent exams.
 */
export function getMissedQuestionIds(recentExams: Exam[], allQuestions: Question[]): string[] {
    const questionMap = new Map(allQuestions.map((q) => [q.id, q]));
    const missedIds = new Set<string>();

    for (const exam of recentExams) {
        if (exam.status !== 'completed') continue;
        for (const [qId, answer] of Object.entries(exam.answers)) {
            const question = questionMap.get(qId);
            if (question && answer !== question.correctOptionIndex) {
                missedIds.add(qId);
            }
        }
    }

    return Array.from(missedIds);
}

/**
 * Weighted random sampling without replacement.
 * Uses the "weighted reservoir" approach: pick items proportional to weight.
 */
function weightedSample<T>(
    items: Array<{ question: T; weight: number }>,
    count: number
): T[] {
    if (items.length === 0 || count === 0) return [];
    if (items.length <= count) return items.map(i => i.question);

    // Assign each item a key = random^(1/weight) for weighted reservoir sampling
    const keyed = items.map(item => ({
        question: item.question,
        key: Math.pow(Math.random(), 1 / Math.max(item.weight, 0.001)),
    }));

    // Sort descending by key, take top `count`
    keyed.sort((a, b) => b.key - a.key);
    return keyed.slice(0, count).map(k => k.question);
}

/**
 * Fisher-Yates shuffle (in-place).
 */
function shuffleArray<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

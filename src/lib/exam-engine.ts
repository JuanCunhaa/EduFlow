import type { Question, DomainScore, ExamConfig, ExamMode, Exam } from '@/types';

/**
 * Select questions for an exam based on the configuration and mode.
 * Modes: practice, weak_domains, missed_topics, real_mix, domain_focus.
 */
export function selectQuestions(
    allQuestions: Question[],
    config: ExamConfig & { studyId: string },
    performanceData?: { domainScores?: Record<string, DomainScore>; missedQuestionIds?: string[] }
): Question[] {
    // Filter by study
    let pool = allQuestions.filter((q) => q.studyId === config.studyId);

    // Filter by difficulty
    if (config.difficulty !== 'all') {
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

    // Apply mode-specific weighting/ordering
    pool = applyMode(pool, config.mode, requestedCount, performanceData);

    // Final shuffle so domains aren't grouped
    shuffleArray(pool);

    return pool.slice(0, requestedCount);
}

/**
 * Apply mode-specific question selection strategy.
 */
function applyMode(
    pool: Question[],
    mode: ExamMode,
    count: number,
    performanceData?: { domainScores?: Record<string, DomainScore>; missedQuestionIds?: string[] }
): Question[] {
    switch (mode) {
        case 'weak_domains': {
            if (!performanceData?.domainScores) return roundRobinSelect(pool, count);
            // Weight toward domains with low scores
            const weakDomains = Object.entries(performanceData.domainScores)
                .filter(([, score]) => score.percentage < 70)
                .map(([domainId]) => domainId);

            if (weakDomains.length === 0) return roundRobinSelect(pool, count);

            // Put weak-domain questions first, then fill with rest
            const weak = pool.filter((q) =>
                q.domainIds.some((did) => weakDomains.includes(did))
            );
            const rest = pool.filter((q) =>
                !q.domainIds.some((did) => weakDomains.includes(did))
            );
            shuffleArray(weak);
            shuffleArray(rest);
            return [...weak, ...rest];
        }

        case 'missed_topics': {
            if (!performanceData?.missedQuestionIds || performanceData.missedQuestionIds.length === 0) {
                return roundRobinSelect(pool, count);
            }
            const missedSet = new Set(performanceData.missedQuestionIds);
            const missed = pool.filter((q) => missedSet.has(q.id));
            const rest = pool.filter((q) => !missedSet.has(q.id));
            shuffleArray(missed);
            shuffleArray(rest);
            return [...missed, ...rest];
        }

        case 'real_mix': {
            // Proportional domain distribution — equal weight per domain
            return roundRobinSelect(pool, count);
        }

        case 'domain_focus': {
            // Already filtered by domainIds above, just shuffle
            shuffleArray(pool);
            return pool;
        }

        case 'practice':
        default:
            return roundRobinSelect(pool, count);
    }
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
 * Fisher-Yates shuffle (in-place).
 */
function shuffleArray<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

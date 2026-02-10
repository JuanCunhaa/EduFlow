import type { Question, DomainScore, ExamConfig } from '@/types';

/**
 * Select questions for an exam based on the configuration.
 * Aims for equal domain distribution with random shuffling.
 */
export function selectQuestions(
    allQuestions: Question[],
    config: ExamConfig & { certification: string }
): Question[] {
    // Filter by certification
    let pool = allQuestions.filter((q) => q.certification === config.certification);

    // Filter by difficulty
    if (config.difficulty !== 'all') {
        pool = pool.filter((q) => q.difficulty === config.difficulty);
    }

    // Filter by domains
    if (config.domains.length > 0) {
        pool = pool.filter((q) => config.domains.includes(q.domainNumber));
    }

    const requestedCount = Math.min(config.questionCount, pool.length);

    if (requestedCount === 0) return [];

    // Group by domain
    const domainBuckets = new Map<number, Question[]>();
    for (const q of pool) {
        const bucket = domainBuckets.get(q.domainNumber) || [];
        bucket.push(q);
        domainBuckets.set(q.domainNumber, bucket);
    }

    // Shuffle each bucket
    for (const bucket of domainBuckets.values()) {
        shuffleArray(bucket);
    }

    // Round-robin pick from each domain for equal distribution
    const selected: Question[] = [];
    const domainKeys = Array.from(domainBuckets.keys()).sort();
    let domainIndex = 0;

    while (selected.length < requestedCount) {
        const domainKey = domainKeys[domainIndex % domainKeys.length];
        const bucket = domainBuckets.get(domainKey);

        if (bucket && bucket.length > 0) {
            selected.push(bucket.shift()!);
        } else {
            // This domain is exhausted, remove it
            domainKeys.splice(domainIndex % domainKeys.length, 1);
            if (domainKeys.length === 0) break;
            continue;
        }

        domainIndex++;
    }

    // Final shuffle so domains aren't grouped
    shuffleArray(selected);

    return selected;
}

/**
 * Score an exam by comparing answers to correct answers.
 */
export function scoreExam(
    questions: Question[],
    answers: Record<string, number | null>
): { score: number; domainScores: Record<string, DomainScore> } {
    const domainMap = new Map<string, { correct: number; total: number; domain: string }>();

    let totalCorrect = 0;

    for (const q of questions) {
        const answer = answers[q.id];
        const isCorrect = answer === q.correctOptionIndex;

        if (isCorrect) totalCorrect++;

        const existing = domainMap.get(q.domain) || {
            correct: 0,
            total: 0,
            domain: q.domain,
        };

        existing.total++;
        if (isCorrect) existing.correct++;
        domainMap.set(q.domain, existing);
    }

    const domainScores: Record<string, DomainScore> = {};
    for (const [key, val] of domainMap) {
        domainScores[key] = {
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
): Omit<Question, 'correctOptionIndex' | 'explanation'>[] {
    return questions.map(({ correctOptionIndex: _, explanation: __, ...rest }) => rest);
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

import type { Exam } from '@/types';

/**
 * Format a Firestore Timestamp or date string for display.
 */
export function formatDate(ts: unknown): string {
    if (!ts) return '—';
    const date = typeof ts === 'object' && ts !== null && 'seconds' in ts
        ? new Date((ts as { seconds: number }).seconds * 1000)
        : new Date(ts as string);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Aggregate domain scores across completed exams.
 */
export function computeDomainStats(exams: Exam[]) {
    const aggregates: Record<string, { correct: number; total: number }> = {};

    for (const exam of exams) {
        if (exam.domainScores) {
            for (const [domain, ds] of Object.entries(exam.domainScores)) {
                if (!aggregates[domain]) {
                    aggregates[domain] = { correct: 0, total: 0 };
                }
                aggregates[domain].correct += ds.correct;
                aggregates[domain].total += ds.total;
            }
        }
    }

    return Object.entries(aggregates)
        .map(([domain, { correct, total }]) => ({
            domain,
            percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
            correct,
            total,
        }))
        .sort((a, b) => a.percentage - b.percentage);
}

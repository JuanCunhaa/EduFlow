/**
 * ReadinessService — computes a 0–100 readiness score from 7 weighted factors.
 *
 * V1: user-data-only, no cross-user aggregation.
 *
 * Factors:
 *   1. Weighted domain accuracy     (25%)
 *   2. Recent exam scores           (20%)
 *   3. Hard question accuracy        (15%)
 *   4. Question coverage             (15%)
 *   5. Weak domain penalty           (10%)
 *   6. Trend bonus                   (10%)
 *   7. Time management               (5%)
 */

import { getAdminDb } from '@/lib/firebase/admin';
import { listExams } from '@/services/exam-service';
import { getPerformanceSummary } from '@/services/performance-service';
import type { ReadinessResult, ReadinessBand, PerformanceSummary, Exam } from '@/types';

// ── Constants ───────────────────────────────────────

const WEIGHTS = {
    weightedDomainAccuracy: 0.25,
    recentScores: 0.20,
    hardQuestionAccuracy: 0.15,
    questionCoverage: 0.15,
    weakDomainPenalty: 0.10,
    trendBonus: 0.10,
    timeManagement: 0.05,
} as const;

const WEAK_DOMAIN_THRESHOLD = 0.70;
const PASSING_SCORE = 70;

/** ISC2 CISSP domain weights — fallback to equal distribution for other certs */
const CISSP_DOMAIN_WEIGHTS: Record<string, number> = {
    d1: 0.15, // Security and Risk Management
    d2: 0.10, // Asset Security
    d3: 0.13, // Security Architecture and Engineering
    d4: 0.12, // Communication and Network Security
    d5: 0.13, // Identity and Access Management
    d6: 0.11, // Security Assessment and Testing
    d7: 0.13, // Security Operations
    d8: 0.13, // Software Development Security
};

// ── Main ─────────────────────────────────────────

export async function computeReadiness(
    uid: string,
    studyId: string
): Promise<ReadinessResult> {
    // Fetch all required data in parallel
    const [summary, exams, totalQuestions] = await Promise.all([
        getPerformanceSummary(uid, studyId),
        listExams({ uid, studyId, limit: 50, status: 'completed' }),
        getTotalQuestionCount(uid, studyId),
    ]);

    const factors = computeFactors(summary, exams, totalQuestions);

    // Weighted sum → 0–100
    const readiness = Math.round(
        Object.entries(factors).reduce(
            (sum, [, factor]) => sum + factor.value * factor.weight * 100,
            0
        )
    );

    const band = getBand(readiness);
    const trend = computeTrend(exams);

    return { readiness, band, trend, factors };
}

// ── Factor Computation ───────────────────────────

function computeFactors(
    summary: PerformanceSummary | null,
    exams: Exam[],
    totalQuestions: number
): ReadinessResult['factors'] {
    // 1. Weighted domain accuracy
    const domainAccuracy = summary?.domainAccuracy ?? {};
    const domainIds = Object.keys(domainAccuracy);
    const domainWeights = getDomainWeights(domainIds);
    let wda = 0;
    if (domainIds.length > 0) {
        for (const did of domainIds) {
            const acc = domainAccuracy[did];
            const pct = acc.total > 0 ? acc.correct / acc.total : 0;
            wda += pct * (domainWeights[did] ?? 1 / domainIds.length);
        }
    }

    // 2. Recent exam scores
    const recentExams = exams.slice(0, 5);
    const recentScores = recentExams.map(e => e.score ?? 0);
    let recentValue = 0;
    if (recentScores.length > 0) {
        const mean = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
        recentValue = mean / 100;
        // Penalty if fewer than 5 exams
        if (recentScores.length < 5) {
            recentValue *= 0.8 + 0.04 * recentScores.length; // 0.84–0.96
        }
    }

    // 3. Hard question accuracy
    const qa = summary?.questionAttempts ?? {};
    let hardCorrect = 0;
    let hardTotal = 0;
    // We don't have difficulty stored per question in PerformanceSummary,
    // so approximate via exam domainScores or use exam-level hard scores.
    // V1: compute from exams that used difficulty: 'hard' or 'all' mode.
    // Simpler approach: ratio of questions with attempts>1 that are correct.
    // Better: use actual exam configs for hard-only exams.
    for (const exam of exams.slice(0, 20)) {
        if (exam.domainScores) {
            for (const ds of Object.values(exam.domainScores)) {
                // Weight hard questions: exams with config.difficulty === 'hard'
                if (exam.config?.difficulty === 'hard') {
                    hardCorrect += ds.correct;
                    hardTotal += ds.total;
                }
            }
        }
    }
    // Fallback: use overall accuracy as proxy if no hard exams taken
    let hardAcc: number;
    if (hardTotal > 0) {
        hardAcc = hardCorrect / hardTotal;
    } else {
        // Use questions with low correctRate as proxy (attempts > correct)
        let lowCorrect = 0;
        let lowTotal = 0;
        for (const [, qr] of Object.entries(qa)) {
            if (qr.attempts >= 2 && qr.correct / qr.attempts < 0.5) {
                lowCorrect += qr.correct;
                lowTotal += qr.attempts;
            }
        }
        hardAcc = lowTotal > 0 ? lowCorrect / lowTotal : (recentScores.length > 0 ? recentValue : 0);
    }

    // 4. Question coverage
    const attemptedCount = Object.keys(qa).length;
    const coverageValue = totalQuestions > 0
        ? Math.min(1.0, attemptedCount / totalQuestions)
        : 0;

    // 5. Weak domain penalty
    const weakDomains: string[] = [];
    for (const did of domainIds) {
        const acc = domainAccuracy[did];
        if (acc.total > 0 && acc.correct / acc.total < WEAK_DOMAIN_THRESHOLD) {
            weakDomains.push(did);
        }
    }
    const weakPenalty = domainIds.length > 0
        ? 1.0 - (weakDomains.length / domainIds.length)
        : 0;

    // 6. Trend bonus (linear regression slope on last 10 scores)
    const trendExams = exams.slice(0, 10).reverse(); // chronological
    const trendBonus = computeTrendBonus(trendExams);

    // 7. Time management
    const timeValue = computeTimeManagement(exams.slice(0, 10));

    return {
        weightedDomainAccuracy: { value: clamp(wda), weight: WEIGHTS.weightedDomainAccuracy },
        recentScores: { value: clamp(recentValue), weight: WEIGHTS.recentScores, scores: recentScores },
        hardQuestionAccuracy: { value: clamp(hardAcc), weight: WEIGHTS.hardQuestionAccuracy },
        questionCoverage: { value: clamp(coverageValue), weight: WEIGHTS.questionCoverage, attempted: attemptedCount, total: totalQuestions },
        weakDomainPenalty: { value: clamp(weakPenalty), weight: WEIGHTS.weakDomainPenalty, weakDomains },
        trendBonus: { value: clamp(trendBonus), weight: WEIGHTS.trendBonus },
        timeManagement: { value: clamp(timeValue), weight: WEIGHTS.timeManagement },
    };
}

// ── Helpers ──────────────────────────────────────

function getDomainWeights(domainIds: string[]): Record<string, number> {
    // Check if these look like CISSP domain IDs
    const hasCisspDomains = domainIds.some(d => d in CISSP_DOMAIN_WEIGHTS);
    if (hasCisspDomains) return CISSP_DOMAIN_WEIGHTS;

    // Equal distribution for non-CISSP certs
    const w = 1 / Math.max(1, domainIds.length);
    const weights: Record<string, number> = {};
    for (const d of domainIds) weights[d] = w;
    return weights;
}

function computeTrendBonus(exams: Exam[]): number {
    if (exams.length < 3) return 0.5; // neutral
    const scores = exams.map(e => e.score ?? 0);
    const n = scores.length;
    const xMean = (n - 1) / 2;
    const yMean = scores.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
        numerator += (i - xMean) * (scores[i] - yMean);
        denominator += (i - xMean) ** 2;
    }
    const slope = denominator !== 0 ? numerator / denominator : 0;

    // slope of +5 per exam → 1.0, slope of -5 → 0.0
    return 0.5 + slope / 10;
}

function computeTimeManagement(exams: Exam[]): number {
    if (exams.length === 0) return 0.5;

    let withinLimit = 0;
    let total = 0;
    for (const exam of exams) {
        if (!exam.config?.timeLimitMinutes || exam.config.timeLimitMinutes === 0) continue;
        total++;
        const allowedSeconds = exam.config.timeLimitMinutes * 60;
        if ((exam.timeSpentSeconds ?? 0) <= allowedSeconds) {
            withinLimit++;
        }
    }

    return total > 0 ? withinLimit / total : 0.8; // default decent if no timed exams
}

function computeTrend(exams: Exam[]): ReadinessResult['trend'] {
    const last5 = exams.slice(0, 5);
    if (last5.length < 2) {
        return { direction: 'stable', delta: 0, examsAnalyzed: last5.length };
    }
    const newest = last5[0].score ?? 0;
    const oldest = last5[last5.length - 1].score ?? 0;
    const delta = newest - oldest;
    return {
        direction: delta > 2 ? 'improving' : delta < -2 ? 'declining' : 'stable',
        delta,
        examsAnalyzed: last5.length,
    };
}

function getBand(readiness: number): ReadinessBand {
    if (readiness >= 90) return 'highly_ready';
    if (readiness >= 75) return 'likely_ready';
    if (readiness >= 60) return 'getting_close';
    if (readiness >= 40) return 'building';
    return 'not_ready';
}

async function getTotalQuestionCount(uid: string, studyId: string): Promise<number> {
    const db = getAdminDb();
    const studyDoc = await db.collection(`users/${uid}/studies`).doc(studyId).get();
    return (studyDoc.data()?.questionCount as number) ?? 0;
}

function clamp(v: number): number {
    return Math.max(0, Math.min(1, v));
}

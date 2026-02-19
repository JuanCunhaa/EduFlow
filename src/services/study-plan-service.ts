/**
 * StudyPlanService — generates a 7-day heuristic study plan.
 *
 * V1: user-data-only. Plans are NOT stored — generated on demand.
 *
 * Algorithm:
 *   1. Identify gaps (weak domains, low coverage, hard-q accuracy, SM-2 review queue)
 *   2. Prioritize by readiness impact
 *   3. Allocate to 7-day schedule alternating push/pull activities
 *   4. Generate concrete ExamConfig per entry
 */

import { getAdminDb } from '@/lib/firebase/admin';
import { getPerformanceSummary } from '@/services/performance-service';
import { computeReadiness } from '@/services/readiness-service';
import type { StudyPlan, PlanEntry, PlanActivity, PerformanceSummary, StudyDomain } from '@/types';

// ── Constants ───────────────────────────────────────

const DEFAULT_TARGET_READINESS = 80;
const DEFAULT_DAYS_PER_WEEK = 5;
const DEFAULT_MINUTES_PER_DAY = 45;
const SECONDS_PER_QUESTION = 90; // ~1.5 min/question
const WEAK_THRESHOLD = 0.70;

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// ── Main ─────────────────────────────────────────

export interface StudyPlanInput {
    studyId: string;
    targetReadiness?: number;
    daysPerWeek?: number;
    minutesPerDay?: number;
}

export async function generateStudyPlan(
    uid: string,
    input: StudyPlanInput
): Promise<StudyPlan> {
    const {
        studyId,
        targetReadiness = DEFAULT_TARGET_READINESS,
        daysPerWeek = DEFAULT_DAYS_PER_WEEK,
        minutesPerDay = DEFAULT_MINUTES_PER_DAY,
    } = input;

    const [summary, readiness, domains] = await Promise.all([
        getPerformanceSummary(uid, studyId),
        computeReadiness(uid, studyId),
        getStudyDomains(uid, studyId),
    ]);

    const domainMap = new Map(domains.map(d => [d.id, d]));
    const gaps = identifyGaps(summary, domainMap);
    const activities = prioritizeActivities(gaps, daysPerWeek);
    const entries = allocateSchedule(activities, minutesPerDay, domainMap);

    return {
        studyId,
        generatedAt: Date.now(),
        targetReadiness,
        currentReadiness: readiness.readiness,
        entries,
        weakDomains: gaps.weakDomainIds,
        spReviewDue: gaps.spReviewDue,
        hardQuestionAccuracy: gaps.hardQuestionAccuracy,
        questionCoverage: gaps.questionCoverage,
    };
}

// ── Gap Analysis ─────────────────────────────────

interface GapAnalysis {
    weakDomainIds: string[];
    weakDomainNames: Map<string, string>;
    lowCoverageDomainIds: string[];
    hardQuestionAccuracy: number;
    spReviewDue: number;
    questionCoverage: number;
}

function identifyGaps(
    summary: PerformanceSummary | null,
    domainMap: Map<string, StudyDomain>
): GapAnalysis {
    const domainAccuracy = summary?.domainAccuracy ?? {};
    const qa = summary?.questionAttempts ?? {};

    // Weak domains (< 70% accuracy)
    const weakDomainIds: string[] = [];
    const weakDomainNames = new Map<string, string>();
    for (const [did, acc] of Object.entries(domainAccuracy)) {
        if (acc.total > 0 && acc.correct / acc.total < WEAK_THRESHOLD) {
            weakDomainIds.push(did);
            weakDomainNames.set(did, domainMap.get(did)?.name ?? did);
        }
    }
    // Sort weakest first
    weakDomainIds.sort((a, b) => {
        const accA = domainAccuracy[a];
        const accB = domainAccuracy[b];
        return (accA.correct / accA.total) - (accB.correct / accB.total);
    });

    // Low coverage domains (attempted < 50% of domain questions — approximate)
    const allDomainIds = [...domainMap.keys()];
    const lowCoverageDomainIds = allDomainIds.filter(did => {
        const acc = domainAccuracy[did];
        if (!acc) return true; // never attempted = lowest coverage
        return acc.total < 10; // heuristic: fewer than 10 questions attempted
    });

    // Hard question accuracy (from questionAttempts with correctRate < 50%)
    let hardCorrect = 0;
    let hardTotal = 0;
    for (const qr of Object.values(qa)) {
        if (qr.attempts >= 2 && qr.correct / qr.attempts < 0.5) {
            hardCorrect += qr.correct;
            hardTotal += qr.attempts;
        }
    }
    const hardQuestionAccuracy = hardTotal > 0 ? hardCorrect / hardTotal : 0.5;

    // SM-2 review queue
    const now = Date.now();
    let spReviewDue = 0;
    for (const qr of Object.values(qa)) {
        if (qr.nextReviewAt && qr.nextReviewAt <= now) {
            spReviewDue++;
        }
    }

    // Question coverage
    const attemptedCount = Object.keys(qa).length;
    // Total unknown here — use approximate so we pass coverage as ratio
    const questionCoverage = attemptedCount;

    return { weakDomainIds, weakDomainNames, lowCoverageDomainIds, hardQuestionAccuracy, spReviewDue, questionCoverage };
}

// ── Activity Prioritization ──────────────────────

type ActivitySlot = { activity: PlanActivity; rationale: string; priority: number };

function prioritizeActivities(
    gaps: GapAnalysis,
    daysAvailable: number
): ActivitySlot[] {
    const slots: ActivitySlot[] = [];

    // 1. Weakest domain focus (highest priority)
    for (const did of gaps.weakDomainIds.slice(0, 2)) {
        const name = gaps.weakDomainNames.get(did) ?? did;
        slots.push({
            activity: { type: 'domain_focus', domainId: did, domainName: name },
            rationale: `Your weakest domain — focus here for maximum readiness gain`,
            priority: 10,
        });
    }

    // 2. Spaced review (if any are due)
    if (gaps.spReviewDue > 0) {
        slots.push({
            activity: { type: 'spaced_review', questionsDue: gaps.spReviewDue },
            rationale: `${gaps.spReviewDue} questions due for spaced review`,
            priority: 8,
        });
    }

    // 3. Hard questions (if accuracy < 60%)
    if (gaps.hardQuestionAccuracy < 0.6) {
        slots.push({
            activity: { type: 'hard_questions' },
            rationale: `Hard question accuracy is ${Math.round(gaps.hardQuestionAccuracy * 100)}% — needs work`,
            priority: 7,
        });
    }

    // 4. Full-length exam (1 per week)
    slots.push({
        activity: { type: 'full_length_exam' },
        rationale: 'Weekly full-length simulates real exam conditions',
        priority: 6,
    });

    // 5. Weak domains practice (general)
    if (gaps.weakDomainIds.length > 0) {
        slots.push({
            activity: { type: 'weak_domains' },
            rationale: 'Mixed practice across all weak domains',
            priority: 5,
        });
    }

    // 6. Review mistakes from the week
    slots.push({
        activity: { type: 'review_mistakes' },
        rationale: 'Review wrong answers to reinforce learning',
        priority: 4,
    });

    // 7. Rest day (fill remaining if needed)
    slots.push({
        activity: { type: 'rest' },
        rationale: 'Rest and let your brain consolidate',
        priority: 0,
    });

    // Sort by priority descending, then take enough for daysAvailable
    slots.sort((a, b) => b.priority - a.priority);
    return slots.slice(0, Math.max(daysAvailable, 7));
}

// ── Schedule Allocation ──────────────────────────

function allocateSchedule(
    activities: ActivitySlot[],
    minutesPerDay: number,
    domainMap: Map<string, StudyDomain>
): PlanEntry[] {
    const entries: PlanEntry[] = [];

    for (let day = 0; day < 7; day++) {
        const slot = activities[day % activities.length];
        const entry = buildEntry(day + 1, DAY_NAMES[day], slot, minutesPerDay, domainMap);
        entries.push(entry);
    }

    return entries;
}

function buildEntry(
    day: number,
    dayOfWeek: string,
    slot: ActivitySlot,
    minutesPerDay: number,
    _domainMap: Map<string, StudyDomain>
): PlanEntry {
    const questionCount = Math.max(10, Math.round((minutesPerDay * 60) / SECONDS_PER_QUESTION));
    const timeLimitMinutes = minutesPerDay;

    const baseConfig = {
        questionCount,
        timeLimitMinutes,
        difficulty: 'all' as const,
        domainIds: [] as string[],
    };

    switch (slot.activity.type) {
        case 'domain_focus':
            return {
                day, dayOfWeek,
                activity: slot.activity,
                rationale: slot.rationale,
                estimatedMinutes: minutesPerDay,
                examConfig: { ...baseConfig, mode: 'domain_focus', domainIds: [slot.activity.domainId] },
            };
        case 'spaced_review':
            return {
                day, dayOfWeek,
                activity: slot.activity,
                rationale: slot.rationale,
                estimatedMinutes: Math.min(minutesPerDay, 30),
                examConfig: { ...baseConfig, mode: 'spaced_review', questionCount: Math.min(questionCount, 20) },
            };
        case 'hard_questions':
            return {
                day, dayOfWeek,
                activity: slot.activity,
                rationale: slot.rationale,
                estimatedMinutes: minutesPerDay,
                examConfig: { ...baseConfig, mode: 'practice', difficulty: 'hard', questionCount: Math.min(questionCount, 20) },
            };
        case 'full_length_exam':
            return {
                day, dayOfWeek,
                activity: slot.activity,
                rationale: slot.rationale,
                estimatedMinutes: 90,
                examConfig: { mode: 'real_mix', questionCount: 50, timeLimitMinutes: 90, difficulty: 'all', domainIds: [] },
            };
        case 'weak_domains':
            return {
                day, dayOfWeek,
                activity: slot.activity,
                rationale: slot.rationale,
                estimatedMinutes: minutesPerDay,
                examConfig: { ...baseConfig, mode: 'weak_domains' },
            };
        case 'review_mistakes':
            return {
                day, dayOfWeek,
                activity: slot.activity,
                rationale: slot.rationale,
                estimatedMinutes: 20,
                examConfig: { ...baseConfig, mode: 'recent_misses', questionCount: 15, timeLimitMinutes: 25 },
            };
        case 'rest':
            return {
                day, dayOfWeek,
                activity: slot.activity,
                rationale: slot.rationale,
                estimatedMinutes: 0,
                examConfig: null,
            };
    }
}

// ── Helpers ──────────────────────────────────────

async function getStudyDomains(uid: string, studyId: string): Promise<StudyDomain[]> {
    const db = getAdminDb();
    const doc = await db.collection(`users/${uid}/studies`).doc(studyId).get();
    return (doc.data()?.domains as StudyDomain[]) ?? [];
}

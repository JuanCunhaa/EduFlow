/**
 * PerformanceService — manages the denormalized PerformanceSummary document.
 *
 * Firestore path: users/{uid}/performanceSummary/{studyId}
 *
 * Design goals:
 * - Single-document read to get ALL data needed for smart exam strategies.
 * - Updated atomically on exam submission (batch write with exam update).
 * - Avoids heavy aggregation queries at exam-creation time.
 *
 * Data stored:
 * - domainAccuracy: per-domain correct/total counts
 * - questionAttempts: per-question lightweight record (attempts, correct, lastAttemptAt, lastCorrect)
 * - recentExamQuestionIds: flat array of question IDs from last N exams (for repeat avoidance)
 */

import { getAdminDb } from '@/lib/firebase/admin';
import type { PerformanceSummary, QuestionAttemptRecord } from '@/types';

const RECENT_EXAM_WINDOW = 3;
/** Max questions to track in questionAttempts before pruning old ones */
const MAX_TRACKED_QUESTIONS = 2000;

// ── Path ─────────────────────────────────────────

function summaryPath(uid: string): string {
    return `users/${uid}/performanceSummary`;
}

function summaryDocPath(uid: string, studyId: string): string {
    return `${summaryPath(uid)}/${studyId}`;
}

// ── Read ─────────────────────────────────────────

/**
 * Fetch the performance summary for a given study.
 * Returns null if no summary exists yet (new user / new study).
 */
export async function getPerformanceSummary(
    uid: string,
    studyId: string
): Promise<PerformanceSummary | null> {
    const db = getAdminDb();
    const snap = await db.doc(summaryDocPath(uid, studyId)).get();
    if (!snap.exists) return null;
    return snap.data() as PerformanceSummary;
}

// ── Write (called on exam submission) ────────────

export interface ExamResultForSummary {
    studyId: string;
    questionIds: string[];
    answers: Record<string, number | null>;
    correctAnswers: Record<string, number>;
    questionDomains: Record<string, string>;
}

/**
 * Update the performance summary after an exam is completed.
 * This should be called inside the same batch as the exam completion write,
 * or immediately after.
 *
 * Operations:
 * 1. Merge domain accuracy increments.
 * 2. Upsert per-question attempt records.
 * 3. Rotate recentExamQuestionIds window.
 */
export async function updatePerformanceSummary(
    uid: string,
    result: ExamResultForSummary
): Promise<void> {
    const db = getAdminDb();
    const docRef = db.doc(summaryDocPath(uid, result.studyId));

    await db.runTransaction(async (tx) => {
        const snap = await tx.get(docRef);
        const existing: PerformanceSummary = snap.exists
            ? (snap.data() as PerformanceSummary)
            : {
                studyId: result.studyId,
                domainAccuracy: {},
                questionAttempts: {},
                recentExamQuestionIds: [],
                recentExamWindow: RECENT_EXAM_WINDOW,
                updatedAt: Date.now(),
            };

        const now = Date.now();

        // 1. Update domain accuracy
        for (const [qId, correctIndex] of Object.entries(result.correctAnswers)) {
            const userAnswer = result.answers[qId];
            const domainId = result.questionDomains[qId] || '_none';
            const isCorrect = userAnswer === correctIndex;

            if (!existing.domainAccuracy[domainId]) {
                existing.domainAccuracy[domainId] = { correct: 0, total: 0 };
            }
            existing.domainAccuracy[domainId].total += 1;
            if (isCorrect) {
                existing.domainAccuracy[domainId].correct += 1;
            }
        }

        // 2. Upsert question attempt records with SM-2 scheduling
        for (const [qId, correctIndex] of Object.entries(result.correctAnswers)) {
            const userAnswer = result.answers[qId];
            const isCorrect = userAnswer === correctIndex;

            const prev = existing.questionAttempts[qId];

            // SM-2 algorithm
            const oldEF = prev?.easeFactor ?? 2.5;
            const oldInterval = prev?.interval ?? 0;
            let newEF: number;
            let newInterval: number;

            if (isCorrect) {
                newEF = Math.max(1.3, oldEF + (0.1 - 0.08 + 0.02));
                if (oldInterval === 0) newInterval = 1;
                else if (oldInterval === 1) newInterval = 6;
                else newInterval = Math.round(oldInterval * newEF);
            } else {
                newEF = Math.max(1.3, oldEF - 0.3);
                newInterval = 1;
            }

            const nextReviewAt = now + newInterval * 24 * 60 * 60 * 1000;

            existing.questionAttempts[qId] = {
                attempts: (prev?.attempts ?? 0) + 1,
                correct: (prev?.correct ?? 0) + (isCorrect ? 1 : 0),
                lastAttemptAt: now,
                lastCorrect: isCorrect,
                easeFactor: newEF,
                interval: newInterval,
                nextReviewAt,
            };
        }

        // 3. Rotate recent exam question IDs
        // Keep a sliding window of the last N exams' question IDs
        const newQuestionIds = result.questionIds;
        const combined = [...newQuestionIds, ...existing.recentExamQuestionIds];

        // Estimate questions per exam from this exam's size
        const avgQuestionsPerExam = newQuestionIds.length || 25;
        const maxRecentIds = avgQuestionsPerExam * RECENT_EXAM_WINDOW;
        existing.recentExamQuestionIds = combined.slice(0, maxRecentIds);
        existing.recentExamWindow = RECENT_EXAM_WINDOW;

        // 4. Prune questionAttempts if too large (keep most recent)
        const attemptEntries = Object.entries(existing.questionAttempts);
        if (attemptEntries.length > MAX_TRACKED_QUESTIONS) {
            // Sort by lastAttemptAt descending, keep top MAX_TRACKED_QUESTIONS
            attemptEntries.sort((a, b) => b[1].lastAttemptAt - a[1].lastAttemptAt);
            existing.questionAttempts = Object.fromEntries(
                attemptEntries.slice(0, MAX_TRACKED_QUESTIONS)
            );
        }

        existing.updatedAt = now;
        tx.set(docRef, existing);
    });
}

/**
 * Build a performance summary from batch write data (for use in Firestore batch).
 * Returns the set operation to include in an atomic batch.
 */
export function buildPerformanceSummaryUpdate(
    uid: string,
    result: ExamResultForSummary,
    existingSummary: PerformanceSummary | null
): { path: string; data: PerformanceSummary } {
    const now = Date.now();
    const summary: PerformanceSummary = existingSummary
        ? { ...existingSummary }
        : {
            studyId: result.studyId,
            domainAccuracy: {},
            questionAttempts: {},
            recentExamQuestionIds: [],
            recentExamWindow: RECENT_EXAM_WINDOW,
            updatedAt: now,
        };

    // Deep clone mutable nested objects
    summary.domainAccuracy = { ...summary.domainAccuracy };
    summary.questionAttempts = { ...summary.questionAttempts };

    // Update domain accuracy
    for (const [qId, correctIndex] of Object.entries(result.correctAnswers)) {
        const userAnswer = result.answers[qId];
        const domainId = result.questionDomains[qId] || '_none';
        const isCorrect = userAnswer === correctIndex;

        if (!summary.domainAccuracy[domainId]) {
            summary.domainAccuracy[domainId] = { correct: 0, total: 0 };
        }
        summary.domainAccuracy[domainId] = {
            correct: summary.domainAccuracy[domainId].correct + (isCorrect ? 1 : 0),
            total: summary.domainAccuracy[domainId].total + 1,
        };
    }

    // Upsert question attempts with SM-2 spaced repetition scheduling
    for (const [qId, correctIndex] of Object.entries(result.correctAnswers)) {
        const userAnswer = result.answers[qId];
        const isCorrect = userAnswer === correctIndex;
        const prev = summary.questionAttempts[qId];

        // SM-2 algorithm
        const oldEF = prev?.easeFactor ?? 2.5;
        const oldInterval = prev?.interval ?? 0;

        let newEF: number;
        let newInterval: number;

        if (isCorrect) {
            // Quality 4 (correct) — increase interval
            newEF = Math.max(1.3, oldEF + (0.1 - 0.08 + 0.02));
            if (oldInterval === 0) newInterval = 1;
            else if (oldInterval === 1) newInterval = 6;
            else newInterval = Math.round(oldInterval * newEF);
        } else {
            // Quality 1 (incorrect) — reset interval, decrease EF
            newEF = Math.max(1.3, oldEF - 0.3);
            newInterval = 1;
        }

        const nextReviewAt = now + newInterval * 24 * 60 * 60 * 1000;

        summary.questionAttempts[qId] = {
            attempts: (prev?.attempts ?? 0) + 1,
            correct: (prev?.correct ?? 0) + (isCorrect ? 1 : 0),
            lastAttemptAt: now,
            lastCorrect: isCorrect,
            easeFactor: newEF,
            interval: newInterval,
            nextReviewAt,
        };
    }

    // Rotate recent exam question IDs
    const avgQuestionsPerExam = result.questionIds.length || 25;
    const maxRecentIds = avgQuestionsPerExam * RECENT_EXAM_WINDOW;
    summary.recentExamQuestionIds = [
        ...result.questionIds,
        ...summary.recentExamQuestionIds,
    ].slice(0, maxRecentIds);

    summary.updatedAt = now;

    return {
        path: summaryDocPath(uid, result.studyId),
        data: summary,
    };
}

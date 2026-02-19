/**
 * Analytics writer service — event collection, anonymization, and aggregation.
 * Implements: docs/specs/3 analytics/privacy-anonymization.md
 *             docs/specs/3 analytics/event-tracking-schema.md
 *             docs/specs/3 analytics/cross-user-analytics.md
 */

import { createHmac } from 'node:crypto';
import { getAdminDb } from '@/lib/firebase/admin';
import type {
    AnalyticsEvent,
    AggregatedQuestionStats,
    ExamAnswersBatchEvent,
} from '@/types/analytics';

// ── HMAC-based anonId generation ────────────────

const ANALYTICS_HMAC_SECRET = process.env.ANALYTICS_HMAC_SECRET || '';

/**
 * Generate a deterministic anonymous ID from a user's UID.
 * Uses HMAC-SHA256 so the same uid always maps to the same anonId,
 * but anonId cannot be reversed to discover uid.
 */
export function generateAnonId(uid: string): string {
    if (!ANALYTICS_HMAC_SECRET) {
        throw new Error('ANALYTICS_HMAC_SECRET is not configured');
    }
    return createHmac('sha256', ANALYTICS_HMAC_SECRET)
        .update(uid)
        .digest('hex');
}

// ── Event Writing ───────────────────────────────

/**
 * Write an analytics event to Firestore.
 * Events are stored in analytics/events/log/{auto-id}.
 * The event must already have anonId set (never raw uid).
 */
export async function writeAnalyticsEvent(event: AnalyticsEvent): Promise<void> {
    const db = getAdminDb();
    const eventsCol = db.collection('analytics').doc('events').collection('log');
    await eventsCol.add({
        ...event,
        _writtenAt: Date.now(),
    });
}

/**
 * Write a batch of analytics events atomically.
 * Firestore batch limit is 500 — callers must respect this.
 */
export async function writeEventBatch(events: AnalyticsEvent[]): Promise<void> {
    if (events.length === 0) return;
    if (events.length > 500) {
        throw new Error(`Batch too large: ${events.length} events (max 500)`);
    }

    const db = getAdminDb();
    const batch = db.batch();
    const eventsCol = db.collection('analytics').doc('events').collection('log');

    for (const event of events) {
        const ref = eventsCol.doc();
        batch.set(ref, { ...event, _writtenAt: Date.now() });
    }

    await batch.commit();
}

// ── Aggregation: Per-Question Stats ─────────────

/**
 * Update aggregated question stats from a batch of answers.
 * Called after exam submission to incrementally update cross-user data.
 */
export async function updateQuestionAggregates(
    event: ExamAnswersBatchEvent
): Promise<void> {
    const db = getAdminDb();
    const statsCol = db.collection('analytics').doc('questions').collection('stats');

    for (const answer of event.answers) {
        const docRef = statsCol.doc(answer.questionId);
        const snap = await docRef.get();

        if (snap.exists) {
            await incrementExistingStats(docRef, snap.data() as AggregatedQuestionStats, answer);
        } else {
            await createInitialStats(docRef, event.certId, answer);
        }
    }
}

/** Create first-time stats for a question */
async function createInitialStats(
    docRef: FirebaseFirestore.DocumentReference,
    certId: string,
    answer: ExamAnswersBatchEvent['answers'][0]
): Promise<void> {
    const initial: AggregatedQuestionStats = {
        questionId: answer.questionId,
        certId,
        domainIds: answer.domainIds,
        totalAttempts: 1,
        correctCount: answer.correct ? 1 : 0,
        correctRate: answer.correct ? 100 : 0,
        optionDistribution: answer.selectedIndex !== null
            ? { [String(answer.selectedIndex)]: 1 }
            : {},
        avgTimeMs: answer.timeMs,
        skipCount: answer.selectedIndex === null ? 1 : 0,
        reportCount: 0,
        calibratedDifficulty: calibrateDifficulty(answer.correct ? 100 : 0),
        uniqueUsers: 1,
        lastUpdatedAt: Date.now(),
    };
    await docRef.set(initial);
}

/** Incrementally update existing question stats */
async function incrementExistingStats(
    docRef: FirebaseFirestore.DocumentReference,
    existing: AggregatedQuestionStats,
    answer: ExamAnswersBatchEvent['answers'][0]
): Promise<void> {
    const newTotal = existing.totalAttempts + 1;
    const newCorrect = existing.correctCount + (answer.correct ? 1 : 0);
    const newCorrectRate = Math.round((newCorrect / newTotal) * 100);
    const newAvgTime = Math.round(((existing.avgTimeMs * existing.totalAttempts) + answer.timeMs) / newTotal);

    const dist = { ...existing.optionDistribution };
    if (answer.selectedIndex !== null) {
        const key = String(answer.selectedIndex);
        dist[key] = (dist[key] || 0) + 1;
    }

    await docRef.update({
        totalAttempts: newTotal,
        correctCount: newCorrect,
        correctRate: newCorrectRate,
        calibratedDifficulty: calibrateDifficulty(newCorrectRate),
        avgTimeMs: newAvgTime,
        skipCount: existing.skipCount + (answer.selectedIndex === null ? 1 : 0),
        optionDistribution: dist,
        lastUpdatedAt: Date.now(),
    });
}

// ── Difficulty Calibration ──────────────────────

/**
 * Calibrate difficulty based on correct rate thresholds.
 * From spec: cross-user-analytics.md § difficulty calibration
 */
export function calibrateDifficulty(correctRate: number): 'easy' | 'medium' | 'hard' {
    if (correctRate >= 75) return 'easy';
    if (correctRate >= 45) return 'medium';
    return 'hard';
}

// ── K-Anonymity Check ───────────────────────────

/** Minimum unique users before exposing aggregate data */
const K_THRESHOLD = 5;

/**
 * Get public question stats — returns null if below K-anonymity threshold.
 */
export async function getPublicQuestionStats(
    questionId: string
): Promise<AggregatedQuestionStats | null> {
    const db = getAdminDb();
    const docRef = db.collection('analytics')
        .doc('questions')
        .collection('stats')
        .doc(questionId);

    const snap = await docRef.get();
    if (!snap.exists) return null;

    const stats = snap.data() as AggregatedQuestionStats;
    if (stats.uniqueUsers < K_THRESHOLD) return null;

    return stats;
}

// ── Opt-Out Check ───────────────────────────────

/**
 * Check if a user has opted out of analytics.
 */
export async function isUserOptedOut(uid: string): Promise<boolean> {
    const db = getAdminDb();
    const snap = await db.collection('users').doc(uid).get();
    if (!snap.exists) return false;
    return snap.data()?.analyticsOptOut === true;
}

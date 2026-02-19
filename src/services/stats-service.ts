/**
 * StatsService — encapsulates retention features: streaks, daily goals, badges, daily challenge.
 * Stats stored at users/{uid}/stats/current (single document).
 */

import { getAdminDb } from '@/lib/firebase/admin';
import type { UserStats, BadgeId } from '@/types';
import { HEATMAP_ROLLING_DAYS } from '@/lib/constants';

const STATS_DOC = 'current';

function statsPath(uid: string): string {
  return `users/${uid}/stats`;
}

// ── Read ─────────────────────────────────────────

const DEFAULT_STATS: UserStats = {
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: '',
  totalQuestionsAnswered: 0,
  totalExamsCompleted: 0,
  dailyGoal: 10,
  weeklyGoal: 50,
  badges: [],
  recentDays: [],
};

export async function getStats(uid: string): Promise<UserStats> {
  const db = getAdminDb();
  const snap = await db.doc(`${statsPath(uid)}/${STATS_DOC}`).get();
  if (!snap.exists) return { ...DEFAULT_STATS };
  // Merge with defaults to handle partial docs (e.g. badges field missing on old accounts)
  return { ...DEFAULT_STATS, ...snap.data() } as UserStats;
}

// ── Write ────────────────────────────────────────

export async function updateDailyGoal(
  uid: string,
  dailyGoal: number
): Promise<void> {
  const db = getAdminDb();
  await db
    .doc(`${statsPath(uid)}/${STATS_DOC}`)
    .set({ dailyGoal }, { merge: true });
}

export async function updateWeeklyGoal(
  uid: string,
  weeklyGoal: number
): Promise<void> {
  const db = getAdminDb();
  await db
    .doc(`${statsPath(uid)}/${STATS_DOC}`)
    .set({ weeklyGoal }, { merge: true });
}

/**
 * Record daily activity after a question is answered or exam is completed.
 * Called from exam-service on submission.
 * Uses a Firestore transaction to prevent race conditions on concurrent submissions.
 */
export async function recordActivity(
  uid: string,
  questionsAnswered: number,
  correctAnswers: number,
  examCompleted: boolean
): Promise<void> {
  const db = getAdminDb();
  const statsRef = db.doc(`${statsPath(uid)}/${STATS_DOC}`);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(statsRef);
    const stats: UserStats = snap.exists
      ? (snap.data() as UserStats)
      : { ...DEFAULT_STATS };

    const today = getTodayString();

    // Update or create today's record
    let todayRecord = stats.recentDays.find((d) => d.date === today);
    if (!todayRecord) {
      todayRecord = {
        date: today,
        questionsAnswered: 0,
        correctAnswers: 0,
        examsCompleted: 0,
      };
      stats.recentDays.push(todayRecord);
    }
    todayRecord.questionsAnswered += questionsAnswered;
    todayRecord.correctAnswers += correctAnswers;
    if (examCompleted) todayRecord.examsCompleted += 1;

    // Update streak
    const yesterday = getDateString(-1);
    if (stats.lastActiveDate === yesterday) {
      stats.currentStreak += 1;
    } else if (stats.lastActiveDate !== today) {
      stats.currentStreak = 1;
    }

    stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
    stats.lastActiveDate = today;

    // Update totals
    stats.totalQuestionsAnswered += questionsAnswered;
    if (examCompleted) stats.totalExamsCompleted += 1;

    // Trim to 180 days rolling window (extended for heatmap)
    stats.recentDays = stats.recentDays
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, HEATMAP_ROLLING_DAYS);

    // Check for new badges
    stats.badges = checkBadges(stats);

    tx.set(statsRef, stats);
  });
}

// ── Badges ───────────────────────────────────────

const BADGE_RULES: Array<{ id: BadgeId; check: (s: UserStats) => boolean }> = [
  { id: 'first_exam', check: (s) => s.totalExamsCompleted >= 1 },
  { id: 'streak_3', check: (s) => s.longestStreak >= 3 },
  { id: 'streak_7', check: (s) => s.longestStreak >= 7 },
  { id: 'streak_30', check: (s) => s.longestStreak >= 30 },
  { id: 'centurion', check: (s) => s.totalQuestionsAnswered >= 100 },
];

function checkBadges(stats: UserStats): string[] {
  const earned = new Set(stats.badges);
  for (const rule of BADGE_RULES) {
    if (rule.check(stats)) {
      earned.add(rule.id);
    }
  }
  return Array.from(earned);
}

/**
 * Award a one-off badge (e.g., perfect_score, domain_master).
 * Called from exam-service when conditions are met.
 */
export async function awardBadge(uid: string, badge: BadgeId): Promise<void> {
  const stats = await getStats(uid);
  if (!stats.badges.includes(badge)) {
    stats.badges.push(badge);
    const db = getAdminDb();
    await db
      .doc(`${statsPath(uid)}/${STATS_DOC}`)
      .set({ badges: stats.badges }, { merge: true });
  }
}

// ── Date helpers ─────────────────────────────────

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function getDateString(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

/**
 * ExamService — encapsulates all exam-related business logic and data access.
 * v2: exams stored under users/{uid}/exams, uses studyId + domainIds + modes.
 */

import { getAdminDb } from '@/lib/firebase/admin';
import {
  adminGetDoc,
  adminCreateDoc,
  serverTimestamp,
} from '@/lib/firebase/admin-firestore';
import {
  selectQuestions,
  sanitizeQuestionsForExam,
  scoreExam,
  getMissedQuestionIds,
} from '@/lib/exam-engine';
import type { StrategyPerformanceData } from '@/lib/exam-engine';
import { rateLimit } from '@/lib/rate-limit';
import {
  ExamNotFoundError,
  ExamAlreadyCompletedError,
  ExamTimeLimitExceededError,
  QuestionNotInExamError,
  NoQuestionsAvailableError,
  RateLimitError,
} from '@/lib/errors';
import {
  fetchQuestionPool,
  fetchQuestionsByIds,
} from '@/services/question-service';
import {
  getPerformanceSummary,
  buildPerformanceSummaryUpdate,
} from '@/services/performance-service';
import { FieldValue } from 'firebase-admin/firestore';
import { recordActivity, awardBadge, getStats } from '@/services/stats-service';
import { GRACE_PERIOD_SECONDS, EXAM_CREATE_RATE_LIMIT } from '@/lib/constants';
import { recalculateAverageScore } from '@/services/exam-analytics-service';
import { updateQuestionPerformanceStats } from '@/services/content-quality-service';
import type {
  Exam,
  Question,
  ExamConfig,
  DomainScore,
  ExamMode,
  BadgeId,
} from '@/types';

// ── Types ────────────────────────────────────────

export interface CreateExamInput {
  studyId: string;
  questionCount: number;
  timeLimitMinutes: number;
  domainIds: string[];
  difficulty: string;
  mode: ExamMode;
}

export interface CreateExamResult {
  id: string;
  studyId: string;
  status: string;
  config: {
    questionCount: number;
    timeLimitMinutes: number;
    domainIds: string[];
    difficulty: string;
    mode: ExamMode;
  };
  questions: ReturnType<typeof sanitizeQuestionsForExam>;
}

export interface SubmitExamResult {
  examId: string;
  score: number;
  domainScores: Record<string, DomainScore>;
  totalQuestions: number;
  correctAnswers: number;
  newBadges: BadgeId[];
}

// ── Paths ────────────────────────────────────────

function examsPath(uid: string): string {
  return `users/${uid}/exams`;
}

// ── List exams ───────────────────────────────────

export interface ListExamsOptions {
  uid: string;
  studyId?: string;
  limit?: number;
  status?: string;
  /** When true, returns full documents (needed for analytics aggregation). Default: false = lightweight list. */
  fullDocs?: boolean;
}

export async function listExams(options: ListExamsOptions): Promise<Exam[]> {
  const { uid, studyId, limit: limitParam = 20, status } = options;
  const limitCount = Math.min(Math.max(1, limitParam), 50);
  const db = getAdminDb();

  let q: FirebaseFirestore.Query = db.collection(examsPath(uid));

  if (studyId) q = q.where('studyId', '==', studyId);
  if (status) q = q.where('status', '==', status);

  q = q.orderBy('startedAt', 'desc').limit(limitCount);

  // Lightweight projection for list views — skip answers, questionIds, internal scoring maps
  if (!options.fullDocs) {
    q = q.select(
      'studyId',
      'status',
      'score',
      'startedAt',
      'completedAt',
      'config',
      'domainScores',
      'timeSpentSeconds',
      'userId'
    );
  }

  const snap = await q.get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Exam);
}

// ── Get single exam ──────────────────────────────

export async function getExam(uid: string, examId: string): Promise<Exam> {
  const exam = await adminGetDoc<Exam>(examsPath(uid), examId);
  if (!exam) throw new ExamNotFoundError();
  return exam;
}

/**
 * Get exam for client display.
 * ALWAYS strips internal scoring fields (questionCorrectAnswers, questionDomains, questionIds).
 * These fields are server-only — used for zero-read scoring.
 */
export async function getExamForClient(
  uid: string,
  examId: string
): Promise<Partial<Exam>> {
  const exam = await getExam(uid, examId);

  // Always strip internal scoring fields — these must never reach the client.
  // These fields are stored in Firestore by createExam() but intentionally
  // not declared on the Exam type (they're internal implementation detail).
  const raw = exam as unknown as Record<string, unknown>;
  delete raw.questionIds;
  delete raw.questionCorrectAnswers;
  delete raw.questionDomains;

  return raw as Partial<Exam>;
}

// ── Create exam ──────────────────────────────────

export async function createExam(
  uid: string,
  config: CreateExamInput
): Promise<CreateExamResult> {
  // Rate limit: max exam creations per minute per user
  const allowed = await rateLimit(
    `exam-create:${uid}`,
    EXAM_CREATE_RATE_LIMIT,
    60_000,
    false
  );
  if (!allowed) throw new RateLimitError();

  const fetchLimit = Math.min(config.questionCount * 5, 500);

  const allQuestions = await fetchQuestionPool({
    uid,
    studyId: config.studyId,
    difficulty: config.difficulty,
    domainIds: config.domainIds.length > 0 ? config.domainIds : undefined,
    limit: fetchLimit,
  });

  if (allQuestions.length === 0) {
    throw new NoQuestionsAvailableError(
      'No questions available for this study'
    );
  }

  // Build performance data for smart modes (single-doc read from PerformanceSummary)
  let performanceData: StrategyPerformanceData | undefined;

  if (
    config.mode === 'weak_domains' ||
    config.mode === 'recent_misses' ||
    config.mode === 'real_mix'
  ) {
    const summary = await getPerformanceSummary(uid, config.studyId);

    if (summary) {
      performanceData = { performanceSummary: summary };

      // For weak_domains, also build legacy domainScores for backward compat
      if (config.mode === 'weak_domains') {
        const domainScores: Record<string, DomainScore> = {};
        for (const [domainId, acc] of Object.entries(summary.domainAccuracy)) {
          domainScores[domainId] = {
            domainId,
            domain: domainId,
            correct: acc.correct,
            total: acc.total,
            percentage:
              acc.total > 0 ? Math.round((acc.correct / acc.total) * 100) : 0,
          };
        }
        performanceData.domainScores = domainScores;
      }
    } else {
      // No performance summary yet — fall back to aggregating from recent exams
      const recentExams = await listExams({
        uid,
        studyId: config.studyId,
        limit: 20,
        status: 'completed',
      });

      if (config.mode === 'weak_domains') {
        const aggDomainScores: Record<string, DomainScore> = {};
        for (const exam of recentExams) {
          if (exam.domainScores) {
            for (const [domainId, ds] of Object.entries(exam.domainScores)) {
              if (!aggDomainScores[domainId]) {
                aggDomainScores[domainId] = {
                  domainId,
                  domain: ds.domain,
                  correct: 0,
                  total: 0,
                  percentage: 0,
                };
              }
              aggDomainScores[domainId].correct += ds.correct;
              aggDomainScores[domainId].total += ds.total;
            }
          }
        }
        for (const ds of Object.values(aggDomainScores)) {
          ds.percentage =
            ds.total > 0 ? Math.round((ds.correct / ds.total) * 100) : 0;
        }
        performanceData = { domainScores: aggDomainScores };
      }
    }
  }

  const selected = selectQuestions(
    allQuestions,
    {
      ...config,
      domainIds: config.domainIds,
      difficulty: config.difficulty as ExamConfig['difficulty'],
      mode: config.mode,
      studyId: config.studyId,
    },
    performanceData
  );

  if (selected.length === 0) {
    throw new NoQuestionsAvailableError('No questions match your filters');
  }

  // Fetch full question documents only for selected questions (two-phase: pool had minimal fields)
  const fullQuestions = await fetchQuestionsByIds(
    uid,
    selected.map((q) => q.id)
  );
  const fullMap = new Map(fullQuestions.map((q) => [q.id, q]));

  // Initialize empty answers
  const answers: Record<string, null> = {};
  for (const q of selected) {
    answers[q.id] = null;
  }

  // Store correctOptionIndex + domainIds per question for zero-read scoring
  // (these come from the lightweight pool — already available)
  const questionCorrectAnswers: Record<string, number> = {};
  const questionDomains: Record<string, string> = {};
  for (const q of selected) {
    questionCorrectAnswers[q.id] = q.correctOptionIndex;
    questionDomains[q.id] = q.domainIds[0] || '_none';
  }

  const now = serverTimestamp();
  const examData = {
    userId: uid,
    studyId: config.studyId,
    status: 'in_progress',
    config: {
      questionCount: selected.length,
      timeLimitMinutes: config.timeLimitMinutes,
      domainIds: config.domainIds,
      difficulty: config.difficulty,
      mode: config.mode,
    },
    questionIds: selected.map((q) => q.id),
    questionCorrectAnswers,
    questionDomains,
    answers,
    score: null,
    domainScores: {},
    startedAt: now,
    completedAt: null,
    timeSpentSeconds: 0,
  };

  const examId = await adminCreateDoc(examsPath(uid), examData);

  return {
    id: examId,
    studyId: config.studyId,
    status: 'in_progress',
    config: {
      questionCount: selected.length,
      timeLimitMinutes: config.timeLimitMinutes,
      domainIds: config.domainIds,
      difficulty: config.difficulty,
      mode: config.mode,
    },
    questions: sanitizeQuestionsForExam(fullQuestions),
  };
}

// ── Save answer ──────────────────────────────────

export async function saveAnswer(
  uid: string,
  examId: string,
  questionId: string,
  selectedOptionIndex: number | null
): Promise<void> {
  const db = getAdminDb();
  const docRef = db.doc(`${examsPath(uid)}/${examId}`);
  const snap = await docRef.get();

  if (!snap.exists) throw new ExamNotFoundError();

  const data = snap.data()!;
  if (data.status !== 'in_progress') throw new ExamAlreadyCompletedError();

  const questionIds = data.questionIds as string[];
  if (!questionIds.includes(questionId)) throw new QuestionNotInExamError();

  await docRef.update({
    [`answers.${questionId}`]: selectedOptionIndex,
  });
}

// ── Submit exam ──────────────────────────────────

export async function submitExam(
  uid: string,
  examId: string,
  clientAnswers?: Record<string, number | null>
): Promise<SubmitExamResult> {
  const exam = await getExam(uid, examId);

  if (exam.status !== 'in_progress') throw new ExamAlreadyCompletedError();

  // Server-side timer validation
  if (exam.config.timeLimitMinutes > 0 && exam.startedAt) {
    const startMs =
      typeof exam.startedAt === 'object' && 'seconds' in exam.startedAt
        ? (exam.startedAt as { seconds: number }).seconds * 1000
        : new Date(exam.startedAt as unknown as string).getTime();
    const allowedMs =
      (exam.config.timeLimitMinutes * 60 + GRACE_PERIOD_SECONDS) * 1000;
    if (Date.now() - startMs > allowedMs) {
      throw new ExamTimeLimitExceededError();
    }
  }

  // Reconcile client-side answers with server-side
  let finalAnswers = { ...exam.answers };
  if (clientAnswers && typeof clientAnswers === 'object') {
    for (const [qId, answer] of Object.entries(clientAnswers)) {
      if (
        exam.questionIds.includes(qId) &&
        (typeof answer === 'number' || answer === null)
      ) {
        finalAnswers[qId] = answer as number | null;
      }
    }
  }

  // Use stored correct answers from the already-fetched exam doc (avoids double-read)
  const db = getAdminDb();
  const examRaw = exam as unknown as Record<string, unknown>;
  const storedCorrectAnswers = examRaw.questionCorrectAnswers as
    | Record<string, number>
    | undefined;
  const storedDomains = examRaw.questionDomains as
    | Record<string, string>
    | undefined;

  let score: number;
  let domainScores: Record<string, DomainScore>;
  let totalQuestions: number;

  if (storedCorrectAnswers && storedDomains) {
    const result = scoreFromStored(
      finalAnswers,
      storedCorrectAnswers,
      storedDomains
    );
    score = result.score;
    domainScores = result.domainScores;
    totalQuestions = Object.keys(storedCorrectAnswers).length;
  } else {
    // Legacy fallback: fetch questions
    const questionsCol = db.collection(`users/${uid}/questions`);
    const questionRefs = exam.questionIds.map((id) => questionsCol.doc(id));
    const questionSnaps = await db.getAll(...questionRefs);
    const questions: Question[] = questionSnaps
      .filter((snap) => snap.exists)
      .map((snap) => ({ id: snap.id, ...snap.data() }) as Question);

    const result = scoreExam(questions, finalAnswers);
    score = result.score;
    domainScores = result.domainScores;
    totalQuestions = questions.length;
  }

  // Calculate time spent
  const startSeconds =
    typeof exam.startedAt === 'object' && 'seconds' in exam.startedAt
      ? (exam.startedAt as { seconds: number }).seconds
      : Math.floor(
          new Date(exam.startedAt as unknown as string).getTime() / 1000
        );
  const timeSpentSeconds = Math.floor(Date.now() / 1000) - startSeconds;
  const now = serverTimestamp();

  // Atomic batch write: exam update + user profile + exam history + study counter + performance summary
  const batch = db.batch();

  batch.update(db.doc(`${examsPath(uid)}/${examId}`), {
    status: 'completed',
    score,
    domainScores,
    answers: finalAnswers,
    completedAt: now,
    timeSpentSeconds,
  });

  const userRef = db.collection('users').doc(uid);
  batch.set(
    userRef,
    {
      uid,
      lastActiveAt: now,
      examsTaken: FieldValue.increment(1),
    },
    { merge: true }
  );

  batch.set(userRef.collection('examHistory').doc(examId), {
    examId,
    studyId: exam.studyId,
    score,
    questionCount: totalQuestions,
    timeSpentSeconds,
    completedAt: now,
  });

  // Increment exam count on study
  const studyRef = db.doc(`users/${uid}/studies/${exam.studyId}`);
  batch.update(studyRef, { examCount: FieldValue.increment(1) });

  // Update performance summary (single-doc denormalized analytics)
  if (storedCorrectAnswers && storedDomains) {
    const existingSummary = await getPerformanceSummary(uid, exam.studyId);
    const summaryUpdate = buildPerformanceSummaryUpdate(
      uid,
      {
        studyId: exam.studyId,
        questionIds: exam.questionIds,
        answers: finalAnswers,
        correctAnswers: storedCorrectAnswers,
        questionDomains: storedDomains,
      },
      existingSummary
    );
    batch.set(db.doc(summaryUpdate.path), summaryUpdate.data);
  }

  await batch.commit();

  const correctAnswers = Math.round((score / 100) * totalQuestions);

  // Check if all domains are ≥70%
  const dsValues = Object.values(domainScores);
  const allDomainsPass =
    dsValues.length > 0 && dsValues.every((ds) => ds.percentage >= 70);

  // Compute new badges synchronously before fire-and-forget
  const currentStats = await getStats(uid);
  const oldBadges = new Set(currentStats.badges);
  const newBadges: BadgeId[] = [];

  // Rule-based badge checks
  if (!oldBadges.has('first_exam')) newBadges.push('first_exam');
  if (score === 100 && !oldBadges.has('perfect_score'))
    newBadges.push('perfect_score');
  if (allDomainsPass && !oldBadges.has('domain_master'))
    newBadges.push('domain_master');
  if (
    currentStats.totalQuestionsAnswered + totalQuestions >= 100 &&
    !oldBadges.has('centurion')
  )
    newBadges.push('centurion');

  // Streak-based badge checks (project streak after this activity)
  const today = new Date().toISOString().split('T')[0];
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  })();
  let projectedStreak = currentStats.currentStreak;
  if (currentStats.lastActiveDate === yesterday) projectedStreak += 1;
  else if (currentStats.lastActiveDate !== today) projectedStreak = 1;
  if (projectedStreak >= 3 && !oldBadges.has('streak_3'))
    newBadges.push('streak_3');
  if (projectedStreak >= 7 && !oldBadges.has('streak_7'))
    newBadges.push('streak_7');
  if (projectedStreak >= 30 && !oldBadges.has('streak_30'))
    newBadges.push('streak_30');

  // Post-commit: stats, badges, averageScore (all fire-and-forget, non-blocking)
  recalculateAverageScore(uid).catch(() => {});

  recordActivity(uid, totalQuestions, correctAnswers, true).catch(() => {});

  if (score === 100) {
    awardBadge(uid, 'perfect_score').catch(() => {});
  }
  if (allDomainsPass) {
    awardBadge(uid, 'domain_master').catch(() => {});
  }

  // Fire-and-forget: update marketplace-level performance stats (distractor tracking)
  // Looks up which user questions have a marketplace source and aggregates cross-user stats
  updateMarketplacePerformanceStats(
    uid,
    exam.questionIds,
    finalAnswers,
    storedCorrectAnswers ?? {}
  ).catch(() => {});

  return {
    examId,
    score,
    domainScores,
    totalQuestions,
    correctAnswers,
    newBadges,
  };
}

// ── Abandon exam ─────────────────────────────────

export async function abandonExam(uid: string, examId: string): Promise<void> {
  const exam = await getExam(uid, examId);
  if (exam.status !== 'in_progress') throw new ExamAlreadyCompletedError();

  await getAdminDb()
    .doc(`${examsPath(uid)}/${examId}`)
    .update({
      status: 'abandoned',
      completedAt: serverTimestamp(),
    });
}

// ── Get in-progress exam for resume ──────────────

export async function getInProgressExam(
  uid: string,
  studyId?: string
): Promise<Exam | null> {
  const db = getAdminDb();
  let q: FirebaseFirestore.Query = db
    .collection(examsPath(uid))
    .where('status', '==', 'in_progress');

  if (studyId) q = q.where('studyId', '==', studyId);

  q = q.orderBy('startedAt', 'desc').limit(1);

  const snap = await q.get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Exam;
}

/**
 * Resume an in-progress exam — returns questions (sanitized) for the session.
 * Includes server-calculated remaining time for timer sync.
 */
export async function resumeExam(
  uid: string,
  examId: string
): Promise<CreateExamResult & { serverRemainingSeconds?: number }> {
  const exam = await getExam(uid, examId);
  if (exam.status !== 'in_progress') throw new ExamAlreadyCompletedError();

  // Calculate server-side remaining time for timer sync
  let serverRemainingSeconds: number | undefined;
  if (exam.config.timeLimitMinutes > 0 && exam.startedAt) {
    const startMs =
      typeof exam.startedAt === 'object' && 'seconds' in exam.startedAt
        ? (exam.startedAt as { seconds: number }).seconds * 1000
        : new Date(exam.startedAt as unknown as string).getTime();
    const elapsedSeconds = Math.floor((Date.now() - startMs) / 1000);
    const totalSeconds = exam.config.timeLimitMinutes * 60;
    serverRemainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
  }

  // Fetch actual questions from user's bank
  const db = getAdminDb();
  const questionsCol = db.collection(`users/${uid}/questions`);
  const questionRefs = exam.questionIds.map((id) => questionsCol.doc(id));
  const questionSnaps = await db.getAll(...questionRefs);
  const questions = questionSnaps
    .filter((s) => s.exists)
    .map((s) => ({ id: s.id, ...s.data() }) as Question);

  return {
    id: examId,
    studyId: exam.studyId,
    status: exam.status,
    config: exam.config,
    questions: sanitizeQuestionsForExam(questions),
    serverRemainingSeconds,
  };
}

// ── Exam review (post-completion) ────────────────

export interface ExamReviewQuestion {
  id: string;
  text: string;
  options: Array<{ label: string; text: string }>;
  domainIds: string[];
  difficulty: string;
  correctOptionIndex: number;
  explanation: { short: string; whyOthersWrong: Record<string, string> };
  userAnswer: number | null;
  isCorrect: boolean;
}

export async function getExamReview(
  uid: string,
  examId: string
): Promise<{
  exam: Exam;
  questions: ExamReviewQuestion[];
}> {
  const exam = await getExam(uid, examId);
  if (exam.status !== 'completed') {
    throw new ExamAlreadyCompletedError();
  }

  // Fetch questions with answers
  const db = getAdminDb();
  const questionsCol = db.collection(`users/${uid}/questions`);
  const questionRefs = exam.questionIds.map((id) => questionsCol.doc(id));
  const questionSnaps = await db.getAll(...questionRefs);
  const questions: ExamReviewQuestion[] = questionSnaps
    .filter((s) => s.exists)
    .map((s) => {
      const data = s.data()!;
      const qId = s.id;
      const userAnswer = exam.answers[qId] ?? null;
      // Normalize explanation: support legacy string format
      const rawExplanation = data.explanation;
      const explanation =
        typeof rawExplanation === 'string'
          ? {
              short: rawExplanation,
              whyOthersWrong: data.whyOthersWrong
                ? { _legacy: data.whyOthersWrong }
                : {},
            }
          : {
              short: rawExplanation?.short || '',
              whyOthersWrong: rawExplanation?.whyOthersWrong || {},
            };
      return {
        id: qId,
        text: data.text,
        options: data.options,
        domainIds: data.domainIds || [],
        difficulty: data.difficulty,
        correctOptionIndex: data.correctOptionIndex,
        explanation,
        userAnswer,
        isCorrect: userAnswer === data.correctOptionIndex,
      };
    });

  return { exam, questions };
}

// ── Analytics (see exam-analytics-service.ts) ───
// getAnalytics and recalculateAverageScore have been extracted
// to exam-analytics-service.ts for better cohesion.
// Re-export for backward compatibility with existing imports.
export {
  getAnalytics,
  type AnalyticsData,
} from '@/services/exam-analytics-service';

// ── Helpers ──────────────────────────────────────

/** Score from stored correct answers — no question re-fetch needed */
function scoreFromStored(
  answers: Record<string, number | null>,
  correctAnswers: Record<string, number>,
  domains: Record<string, string>
): { score: number; domainScores: Record<string, DomainScore> } {
  const domainMap = new Map<
    string,
    { correct: number; total: number; domainId: string; domain: string }
  >();
  let totalCorrect = 0;
  const totalQuestions = Object.keys(correctAnswers).length;

  for (const [qId, correctIndex] of Object.entries(correctAnswers)) {
    const userAnswer = answers[qId];
    const isCorrect = userAnswer === correctIndex;
    if (isCorrect) totalCorrect++;

    const domainId = domains[qId] || '_none';
    const existing = domainMap.get(domainId) || {
      correct: 0,
      total: 0,
      domainId,
      domain: domainId,
    };
    existing.total++;
    if (isCorrect) existing.correct++;
    domainMap.set(domainId, existing);
  }

  const domainScores: Record<string, DomainScore> = {};
  for (const [key, val] of domainMap) {
    domainScores[key] = {
      domainId: val.domainId,
      domain: val.domain,
      correct: val.correct,
      total: val.total,
      percentage:
        val.total > 0 ? Math.round((val.correct / val.total) * 100) : 0,
    };
  }

  const score =
    totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  return { score, domainScores };
}

/**
 * Fire-and-forget: update marketplace-level cross-user performance stats.
 * Looks up which user questions originated from marketplace imports,
 * then calls updateQuestionPerformanceStats for each marketplace source question.
 */
async function updateMarketplacePerformanceStats(
  uid: string,
  questionIds: string[],
  answers: Record<string, number | null>,
  correctAnswers: Record<string, number>
): Promise<void> {
  if (questionIds.length === 0) return;

  const db = getAdminDb();
  const questionsCol = db.collection(`users/${uid}/questions`);

  // Batch-fetch user questions to check for marketplace source
  const refs = questionIds.map((id) => questionsCol.doc(id));
  const snaps = await db.getAll(...refs);

  for (const snap of snaps) {
    if (!snap.exists) continue;

    const data = snap.data()!;
    const marketplaceQuestionId = data['_source.marketplaceQuestionId'] as
      | string
      | undefined;
    if (!marketplaceQuestionId) continue;

    const userAnswer = answers[snap.id];
    const correctIndex = correctAnswers[snap.id];
    if (correctIndex === undefined) continue;

    const isCorrect = userAnswer === correctIndex;
    const skipped = userAnswer === null || userAnswer === undefined;

    try {
      await updateQuestionPerformanceStats(
        marketplaceQuestionId,
        isCorrect,
        userAnswer ?? -1,
        0, // timeMs not available per-question
        skipped
      );
    } catch {
      // Non-critical — silently continue for other questions
    }
  }
}

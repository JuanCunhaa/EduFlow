/**
 * ExamService — encapsulates all exam-related business logic and data access.
 * Includes: creation, answer saving, submission, scoring, listing, resume.
 */

import { getAdminDb } from '@/lib/firebase/admin';
import {
    adminGetDoc,
    adminCreateDoc,
    serverTimestamp,
} from '@/lib/firebase/admin-firestore';
import { selectQuestions, sanitizeQuestionsForExam, scoreExam } from '@/lib/exam-engine';
import { rateLimit } from '@/lib/rate-limit';
import {
    ExamNotFoundError,
    ExamAlreadyCompletedError,
    ExamTimeLimitExceededError,
    QuestionNotInExamError,
    NoQuestionsAvailableError,
    RateLimitError,
} from '@/lib/errors';
import { fetchQuestionPool } from '@/services/question-service';
import { FieldValue } from 'firebase-admin/firestore';
import type { Exam, Question, ExamConfig, DomainScore } from '@/types';

const GRACE_PERIOD_SECONDS = 30;

// ── Types ────────────────────────────────────────

export interface CreateExamInput {
    certification: string;
    questionCount: number;
    timeLimitMinutes: number;
    domains: number[];
    difficulty: string;
}

export interface CreateExamResult {
    id: string;
    certification: string;
    status: string;
    config: {
        questionCount: number;
        timeLimitMinutes: number;
        domains: number[];
        difficulty: string;
    };
    questions: ReturnType<typeof sanitizeQuestionsForExam>;
}

export interface SubmitExamResult {
    examId: string;
    score: number;
    domainScores: Record<string, DomainScore>;
    totalQuestions: number;
    correctAnswers: number;
}

// ── List exams ───────────────────────────────────

export interface ListExamsOptions {
    uid: string;
    limit?: number;
    status?: string;
}

export async function listExams(options: ListExamsOptions): Promise<Exam[]> {
    const { uid, limit: limitParam = 20, status } = options;
    const limitCount = Math.min(Math.max(1, limitParam), 50);
    const db = getAdminDb();

    let q: FirebaseFirestore.Query = db
        .collection('exams')
        .where('userId', '==', uid);

    if (status) {
        q = q.where('status', '==', status);
    }

    q = q.orderBy('startedAt', 'desc').limit(limitCount);

    const snap = await q.get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Exam);
}

// ── Get single exam ──────────────────────────────

export async function getExam(uid: string, examId: string): Promise<Exam> {
    const exam = await adminGetDoc<Exam>('exams', examId);
    if (!exam || exam.userId !== uid) throw new ExamNotFoundError();
    return exam;
}

/**
 * Get exam for client display.
 * In-progress exams strip questionIds to prevent answer lookup cheating.
 */
export async function getExamForClient(uid: string, examId: string): Promise<Partial<Exam>> {
    const exam = await getExam(uid, examId);

    if (exam.status === 'in_progress') {
        const { questionIds: _, ...safeExam } = exam;
        return safeExam;
    }

    return exam;
}

// ── Create exam ──────────────────────────────────

export async function createExam(uid: string, config: CreateExamInput): Promise<CreateExamResult> {
    // Rate limit: max 5 exam creations per minute per user
    // failOpen=false: deny on error (sensitive operation)
    const allowed = await rateLimit(`exam-create:${uid}`, 5, 60_000, false);
    if (!allowed) throw new RateLimitError();

    const fetchLimit = Math.min(config.questionCount * 5, 500);

    const allQuestions = await fetchQuestionPool({
        uid,
        certification: config.certification,
        difficulty: config.difficulty,
        domains: config.domains.length > 0 ? config.domains : undefined,
        limit: fetchLimit,
    });

    if (allQuestions.length === 0) {
        throw new NoQuestionsAvailableError('No questions available for this certification');
    }

    const selected = selectQuestions(allQuestions, {
        ...config,
        domains: config.domains,
        difficulty: config.difficulty as ExamConfig['difficulty'],
    });

    if (selected.length === 0) {
        throw new NoQuestionsAvailableError('No questions match your filters');
    }

    // Initialize empty answers
    const answers: Record<string, null> = {};
    for (const q of selected) {
        answers[q.id] = null;
    }

    // Store correctOptionIndex per question in the exam doc
    // This eliminates the need to re-fetch all questions during scoring
    const questionCorrectAnswers: Record<string, number> = {};
    for (const q of selected) {
        questionCorrectAnswers[q.id] = q.correctOptionIndex;
    }

    const now = serverTimestamp();
    const examData = {
        userId: uid,
        certification: config.certification,
        status: 'in_progress',
        config: {
            questionCount: selected.length,
            timeLimitMinutes: config.timeLimitMinutes,
            domains: config.domains,
            difficulty: config.difficulty,
        },
        questionIds: selected.map(q => q.id),
        questionCorrectAnswers, // New: stored at creation time for scoring
        questionDomains: selected.reduce((acc, q) => {
            acc[q.id] = q.domain;
            return acc;
        }, {} as Record<string, string>),
        answers,
        score: null,
        domainScores: {},
        startedAt: now,
        completedAt: null,
        timeSpentSeconds: 0,
    };

    const examId = await adminCreateDoc('exams', examData);

    return {
        id: examId,
        certification: config.certification,
        status: 'in_progress',
        config: {
            questionCount: selected.length,
            timeLimitMinutes: config.timeLimitMinutes,
            domains: config.domains,
            difficulty: config.difficulty,
        },
        questions: sanitizeQuestionsForExam(selected),
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
    const docRef = db.collection('exams').doc(examId);
    const snap = await docRef.get();

    if (!snap.exists) throw new ExamNotFoundError();

    const data = snap.data()!;
    if (data.userId !== uid) throw new ExamNotFoundError();
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
        const startMs = typeof exam.startedAt === 'object' && 'seconds' in exam.startedAt
            ? (exam.startedAt as { seconds: number }).seconds * 1000
            : new Date(exam.startedAt as unknown as string).getTime();
        const allowedMs = (exam.config.timeLimitMinutes * 60 + GRACE_PERIOD_SECONDS) * 1000;
        if (Date.now() - startMs > allowedMs) {
            throw new ExamTimeLimitExceededError();
        }
    }

    // Reconcile client-side answers with server-side
    let finalAnswers = { ...exam.answers };
    if (clientAnswers && typeof clientAnswers === 'object') {
        for (const [qId, answer] of Object.entries(clientAnswers)) {
            if (exam.questionIds.includes(qId) && (typeof answer === 'number' || answer === null)) {
                finalAnswers[qId] = answer as number | null;
            }
        }
    }

    // Use stored correct answers instead of batch-reading all question documents
    const examDoc = await getAdminDb().collection('exams').doc(examId).get();
    const examData = examDoc.data()!;
    const storedCorrectAnswers = examData.questionCorrectAnswers as Record<string, number> | undefined;
    const storedDomains = examData.questionDomains as Record<string, string> | undefined;

    let score: number;
    let domainScores: Record<string, DomainScore>;
    let totalQuestions: number;

    if (storedCorrectAnswers && storedDomains) {
        // New path: score from stored data — zero additional reads
        const result = scoreFromStored(finalAnswers, storedCorrectAnswers, storedDomains);
        score = result.score;
        domainScores = result.domainScores;
        totalQuestions = Object.keys(storedCorrectAnswers).length;
    } else {
        // Legacy fallback: fetch questions (for exams created before migration)
        const db = getAdminDb();
        const questionsCol = db.collection(`users/${uid}/questions`);
        const questionRefs = exam.questionIds.map(id => questionsCol.doc(id));
        const questionSnaps = await db.getAll(...questionRefs);
        const questions: Question[] = questionSnaps
            .filter(snap => snap.exists)
            .map(snap => ({ id: snap.id, ...snap.data() }) as Question);

        const result = scoreExam(questions, finalAnswers);
        score = result.score;
        domainScores = result.domainScores;
        totalQuestions = questions.length;
    }

    // Calculate time spent
    const startSeconds = typeof exam.startedAt === 'object' && 'seconds' in exam.startedAt
        ? (exam.startedAt as { seconds: number }).seconds
        : Math.floor(new Date(exam.startedAt as unknown as string).getTime() / 1000);
    const timeSpentSeconds = Math.floor(Date.now() / 1000) - startSeconds;
    const now = serverTimestamp();

    // Atomic batch write: exam update + user profile + exam history
    const db = getAdminDb();
    const batch = db.batch();

    batch.update(db.collection('exams').doc(examId), {
        status: 'completed',
        score,
        domainScores,
        answers: finalAnswers,
        completedAt: now,
        timeSpentSeconds,
    });

    const userRef = db.collection('users').doc(uid);
    batch.set(userRef, {
        uid,
        lastActiveAt: now,
        examsTaken: FieldValue.increment(1),
        totalScoreAccumulator: FieldValue.increment(score),
    }, { merge: true });

    batch.set(userRef.collection('examHistory').doc(examId), {
        examId,
        certification: exam.certification,
        score,
        questionCount: totalQuestions,
        timeSpentSeconds,
        completedAt: now,
    });

    await batch.commit();

    // Post-commit: recalculate averageScore for consistency
    // (prevents drift from concurrent writes)
    await recalculateAverageScore(uid);

    return {
        examId,
        score,
        domainScores,
        totalQuestions,
        correctAnswers: Math.round((score / 100) * totalQuestions),
    };
}

// ── Abandon exam ─────────────────────────────────

export async function abandonExam(uid: string, examId: string): Promise<void> {
    const exam = await getExam(uid, examId);
    if (exam.status !== 'in_progress') throw new ExamAlreadyCompletedError();

    await getAdminDb().collection('exams').doc(examId).update({
        status: 'abandoned',
        completedAt: serverTimestamp(),
    });
}

// ── Get in-progress exam for resume ──────────────

export async function getInProgressExam(uid: string): Promise<Exam | null> {
    const db = getAdminDb();
    const snap = await db
        .collection('exams')
        .where('userId', '==', uid)
        .where('status', '==', 'in_progress')
        .orderBy('startedAt', 'desc')
        .limit(1)
        .get();

    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as Exam;
}

/**
 * Resume an in-progress exam — returns questions (sanitized) for the session.
 */
export async function resumeExam(uid: string, examId: string): Promise<CreateExamResult> {
    const exam = await getExam(uid, examId);
    if (exam.status !== 'in_progress') throw new ExamAlreadyCompletedError();

    // Fetch actual questions from user's bank
    const db = getAdminDb();
    const questionsCol = db.collection(`users/${uid}/questions`);
    const questionRefs = exam.questionIds.map(id => questionsCol.doc(id));
    const questionSnaps = await db.getAll(...questionRefs);
    const questions = questionSnaps
        .filter(s => s.exists)
        .map(s => ({ id: s.id, ...s.data() }) as Question);

    return {
        id: examId,
        certification: exam.certification,
        status: exam.status,
        config: exam.config,
        questions: sanitizeQuestionsForExam(questions),
    };
}

// ── Exam review (post-completion) ────────────────

export interface ExamReviewQuestion {
    id: string;
    text: string;
    options: Array<{ label: string; text: string }>;
    domain: string;
    domainNumber: number;
    difficulty: string;
    correctOptionIndex: number;
    explanation: string;
    userAnswer: number | null;
    isCorrect: boolean;
}

export async function getExamReview(uid: string, examId: string): Promise<{
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
    const questionRefs = exam.questionIds.map(id => questionsCol.doc(id));
    const questionSnaps = await db.getAll(...questionRefs);
    const questions: ExamReviewQuestion[] = questionSnaps
        .filter(s => s.exists)
        .map(s => {
            const data = s.data()!;
            const qId = s.id;
            const userAnswer = exam.answers[qId] ?? null;
            return {
                id: qId,
                text: data.text,
                options: data.options,
                domain: data.domain,
                domainNumber: data.domainNumber,
                difficulty: data.difficulty,
                correctOptionIndex: data.correctOptionIndex,
                explanation: data.explanation,
                userAnswer,
                isCorrect: userAnswer === data.correctOptionIndex,
            };
        });

    return { exam, questions };
}

// ── Analytics ────────────────────────────────────

export interface AnalyticsData {
    totalExams: number;
    avgScore: number;
    passRate: number;
    scoreTrend: Array<{ score: number; certification: string; date: string }>;
    certBreakdown: Record<string, { exams: number; avgScore: number }>;
    domainStats: Array<{ domain: string; percentage: number; correct: number; total: number }>;
    readiness: number;
}

export async function getAnalytics(uid: string): Promise<AnalyticsData> {
    const exams = await listExams({ uid, limit: 50, status: 'completed' });

    const total = exams.length;
    const avg = total > 0
        ? Math.round(exams.reduce((sum, e) => sum + (e.score || 0), 0) / total)
        : 0;
    const passedCount = exams.filter(e => (e.score || 0) >= 70).length;
    const passRate = total > 0 ? Math.round((passedCount / total) * 100) : 0;

    // Score trend (chronological)
    const trend = [...exams].reverse().map(e => ({
        score: e.score || 0,
        certification: e.certification,
        date: formatTimestamp(e.completedAt),
    }));

    // Cert breakdown
    const certs: Record<string, { exams: number; avgScore: number; scores: number[] }> = {};
    for (const exam of exams) {
        if (!certs[exam.certification]) {
            certs[exam.certification] = { exams: 0, avgScore: 0, scores: [] };
        }
        certs[exam.certification].exams++;
        certs[exam.certification].scores.push(exam.score || 0);
    }
    const certBreakdown: Record<string, { exams: number; avgScore: number }> = {};
    for (const [cert, data] of Object.entries(certs)) {
        certBreakdown[cert] = {
            exams: data.exams,
            avgScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
        };
    }

    // Domain aggregates
    const domainAgg: Record<string, { correct: number; total: number }> = {};
    for (const exam of exams) {
        if (exam.domainScores) {
            for (const [domain, ds] of Object.entries(exam.domainScores)) {
                if (!domainAgg[domain]) domainAgg[domain] = { correct: 0, total: 0 };
                domainAgg[domain].correct += ds.correct;
                domainAgg[domain].total += ds.total;
            }
        }
    }
    const domainStats = Object.entries(domainAgg)
        .map(([domain, { correct, total }]) => ({
            domain,
            percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
            correct,
            total,
        }))
        .sort((a, b) => a.percentage - b.percentage);

    const readiness = domainStats.length > 0
        ? Math.round(domainStats.reduce((sum, d) => sum + d.percentage, 0) / domainStats.length)
        : 0;

    return { totalExams: total, avgScore: avg, passRate, scoreTrend: trend, certBreakdown, domainStats, readiness };
}

// ── Helpers ──────────────────────────────────────

/** Score from stored correct answers — no question re-fetch needed */
function scoreFromStored(
    answers: Record<string, number | null>,
    correctAnswers: Record<string, number>,
    domains: Record<string, string>
): { score: number; domainScores: Record<string, DomainScore> } {
    const domainMap = new Map<string, { correct: number; total: number; domain: string }>();
    let totalCorrect = 0;
    const totalQuestions = Object.keys(correctAnswers).length;

    for (const [qId, correctIndex] of Object.entries(correctAnswers)) {
        const userAnswer = answers[qId];
        const isCorrect = userAnswer === correctIndex;
        if (isCorrect) totalCorrect++;

        const domain = domains[qId] || 'Unknown';
        const existing = domainMap.get(domain) || { correct: 0, total: 0, domain };
        existing.total++;
        if (isCorrect) existing.correct++;
        domainMap.set(domain, existing);
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

    const score = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    return { score, domainScores };
}

/** Recalculate averageScore from actual exam history to prevent drift */
async function recalculateAverageScore(uid: string): Promise<void> {
    const db = getAdminDb();
    const historySnap = await db
        .collection(`users/${uid}/examHistory`)
        .orderBy('completedAt', 'desc')
        .limit(100)
        .get();

    if (historySnap.empty) return;

    let totalScore = 0;
    let count = 0;
    for (const doc of historySnap.docs) {
        const data = doc.data();
        if (typeof data.score === 'number') {
            totalScore += data.score;
            count++;
        }
    }

    if (count > 0) {
        await db.collection('users').doc(uid).set({
            averageScore: Math.round(totalScore / count),
            examsTaken: count,
        }, { merge: true });
    }
}

function formatTimestamp(ts: unknown): string {
    if (!ts) return '';
    const date = typeof ts === 'object' && ts !== null && 'seconds' in ts
        ? new Date((ts as { seconds: number }).seconds * 1000)
        : new Date(ts as string);
    return date.toISOString().split('T')[0];
}

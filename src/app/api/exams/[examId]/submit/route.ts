import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/firebase/server-auth';
import {
    adminGetDoc,
    serverTimestamp,
} from '@/lib/firebase/admin-firestore';
import { scoreExam } from '@/lib/exam-engine';
import type { Exam, Question } from '@/types';
import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

interface RouteParams {
    params: Promise<{ examId: string }>;
}

const GRACE_PERIOD_SECONDS = 30; // Network latency tolerance

/**
 * POST /api/exams/[examId]/submit
 * Finalize exam: validate timer, calculate score, update user stats, create history entry.
 * Accepts optional { answers } body for client-side reconciliation.
 * Uses batch read (getAll) and atomic batch write.
 */
export async function POST(request: Request, { params }: RouteParams) {
    try {
        const user = await requireAuth();
        const { examId } = await params;

        const exam = await adminGetDoc<Exam>('exams', examId);
        if (!exam || exam.userId !== user.uid) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
        if (exam.status !== 'in_progress') {
            return NextResponse.json({ error: 'Exam already completed' }, { status: 400 });
        }

        // P0 #3: Server-side timer validation
        if (exam.config.timeLimitMinutes > 0 && exam.startedAt) {
            const startMs = typeof exam.startedAt === 'object' && 'seconds' in exam.startedAt
                ? (exam.startedAt as { seconds: number }).seconds * 1000
                : new Date(exam.startedAt as unknown as string).getTime();
            const allowedMs = (exam.config.timeLimitMinutes * 60 + GRACE_PERIOD_SECONDS) * 1000;
            if (Date.now() - startMs > allowedMs) {
                return NextResponse.json(
                    { error: 'Exam time limit exceeded' },
                    { status: 400 }
                );
            }
        }

        // P2 #12: Reconcile client-side answers with server-side
        let finalAnswers = { ...exam.answers };
        try {
            const body = await request.json();
            if (body?.answers && typeof body.answers === 'object') {
                // Client answers take precedence (covers fire-and-forget failures)
                for (const [qId, answer] of Object.entries(body.answers)) {
                    if (exam.questionIds.includes(qId) && (typeof answer === 'number' || answer === null)) {
                        finalAnswers[qId] = answer as number | null;
                    }
                }
            }
        } catch {
            // No body or invalid JSON — use server-side answers only
        }

        // Batch-read all questions from user's personal bank
        const db = getAdminDb();
        const questionsCol = db.collection(`users/${user.uid}/questions`);
        const questionRefs = exam.questionIds.map(id => questionsCol.doc(id));
        const questionSnaps = await db.getAll(...questionRefs);
        const questions: Question[] = questionSnaps
            .filter(snap => snap.exists)
            .map(snap => ({ id: snap.id, ...snap.data() }) as Question);

        // Score the exam
        const { score, domainScores } = scoreExam(questions, finalAnswers);
        const now = serverTimestamp();

        // Calculate time spent
        const startSeconds = typeof exam.startedAt === 'object' && 'seconds' in exam.startedAt
            ? (exam.startedAt as { seconds: number }).seconds
            : Math.floor(new Date(exam.startedAt as unknown as string).getTime() / 1000);
        const timeSpentSeconds = Math.floor(Date.now() / 1000) - startSeconds;

        // Atomic batch write: exam update + user profile + exam history
        const batch = db.batch();

        // 1. Update exam document
        batch.update(db.collection('exams').doc(examId), {
            status: 'completed',
            score,
            domainScores,
            answers: finalAnswers,
            completedAt: now,
            timeSpentSeconds,
        });

        // 2. Update user profile — P0 #4: track totalScoreAccumulator for averageScore
        const userRef = db.collection('users').doc(user.uid);
        batch.set(userRef, {
            uid: user.uid,
            email: user.email,
            lastActiveAt: now,
            examsTaken: FieldValue.increment(1),
            totalScoreAccumulator: FieldValue.increment(score),
        }, { merge: true });

        // 3. Add to user's exam history subcollection
        batch.set(userRef.collection('examHistory').doc(examId), {
            examId,
            certification: exam.certification,
            score,
            questionCount: questions.length,
            timeSpentSeconds,
            completedAt: now,
        });

        await batch.commit();

        return NextResponse.json({
            data: {
                examId,
                score,
                domainScores,
                totalQuestions: questions.length,
                correctAnswers: Math.round((score / 100) * questions.length),
            },
        });
    } catch (error) {
        if (error instanceof Response) return error;
        console.error('POST /api/exams/[id]/submit error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

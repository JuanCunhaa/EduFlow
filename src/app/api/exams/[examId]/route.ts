import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/firebase/server-auth';
import { adminGetDoc } from '@/lib/firebase/admin-firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { submitAnswerSchema } from '@/lib/validators';
import type { Exam } from '@/types';

interface RouteParams {
    params: Promise<{ examId: string }>;
}

/**
 * GET /api/exams/[examId]
 * Returns the exam. If in_progress, questions are fetched without correct answers.
 */
export async function GET(_request: Request, { params }: RouteParams) {
    try {
        const user = await requireAuth();
        const { examId } = await params;

        const exam = await adminGetDoc<Exam>('exams', examId);
        if (!exam || exam.userId !== user.uid) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        // Strip questionIds from in-progress exams to prevent answer lookup
        if (exam.status === 'in_progress') {
            const { questionIds: _, ...safeExam } = exam;
            return NextResponse.json({ data: safeExam });
        }

        return NextResponse.json({ data: exam });
    } catch (error) {
        if (error instanceof Response) return error;
        console.error('GET /api/exams/[id] error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * PATCH /api/exams/[examId]
 * Save a single answer during an active exam.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
    try {
        const user = await requireAuth();
        const { examId } = await params;

        // P2: Projected read — only fetch the 3 fields we need for validation
        const db = getAdminDb();
        const docRef = db.collection('exams').doc(examId);
        const snap = await docRef.get();

        if (!snap.exists) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const data = snap.data()!;
        if (data.userId !== user.uid) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
        if (data.status !== 'in_progress') {
            return NextResponse.json({ error: 'Exam already completed' }, { status: 400 });
        }

        const body = await request.json();
        const parsed = submitAnswerSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
        }

        const { questionId, selectedOptionIndex } = parsed.data;

        // Verify question belongs to this exam
        const questionIds = data.questionIds as string[];
        if (!questionIds.includes(questionId)) {
            return NextResponse.json({ error: 'Question not in this exam' }, { status: 400 });
        }

        // Direct update — no second read required
        await docRef.update({
            [`answers.${questionId}`]: selectedOptionIndex,
        });

        return NextResponse.json({ data: { saved: true } });
    } catch (error) {
        if (error instanceof Response) return error;
        console.error('PATCH /api/exams/[id] error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/firebase/server-auth';
import {
    adminQuery,
    adminCreateDoc,
    serverTimestamp,
} from '@/lib/firebase/admin-firestore';
import { selectQuestions, sanitizeQuestionsForExam } from '@/lib/exam-engine';
import { examConfigSchema } from '@/lib/validators';
import { rateLimit } from '@/lib/rate-limit';
import type { Question, Exam } from '@/types';

/**
 * GET /api/exams
 * List user's completed exams (most recent first).
 */
export async function GET(request: Request) {
    try {
        const user = await requireAuth();

        const { searchParams } = new URL(request.url);
        const limitCount = Math.min(
            Math.max(1, Number.parseInt(searchParams.get('limit') || '20', 10) || 20),
            50
        );

        const exams = await adminQuery<Exam>('exams', (ref) =>
            ref
                .where('userId', '==', user.uid)
                .orderBy('startedAt', 'desc')
                .limit(limitCount)
        );

        // P4: Short cache — new exams appear after creation
        const res = NextResponse.json({ data: exams });
        res.headers.set('Cache-Control', 'private, max-age=10, stale-while-revalidate=60');
        return res;
    } catch (error) {
        if (error instanceof Response) return error;
        console.error('GET /api/exams error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * POST /api/exams
 * Create a new exam: selects questions, creates exam document.
 */
export async function POST(request: Request) {
    try {
        const user = await requireAuth();

        const body = await request.json();
        const parsed = examConfigSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        // Rate limit: max 5 exam creations per minute per user
        if (!await rateLimit(`exam-create:${user.uid}`, 5, 60_000)) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }

        const config = parsed.data;

        // Query from user's personal question bank
        const fetchLimit = Math.min(config.questionCount * 5, 500);
        const allQuestions = await adminQuery<Question>(`users/${user.uid}/questions`, (ref) => {
            let q: FirebaseFirestore.Query = ref
                .where('certification', '==', config.certification);

            if (config.difficulty !== 'all') {
                q = q.where('difficulty', '==', config.difficulty);
            }

            if (config.domains.length > 0) {
                q = q.where('domainNumber', 'in', config.domains);
            }

            return q.limit(fetchLimit);
        });

        if (allQuestions.length === 0) {
            return NextResponse.json(
                { error: 'No questions available for this certification' },
                { status: 400 }
            );
        }

        // Select questions using the exam engine
        const selected = selectQuestions(allQuestions, config);

        if (selected.length === 0) {
            return NextResponse.json(
                { error: 'No questions match your filters' },
                { status: 400 }
            );
        }

        // Initialize empty answers
        const answers: Record<string, null> = {};
        for (const q of selected) {
            answers[q.id] = null;
        }

        const now = serverTimestamp();
        const examData = {
            userId: user.uid,
            certification: config.certification,
            status: 'in_progress',
            config: {
                questionCount: selected.length,
                timeLimitMinutes: config.timeLimitMinutes,
                domains: config.domains,
                difficulty: config.difficulty,
            },
            questionIds: selected.map((q) => q.id),
            answers,
            score: null,
            domainScores: {},
            startedAt: now,
            completedAt: null,
            timeSpentSeconds: 0,
        };

        const examId = await adminCreateDoc('exams', examData);

        // Return exam with sanitized questions (no correct answers)
        return NextResponse.json(
            {
                data: {
                    id: examId,
                    certification: examData.certification,
                    status: examData.status,
                    config: examData.config,
                    questions: sanitizeQuestionsForExam(selected),
                },
            },
            { status: 201 }
        );
    } catch (error) {
        if (error instanceof Response) return error;
        console.error('POST /api/exams error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

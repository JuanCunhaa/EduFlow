import { NextResponse } from 'next/server';
import { withAuth, withPlan } from '@/lib/api-middleware';
import { examConfigSchema } from '@/lib/validators';
import { listExams, createExam } from '@/services/exam-service';
import { checkScrapingSignals } from '@/lib/scraping-guard';
import { enforcePlanLimit } from '@/lib/plan-limits';

/**
 * GET /api/exams
 * List user's exams (most recent first). Optional ?studyId= and ?status= filters.
 * Protected by scraping guard.
 */
export const GET = withAuth(async (request, { user }) => {
    const guard = await checkScrapingSignals(request, user.uid, {
        category: 'exams-list',
        maxRequestsPerMinute: 20,
        maxRequestsPerHour: 120,
    });
    if (guard.blocked) {
        return NextResponse.json(
            { error: 'Too many requests. Please slow down.' },
            { status: 429 }
        );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(
        Math.max(1, Number.parseInt(searchParams.get('limit') || '20', 10) || 20),
        50
    );
    const status = searchParams.get('status') || undefined;
    const studyId = searchParams.get('studyId') || undefined;

    const exams = await listExams({ uid: user.uid, studyId, limit, status });

    const res = NextResponse.json({ data: exams });
    res.headers.set('Cache-Control', 'private, max-age=10, stale-while-revalidate=60');
    return res;
});

/**
 * POST /api/exams
 * Create a new exam: selects questions, creates exam document.
 * Enforces: daily exam limit, question count limit, exam mode restriction.
 */
export const POST = withPlan(async (request, { user, plan }) => {
    const body = await request.json();
    const parsed = examConfigSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Validation failed', details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    // ── Plan enforcement ──
    await enforcePlanLimit(user.uid, plan, 'daily_exam_limit');
    await enforcePlanLimit(user.uid, plan, 'exam_question_limit', {
        questionCount: parsed.data.questionCount,
    });
    await enforcePlanLimit(user.uid, plan, 'advanced_exam_modes', {
        mode: parsed.data.mode,
    });

    const result = await createExam(user.uid, parsed.data);
    return { data: result };
});

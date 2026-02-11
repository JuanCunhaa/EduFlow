import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-middleware';
import { examConfigSchema } from '@/lib/validators';
import { listExams, createExam } from '@/services/exam-service';

/**
 * GET /api/exams
 * List user's exams (most recent first). Optional ?status= filter.
 */
export const GET = withAuth(async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
        Math.max(1, Number.parseInt(searchParams.get('limit') || '20', 10) || 20),
        50
    );
    const status = searchParams.get('status') || undefined;

    const exams = await listExams({ uid: user.uid, limit, status });

    const res = NextResponse.json({ data: exams });
    res.headers.set('Cache-Control', 'private, max-age=10, stale-while-revalidate=60');
    return res;
});

/**
 * POST /api/exams
 * Create a new exam: selects questions, creates exam document.
 */
export const POST = withAuth(async (request, { user }) => {
    const body = await request.json();
    const parsed = examConfigSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Validation failed', details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    const result = await createExam(user.uid, parsed.data);
    return { data: result };
});

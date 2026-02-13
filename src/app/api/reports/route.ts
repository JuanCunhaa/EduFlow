import { NextResponse } from 'next/server';
import { withAuth, withAdmin } from '@/lib/api-middleware';
import { createQuestionReportSchema } from '@/lib/validators';
import {
    createQuestionReport,
    listQuestionReports,
    listUserReports,
} from '@/services/question-report-service';
import { REPORT_RATE_LIMIT } from '@/lib/constants';
import type { ReportStatus } from '@/types';
import { checkScrapingSignals } from '@/lib/scraping-guard';

/**
 * GET /api/reports
 * Admin: list all reports with filters (status, studyId, questionId).
 * Regular user: list own reports only.
 */
export const GET = withAuth(async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const isAdminUser = user.roles?.includes('admin');

    if (isAdminUser) {
        const result = await listQuestionReports({
            status: (searchParams.get('status') as ReportStatus) || undefined,
            studyId: searchParams.get('studyId') || undefined,
            questionId: searchParams.get('questionId') || undefined,
            limit: Number.parseInt(searchParams.get('limit') || '50', 10) || 50,
            cursor: searchParams.get('cursor') || undefined,
        });

        const res = NextResponse.json({ data: result.reports, nextCursor: result.nextCursor });
        res.headers.set('Cache-Control', 'private, max-age=10, stale-while-revalidate=30');
        return res;
    }

    // Regular users only see their own reports
    const limit = Math.min(
        Math.max(1, Number.parseInt(searchParams.get('limit') || '20', 10) || 20),
        50
    );
    const reports = await listUserReports(user.uid, limit);

    const res = NextResponse.json({ data: reports });
    res.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    return res;
});

/**
 * POST /api/reports
 * Create a question report. Rate-limited per user.
 */
export const POST = withAuth(async (request, { user }) => {
    // Rate-limit report creation
    const guard = await checkScrapingSignals(request, user.uid, {
        category: 'question-reports',
        maxRequestsPerMinute: 5,
        maxRequestsPerHour: REPORT_RATE_LIMIT,
    });
    if (guard.blocked) {
        return NextResponse.json(
            { error: 'Too many reports. Please slow down.' },
            { status: 429 }
        );
    }

    const body = await request.json();
    const parsed = createQuestionReportSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Validation failed', details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    const id = await createQuestionReport(user.uid, parsed.data);
    return { data: { id } };
});

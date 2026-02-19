import { NextResponse } from 'next/server';
import { withAdmin } from '@/lib/api-middleware';
import { resolveQuestionReportSchema } from '@/lib/validators';
import {
  resolveQuestionReport,
  getQuestionReport,
} from '@/services/question-report-service';

/**
 * GET /api/reports/[reportId]
 * Admin: fetch a single report by ID.
 */
export const GET = withAdmin(async (_request, { params }) => {
  const report = await getQuestionReport(params.reportId);
  return { data: report };
});

/**
 * POST /api/reports/[reportId]/resolve
 * Admin: resolve (or dismiss) a question report.
 */
export const POST = withAdmin(async (request, { user, params }) => {
  const body = await request.json();
  const parsed = resolveQuestionReportSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await resolveQuestionReport(params.reportId, user.uid, parsed.data);
  return { data: { success: true } };
});

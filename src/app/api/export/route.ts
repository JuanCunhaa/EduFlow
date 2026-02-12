import { NextResponse } from 'next/server';
import { withPlan } from '@/lib/api-middleware';
import { listExams } from '@/services/exam-service';
import { listStudies } from '@/services/study-service';
import { getStats } from '@/services/stats-service';

/**
 * GET /api/export?format=csv&studyId=xxx
 * Export user progress as CSV. Pro-only feature.
 */
export const GET = withPlan(async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const studyId = searchParams.get('studyId') || undefined;
    const format = searchParams.get('format') || 'csv';

    if (format !== 'csv') {
        return NextResponse.json({ error: 'Only CSV format is supported' }, { status: 400 });
    }

    const [exams, studies, stats] = await Promise.all([
        listExams({ uid: user.uid, studyId, limit: 50, status: 'completed', fullDocs: true }),
        listStudies(user.uid),
        getStats(user.uid),
    ]);

    const studyMap = new Map(studies.map(s => [s.id, s.name]));

    // Build CSV
    const headers = ['Date', 'Study', 'Score (%)', 'Questions', 'Correct', 'Time (min)', 'Mode', 'Pass/Fail'];
    const rows = exams.map(exam => {
        const date = exam.completedAt
            ? (typeof exam.completedAt === 'object' && 'seconds' in exam.completedAt
                ? new Date((exam.completedAt as { seconds: number }).seconds * 1000).toISOString().split('T')[0]
                : new Date(exam.completedAt as unknown as string).toISOString().split('T')[0])
            : '';
        const studyName = studyMap.get(exam.studyId) || exam.studyId;
        const questionCount = exam.config?.questionCount || exam.questionIds?.length || 0;
        const correct = exam.score != null ? Math.round((exam.score / 100) * questionCount) : 0;
        const timeMin = exam.timeSpentSeconds ? Math.round(exam.timeSpentSeconds / 60) : 0;
        const mode = exam.config?.mode || 'practice';
        const passFail = (exam.score || 0) >= 70 ? 'PASS' : 'FAIL';

        return [date, `"${studyName}"`, exam.score || 0, questionCount, correct, timeMin, mode, passFail];
    });

    // Summary section
    const summaryRows = [
        [],
        ['--- Summary ---'],
        ['Total Exams', stats.totalExamsCompleted],
        ['Total Questions Answered', stats.totalQuestionsAnswered],
        ['Current Streak', stats.currentStreak],
        ['Longest Streak', stats.longestStreak],
        ['Badges Earned', stats.badges.join('; ')],
    ];

    const csv = [
        headers.join(','),
        ...rows.map(r => r.join(',')),
        ...summaryRows.map(r => r.join(',')),
    ].join('\n');

    return new NextResponse(csv, {
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="isc2-progress-${new Date().toISOString().split('T')[0]}.csv"`,
        },
    });
}, 'pro');

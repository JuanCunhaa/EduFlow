import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-middleware';
import { getExamReview } from '@/services/exam-service';
import { checkScrapingSignals } from '@/lib/scraping-guard';

/**
 * GET /api/exams/[examId]/review
 * Get the post-exam review with correct/incorrect marking per question.
 * Only available for completed exams.
 * Protected by scraping guard — tighter limits since this reveals correct answers.
 */
export const GET = withAuth(async (request, { user, params }) => {
    // ── Scraping guard (strict: reveals correct answers) ──
    const guard = await checkScrapingSignals(request, user.uid, {
        category: 'exam-review',
        maxRequestsPerMinute: 10,
        maxRequestsPerHour: 60,
        blockThreshold: 60,  // lower threshold — answers are high-value content
    });
    if (guard.blocked) {
        return NextResponse.json(
            { error: 'Too many requests. Please slow down.' },
            { status: 429 }
        );
    }

    const review = await getExamReview(user.uid, params.examId);
    return { data: review };
});

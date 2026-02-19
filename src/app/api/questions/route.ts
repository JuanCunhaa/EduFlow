import { NextResponse } from 'next/server';
import { withAuth, withPlan } from '@/lib/api-middleware';
import { createQuestionSchema } from '@/lib/validators';
import { listQuestions, createQuestion } from '@/services/question-service';
import { checkScrapingSignals, addGuardHeaders } from '@/lib/scraping-guard';
import { enforcePlanLimit } from '@/lib/plan-limits';

/**
 * GET /api/questions
 * List the authenticated user's own questions with cursor pagination and search.
 * Requires ?studyId= query parameter.
 * Protected by scraping guard (fingerprinting + burst detection).
 */
export const GET = withAuth(async (request, { user }) => {
  // ── Scraping guard ──
  const guard = await checkScrapingSignals(request, user.uid, {
    category: 'questions-list',
    maxRequestsPerMinute: 30,
    maxRequestsPerHour: 200,
  });
  if (guard.blocked) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);

  const domainIdsParam = searchParams.get('domainIds');
  const domainIds = domainIdsParam
    ? domainIdsParam.split(',').filter(Boolean)
    : undefined;

  const result = await listQuestions({
    uid: user.uid,
    studyId: searchParams.get('studyId') || undefined,
    domainIds,
    difficulty: searchParams.get('difficulty') || undefined,
    search: searchParams.get('search') || undefined,
    cursor: searchParams.get('cursor') || undefined,
    limit: Number.parseInt(searchParams.get('limit') || '50', 10) || 50,
  });

  // Strip sensitive fields from list responses (content protection)
  const safeQuestions = result.questions.map(
    ({ correctOptionIndex: _, explanation: __, ...rest }) => rest
  );

  const res = NextResponse.json({
    data: safeQuestions,
    nextCursor: result.nextCursor,
  });
  res.headers.set(
    'Cache-Control',
    'private, max-age=60, stale-while-revalidate=300'
  );
  return addGuardHeaders(res, guard);
});

/**
 * POST /api/questions
 * Create a new question in the user's personal bank.
 * Enforces: question creation limit (free tier).
 */
export const POST = withPlan(async (request, { user, plan }) => {
  const body = await request.json();
  const parsed = createQuestionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // ── Plan enforcement ──
  await enforcePlanLimit(user.uid, plan, 'question_creation_limit');

  const id = await createQuestion(user.uid, parsed.data);
  return { data: { id } };
});

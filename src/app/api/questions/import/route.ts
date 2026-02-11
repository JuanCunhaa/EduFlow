import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-middleware';
import { bulkImportSchema } from '@/lib/validators';
import { importQuestions } from '@/services/question-service';
import { rateLimit } from '@/lib/rate-limit';

/**
 * POST /api/questions/import
 * Bulk import questions into the user's personal bank (max 500).
 * Rate limited: max 3 imports per minute per user.
 */
export const POST = withAuth(async (request, { user }) => {
    const allowed = await rateLimit(`import:${user.uid}`, 3, 60_000, false);
    if (!allowed) {
        return NextResponse.json(
            { error: 'Too many import requests. Max 3 per minute.' },
            { status: 429 }
        );
    }

    const body = await request.json();
    const parsed = bulkImportSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Validation failed', details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    const result = await importQuestions(user.uid, parsed.data.questions);
    return { data: result };
});

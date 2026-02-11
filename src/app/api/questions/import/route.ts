import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-middleware';
import { bulkImportSchema } from '@/lib/validators';
import { importQuestions } from '@/services/question-service';

/**
 * POST /api/questions/import
 * Bulk import questions into the user's personal bank (max 500).
 */
export const POST = withAuth(async (request, { user }) => {
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

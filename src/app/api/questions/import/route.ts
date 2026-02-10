import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/firebase/server-auth';
import { serverTimestamp } from '@/lib/firebase/admin-firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { bulkImportSchema } from '@/lib/validators';

/**
 * POST /api/questions/import
 * Bulk import questions into the user's personal bank.
 * Uses Firestore WriteBatch for atomic, single-round-trip writes (max 500).
 * Body: { questions: CreateQuestionInput[] }
 */
export async function POST(request: Request) {
    try {
        const user = await requireAuth();

        const body = await request.json();
        const parsed = bulkImportSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const now = serverTimestamp();
        const db = getAdminDb();
        const batch = db.batch();
        const ids: string[] = [];
        const questionsCol = db.collection(`users/${user.uid}/questions`);

        for (const question of parsed.data.questions) {
            const ref = questionsCol.doc();
            batch.set(ref, {
                ...question,
                createdAt: now,
                updatedAt: now,
            });
            ids.push(ref.id);
        }

        await batch.commit();

        return NextResponse.json(
            { data: { imported: ids.length, ids } },
            { status: 201 }
        );
    } catch (error) {
        if (error instanceof Response) return error;
        console.error('POST /api/questions/import error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-middleware';
import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * POST /api/packs/[packId]/submit — submit pack for review
 * Validates minimum requirements before transitioning to 'submitted'.
 */
export const POST = withAuth(async (_request, { user, log, params }) => {
    const { packId } = params;
    const db = getAdminDb();

    const doc = await db.collection('packs').doc(packId).get();
    if (!doc.exists) {
        return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
    }

    const pack = doc.data()!;
    if (pack.creatorId !== user.uid) {
        return NextResponse.json({ error: 'Not your pack' }, { status: 403 });
    }

    if (!['draft', 'revision_needed'].includes(pack.status)) {
        return NextResponse.json(
            { error: `Cannot submit pack in '${pack.status}' status` },
            { status: 400 }
        );
    }

    // Validate minimum requirements
    const errors: string[] = [];

    if (pack.questionCount < 15) {
        errors.push(`Need at least 15 questions (currently ${pack.questionCount})`);
    }
    if (!pack.description || pack.description.length < 100) {
        errors.push('Description must be at least 100 characters');
    }
    if (!pack.sampleQuestionIds || pack.sampleQuestionIds.length < 3) {
        errors.push('Mark at least 3 questions as preview samples');
    }
    if (pack.title && pack.title === pack.title.toUpperCase() && pack.title.length > 5) {
        errors.push('Title cannot be all uppercase');
    }

    // Check difficulty distribution
    const dist = pack.difficultyDistribution || {};
    const levels = [dist.easy > 0, dist.medium > 0, dist.hard > 0].filter(Boolean).length;
    if (levels < 2) {
        errors.push('Questions must span at least 2 difficulty levels');
    }

    if (errors.length > 0) {
        return NextResponse.json({ error: 'Pack does not meet requirements', details: errors }, { status: 400 });
    }

    await db.collection('packs').doc(packId).update({
        status: 'submitted',
        submittedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    });

    log.done(200);
    return { ok: true, packId, status: 'submitted' };
});

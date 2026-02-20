/**
 * PATCH /api/admin/flags/[flagId]
 * Toggle a feature flag's default enabled state globally.
 * Persisted to Firestore _config/featureFlags for dynamic control.
 * Admin-only endpoint.
 *
 * DELETE /api/admin/flags/[flagId]
 * Remove Firestore override — reverts flag to registry default.
 */

import { withAdmin, type RouteContext } from '@/lib/api-middleware';
import { getAdminDb } from '@/lib/firebase/admin';
import { getAllFlagIds } from '@/lib/feature-flags';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { NextResponse } from 'next/server';

const bodySchema = z.object({
    enabled: z.boolean(),
});

export const PATCH = withAdmin(
    async (request: Request, { params }: RouteContext) => {
        const flagId = params.flagId;

        // Validate flagId against registry
        const validFlags = getAllFlagIds();
        if (!validFlags.includes(flagId)) {
            return NextResponse.json({ error: 'Unknown flag' }, { status: 404 });
        }

        const body = await request.json();
        const parsed = bodySchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
        }

        const db = getAdminDb();
        await db
            .collection('_config')
            .doc('featureFlags')
            .set({ [flagId]: parsed.data.enabled }, { merge: true });

        return { data: { flagId, enabled: parsed.data.enabled } };
    }
);

export const DELETE = withAdmin(
    async (_request: Request, { params }: RouteContext) => {
        const flagId = params.flagId;

        const validFlags = getAllFlagIds();
        if (!validFlags.includes(flagId)) {
            return NextResponse.json({ error: 'Unknown flag' }, { status: 404 });
        }

        const db = getAdminDb();
        await db
            .collection('_config')
            .doc('featureFlags')
            .update({ [flagId]: FieldValue.delete() });

        return { data: { flagId, reset: true } };
    }
);

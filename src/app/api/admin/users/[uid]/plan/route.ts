/**
 * PATCH /api/admin/users/[uid]/plan
 * Manually set a user's plan tier.
 * Admin-only endpoint.
 */

import { NextResponse } from 'next/server';
import { withAdmin, type RouteContext } from '@/lib/api-middleware';
import { getAdminDb } from '@/lib/firebase/admin';
import { z } from 'zod';

const bodySchema = z.object({
    plan: z.enum(['free', 'pro', 'team']),
});

export const PATCH = withAdmin(async (request: Request, { log, params }: RouteContext) => {
    const { uid } = params;
    const body = await request.json();
    const parsed = bodySchema.parse(body);

    const db = getAdminDb();
    const userRef = db.collection('users').doc(uid);

    const snap = await userRef.get();
    if (!snap.exists) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Set plan directly — bypasses Stripe for manual overrides
    await userRef.update({
        plan: parsed.plan,
        // Clear Stripe fields when manually setting to avoid conflicts
        ...(parsed.plan === 'free' ? {
            stripeSubscriptionStatus: null,
            stripeSubscriptionId: null,
            planPeriodEnd: null,
            cancelAtPeriodEnd: false,
        } : {}),
    });

    log.info('Admin set user plan', { meta: { targetUid: uid, plan: parsed.plan } });

    return { success: true, uid, plan: parsed.plan };
});

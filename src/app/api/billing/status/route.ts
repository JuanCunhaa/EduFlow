/**
 * GET /api/billing/status
 * Returns the current billing status for the authenticated user.
 * Used by the client usePlan() hook with SWR.
 */

import { withAuth, type RouteContext } from '@/lib/api-middleware';
import { adminGetDoc } from '@/lib/firebase/admin-firestore';
import { resolveEffectivePlan } from '@/lib/plan-limits';
import type { UserProfile, BillingStatus } from '@/types';

export const GET = withAuth(async (_request: Request, { user }: RouteContext) => {
    const profile = await adminGetDoc<UserProfile>('users', user.uid);

    const effectivePlan = resolveEffectivePlan(
        profile || null,
        user.roles.includes('admin')
    );

    const status: BillingStatus = {
        plan: effectivePlan,
        status: profile?.stripeSubscriptionStatus || null,
        periodEnd: profile?.planPeriodEnd || null,
        cancelAtPeriodEnd: profile?.cancelAtPeriodEnd || false,
        trial: profile?.stripeSubscriptionStatus === 'trialing',
        trialEndsAt: profile?.trialEndsAt || null,
    };

    return { data: status, isAdmin: user.roles.includes('admin') };
});

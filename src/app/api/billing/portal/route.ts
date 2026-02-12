/**
 * POST /api/billing/portal
 * Creates a Stripe Customer Portal session for subscription management.
 */

import { withAuth, type RouteContext } from '@/lib/api-middleware';
import { adminGetDoc } from '@/lib/firebase/admin-firestore';
import { BadRequestError } from '@/lib/errors';
import { getStripe } from '@/lib/stripe';
import type { UserProfile } from '@/types';

export const POST = withAuth(async (_request: Request, { user, log }: RouteContext) => {
    const profile = await adminGetDoc<UserProfile>('users', user.uid);

    if (!profile?.stripeCustomerId) {
        throw new BadRequestError('No billing account found. Subscribe first to manage your plan.');
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const stripe = getStripe();

    const session = await stripe.billingPortal.sessions.create({
        customer: profile.stripeCustomerId,
        return_url: `${appUrl}/dashboard`,
    });

    log.info('Portal session created', { meta: { uid: user.uid } });

    return { url: session.url };
});

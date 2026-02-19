/**
 * POST /api/billing/create-checkout
 * Creates a Stripe Checkout session for subscription purchase.
 */

import { NextResponse } from 'next/server';
import { withAuth, type RouteContext } from '@/lib/api-middleware';
import { getStripe } from '@/lib/stripe';
import { adminGetDoc, adminUpdateDoc } from '@/lib/firebase/admin-firestore';
import { getAllowedPriceIds, TRIAL_PERIOD_DAYS } from '@/lib/constants';
import { BadRequestError, ConflictError } from '@/lib/errors';
import type { UserProfile } from '@/types';

export const POST = withAuth(
  async (request: Request, { user, log }: RouteContext) => {
    // Checkout disabled — rollback Level 2
    if (process.env.CHECKOUT_ENABLED === 'false') {
      return NextResponse.json(
        {
          error: 'Checkout is temporarily unavailable. Please try again later.',
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const {
      priceId,
      successUrl = '/dashboard?checkout=success',
      cancelUrl = '/pricing',
    } = body;

    // Validate priceId against allowed prices
    const allowedPrices = getAllowedPriceIds();
    if (!priceId || !allowedPrices.includes(priceId)) {
      throw new BadRequestError('Invalid price ID');
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Look up or create Stripe customer
    const stripe = getStripe();
    const profile = await adminGetDoc<UserProfile>('users', user.uid);

    let stripeCustomerId = profile?.stripeCustomerId;

    if (!stripeCustomerId) {
      log.info('Creating Stripe customer', { meta: { uid: user.uid } });
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { firebaseUid: user.uid },
      });
      stripeCustomerId = customer.id;
      await adminUpdateDoc('users', user.uid, { stripeCustomerId });
    }

    // Check if user already has an active subscription
    if (profile?.stripeSubscriptionId && profile?.stripeSubscriptionStatus) {
      const activeStatuses = ['active', 'trialing', 'past_due'];
      if (activeStatuses.includes(profile.stripeSubscriptionStatus)) {
        throw new ConflictError(
          'You already have an active subscription. Manage it from your billing settings.'
        );
      }
    }

    // Determine trial eligibility (first-time only)
    const isTrialEligible = !profile?.trialEndsAt;

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}${successUrl}`,
      cancel_url: `${appUrl}${cancelUrl}`,
      subscription_data: {
        metadata: { firebaseUid: user.uid },
        ...(isTrialEligible ? { trial_period_days: TRIAL_PERIOD_DAYS } : {}),
      },
      allow_promotion_codes: true,
      metadata: { firebaseUid: user.uid },
    });

    log.info('Checkout session created', {
      meta: { sessionId: session.id, priceId },
    });

    return { url: session.url };
  }
);

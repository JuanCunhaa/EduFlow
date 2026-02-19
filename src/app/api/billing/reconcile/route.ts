/**
 * GET /api/billing/reconcile
 * Reconciliation endpoint — detects and fixes drift between Stripe and Firestore.
 * Protected by admin auth OR cron secret header.
 * Run nightly via Vercel Cron.
 */

import { NextResponse } from 'next/server';
import { verifyAuth, isAdmin } from '@/lib/firebase/server-auth';
import { getStripe } from '@/lib/stripe';
import { getAdminDb } from '@/lib/firebase/admin';
import { createRequestLogger } from '@/lib/logger';

export async function GET(request: Request) {
  const log = createRequestLogger(request);

  // Auth: either admin user or cron secret
  const cronSecret = request.headers.get('x-cron-secret');
  const isAuthorizedCron = cronSecret && cronSecret === process.env.CRON_SECRET;

  if (!isAuthorizedCron) {
    const user = await verifyAuth();
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const stripe = getStripe();
  const db = getAdminDb();

  // Find all users with a stripeSubscriptionId
  const usersSnap = await db
    .collection('users')
    .where('stripeSubscriptionId', '!=', null)
    .get();

  let fixed = 0;
  let checked = 0;
  let errors = 0;
  const discrepancies: Array<{
    uid: string;
    field: string;
    firestore: unknown;
    stripe: unknown;
  }> = [];

  for (const userDoc of usersSnap.docs) {
    checked++;
    const userData = userDoc.data();
    const subscriptionId = userData.stripeSubscriptionId;

    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const updates: Record<string, unknown> = {};

      // Check status
      if (userData.stripeSubscriptionStatus !== subscription.status) {
        discrepancies.push({
          uid: userDoc.id,
          field: 'stripeSubscriptionStatus',
          firestore: userData.stripeSubscriptionStatus,
          stripe: subscription.status,
        });
        updates.stripeSubscriptionStatus = subscription.status;
      }

      // Check period end
      const stripePeriodEnd =
        (subscription.items.data[0]?.current_period_end ?? 0) * 1000;
      if (userData.planPeriodEnd !== stripePeriodEnd) {
        updates.planPeriodEnd = stripePeriodEnd;
      }

      // Check cancel at period end
      if (userData.cancelAtPeriodEnd !== subscription.cancel_at_period_end) {
        updates.cancelAtPeriodEnd = subscription.cancel_at_period_end;
      }

      // Check plan based on status
      const activeStatuses = ['active', 'trialing', 'past_due'];
      const shouldBePro =
        activeStatuses.includes(subscription.status) ||
        (subscription.status === 'canceled' && stripePeriodEnd > Date.now());

      if (shouldBePro && userData.plan !== 'pro') {
        updates.plan = 'pro';
        discrepancies.push({
          uid: userDoc.id,
          field: 'plan',
          firestore: userData.plan,
          stripe: 'pro',
        });
      } else if (!shouldBePro && userData.plan === 'pro') {
        updates.plan = 'free';
        discrepancies.push({
          uid: userDoc.id,
          field: 'plan',
          firestore: userData.plan,
          stripe: 'free',
        });
      }

      if (Object.keys(updates).length > 0) {
        await userDoc.ref.update(updates);
        fixed++;
      }
    } catch (err) {
      // Subscription not found in Stripe — likely deleted
      const error = err as { statusCode?: number };
      if (error.statusCode === 404) {
        await userDoc.ref.update({
          plan: 'free',
          stripeSubscriptionId: null,
          stripeSubscriptionStatus: null,
          planPeriodEnd: null,
          cancelAtPeriodEnd: false,
        });
        fixed++;
        discrepancies.push({
          uid: userDoc.id,
          field: 'subscription',
          firestore: subscriptionId,
          stripe: 'NOT_FOUND',
        });
      } else {
        errors++;
        log.error('Reconciliation error for user', {
          error: err,
          meta: { uid: userDoc.id },
        });
      }
    }
  }

  log.info('Reconciliation complete', {
    meta: { checked, fixed, errors, discrepancies: discrepancies.length },
  });

  return NextResponse.json({
    checked,
    fixed,
    errors,
    discrepancies,
  });
}

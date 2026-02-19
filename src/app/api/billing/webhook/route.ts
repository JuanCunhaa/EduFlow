/**
 * POST /api/billing/webhook
 * Stripe webhook handler.
 *
 * CRITICAL: No auth middleware. Uses Stripe signature verification.
 * Must read raw body — do NOT use Next.js JSON parsing.
 */

import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getAdminDb } from '@/lib/firebase/admin';
import { createRequestLogger } from '@/lib/logger';
import type Stripe from 'stripe';

// Disable Next.js body parsing for this route
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const log = createRequestLogger(request);

  // Webhook disabled — rollback safety
  if (process.env.BILLING_WEBHOOK_ENABLED === 'false') {
    log.info('Webhook processing disabled via env var');
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    log.error('STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  // Read raw body for signature verification
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    log.warn('Missing stripe-signature header');
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    log.error('Webhook signature verification failed', { error: err });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // ── Idempotency check ──
  const db = getAdminDb();
  const eventRef = db.collection('stripeEvents').doc(event.id);
  const existingEvent = await eventRef.get();

  if (existingEvent.exists) {
    log.info('Duplicate event skipped', { meta: { eventId: event.id } });
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // ── Process event ──
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
          log
        );
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
          log
        );
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
          log
        );
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice, log);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice,
          log
        );
        break;

      default:
        log.info('Unhandled event type', { meta: { type: event.type } });
    }

    // Mark event as processed
    await eventRef.set({
      eventId: event.id,
      type: event.type,
      processedAt: new Date(),
    });
  } catch (err) {
    log.error('Error processing webhook event', {
      error: err,
      meta: { eventId: event.id, type: event.type },
    });
    // Return 500 so Stripe retries
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

// ── Event Handlers ──────────────────────────────────

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  log: ReturnType<typeof createRequestLogger>
) {
  const firebaseUid = session.metadata?.firebaseUid;
  if (!firebaseUid) {
    log.warn('checkout.session.completed missing firebaseUid metadata');
    return;
  }

  const stripe = getStripe();
  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id;

  if (!subscriptionId) {
    log.warn('checkout.session.completed missing subscription');
    return;
  }

  // Fetch full subscription to get status and period info
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const db = getAdminDb();
  const userRef = db.collection('users').doc(firebaseUid);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    log.warn('User not found for checkout completion', {
      meta: { uid: firebaseUid },
    });
    return;
  }

  const isTrialing = subscription.status === 'trialing';
  const periodEnd =
    (subscription.items.data[0]?.current_period_end ?? 0) * 1000;

  const updateData: Record<string, unknown> = {
    plan: 'pro',
    stripeSubscriptionId: subscriptionId,
    stripeSubscriptionStatus: subscription.status,
    planPeriodEnd: periodEnd,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };

  if (isTrialing && subscription.trial_end) {
    updateData.trialEndsAt = subscription.trial_end * 1000;
  }

  await userRef.update(updateData);

  log.info('User upgraded to Pro', {
    meta: { uid: firebaseUid, subscriptionId, status: subscription.status },
  });
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  log: ReturnType<typeof createRequestLogger>
) {
  const uid = await findUserByCustomerId(
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id,
    subscription.metadata?.firebaseUid
  );

  if (!uid) {
    log.warn('User not found for subscription.updated', {
      meta: { customerId: subscription.customer },
    });
    return;
  }

  const db = getAdminDb();
  const periodEnd =
    (subscription.items.data[0]?.current_period_end ?? 0) * 1000;

  await db.collection('users').doc(uid).update({
    stripeSubscriptionStatus: subscription.status,
    planPeriodEnd: periodEnd,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });

  log.info('Subscription updated', {
    meta: {
      uid,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  log: ReturnType<typeof createRequestLogger>
) {
  const uid = await findUserByCustomerId(
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id,
    subscription.metadata?.firebaseUid
  );

  if (!uid) {
    log.warn('User not found for subscription.deleted', {
      meta: { customerId: subscription.customer },
    });
    return;
  }

  const db = getAdminDb();
  await db.collection('users').doc(uid).update({
    plan: 'free',
    stripeSubscriptionId: null,
    stripeSubscriptionStatus: null,
    planPeriodEnd: null,
    cancelAtPeriodEnd: false,
  });

  log.info('User downgraded to Free', { meta: { uid } });
}

async function handleInvoicePaid(
  invoice: Stripe.Invoice,
  log: ReturnType<typeof createRequestLogger>
) {
  const subscriptionRef = invoice.parent?.subscription_details?.subscription;
  const subscriptionId =
    typeof subscriptionRef === 'string' ? subscriptionRef : subscriptionRef?.id;

  if (!subscriptionId) return;

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId =
    typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id;

  const uid = await findUserByCustomerId(
    customerId || '',
    subscription.metadata?.firebaseUid
  );

  if (!uid) {
    log.warn('User not found for invoice.paid', { meta: { customerId } });
    return;
  }

  const db = getAdminDb();
  const periodEnd =
    (subscription.items.data[0]?.current_period_end ?? 0) * 1000;

  await db.collection('users').doc(uid).update({
    plan: 'pro',
    stripeSubscriptionStatus: 'active',
    planPeriodEnd: periodEnd,
  });

  log.info('Invoice paid — Pro confirmed', { meta: { uid, periodEnd } });
}

async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  log: ReturnType<typeof createRequestLogger>
) {
  const customerId =
    typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id;

  const uid = await findUserByCustomerId(customerId || '');

  if (!uid) {
    log.warn('User not found for invoice.payment_failed', {
      meta: { customerId },
    });
    return;
  }

  const db = getAdminDb();
  await db.collection('users').doc(uid).update({
    stripeSubscriptionStatus: 'past_due',
  });

  log.info('Payment failed — status set to past_due', { meta: { uid } });
}

// ── Helpers ─────────────────────────────────────────

/**
 * Look up Firebase user by Stripe customer ID.
 * Primary: metadata.firebaseUid on the subscription.
 * Fallback: query Firestore by stripeCustomerId field.
 */
async function findUserByCustomerId(
  stripeCustomerId: string,
  metadataUid?: string
): Promise<string | null> {
  // Fast path: use metadata UID
  if (metadataUid) {
    const db = getAdminDb();
    const userSnap = await db.collection('users').doc(metadataUid).get();
    if (userSnap.exists) return metadataUid;
  }

  // Fallback: query by stripeCustomerId
  const db = getAdminDb();
  const snap = await db
    .collection('users')
    .where('stripeCustomerId', '==', stripeCustomerId)
    .limit(1)
    .get();

  if (snap.empty) return null;
  return snap.docs[0].id;
}

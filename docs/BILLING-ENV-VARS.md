# ExamFlow Billing — Environment Variables

All environment variables required for the billing/monetization system.

## Stripe Keys (Required)

```env
# Server-side Stripe secret key (sk_live_... or sk_test_...)
STRIPE_SECRET_KEY=sk_test_...

# Client-side Stripe publishable key (pk_live_... or pk_test_...)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Stripe Webhook signing secret (whsec_...)
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Stripe Price IDs (Required)

```env
# Pro Monthly price
NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY=price_1T05W7DdL0oPe6wnvK32itSZ

# Pro Annual price
NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL=price_1T05WEDdL0oPe6wnXkPYA00E

# Team Monthly price
NEXT_PUBLIC_STRIPE_PRICE_TEAM_MONTHLY=price_1T05WHDdL0oPe6wn3tR2bNbn
```

## Feature Flags (Optional — defaults to enabled)

```env
# Set to "false" to disable the paywall entirely (all users get Pro)
# Rollback Level 1: Instant — no deploy required
PAYWALL_ENABLED=true

# Set to "false" to disable Stripe Checkout (hides upgrade buttons)
# Rollback Level 2: Blocks new subscriptions
CHECKOUT_ENABLED=true

# Set to "false" to stop processing webhooks (returns 200 OK without processing)
# Rollback Level 3: Stops Stripe sync
BILLING_WEBHOOK_ENABLED=true
```

## Reconciliation Cron (Optional)

```env
# Secret for the nightly reconciliation cron endpoint
# Used in the x-cron-secret header
CRON_SECRET=your-random-secret-here
```

## Vercel Cron Configuration

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/billing/reconcile",
      "schedule": "0 3 * * *"
    }
  ]
}
```

The reconciliation route is protected by:
1. Admin session cookie, OR
2. `x-cron-secret` header matching `CRON_SECRET`

## Stripe Webhook Events to Register

In the Stripe Dashboard → Webhooks → Add endpoint:

- **URL**: `https://your-domain.com/api/billing/webhook`
- **Events**:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`

## Coupon Codes

Pre-created coupons:
- `BETA50` — 50% off for 3 months (ID: `ulWLe2PD`)
- `LAUNCH20` — 20% off first month (ID: `EGSKTONy`)

## Development / Testing

For local development with Stripe CLI:

```bash
# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/billing/webhook

# The CLI will output a webhook signing secret (whsec_...) — use that as STRIPE_WEBHOOK_SECRET
```

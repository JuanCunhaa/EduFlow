# Monetization — Stripe Integration Spec

> Status: DRAFT
> Owner: Engineering
> Date: 2026-02-12
> Audience: Implementing engineer(s)

---

## 1. Overview

Add Stripe-based subscription billing to ExamFlow. Two paid tiers: **Pro** (individual) and **Team** (placeholder). Free tier has hard caps. Goal: go from zero revenue to accepting payments within a single sprint.

### Architecture Principle

Stripe is the source of truth for subscription state. Firestore stores a **cached entitlement** that gates API access. Webhooks keep them in sync. No polling. No client-side billing logic.

---

## 2. Stripe Product & Price Configuration

Create these objects in the Stripe Dashboard (or via API seed script). **Do NOT hardcode price IDs** — use env vars.

### Products

| Stripe Product | `metadata.tier` | Description |
|----------------|-----------------|-------------|
| `ExamFlow Pro` | `pro` | Individual subscription |
| `ExamFlow Team` | `team` | Team subscription (Phase 2) |

### Prices

| Price ID Env Var | Product | Interval | Amount | Notes |
|------------------|---------|----------|--------|-------|
| `STRIPE_PRICE_PRO_MONTHLY` | ExamFlow Pro | `month` | $29.00 USD | Default |
| `STRIPE_PRICE_PRO_ANNUAL` | ExamFlow Pro | `year` | $199.00 USD | ~43% savings |
| `STRIPE_PRICE_TEAM_MONTHLY` | ExamFlow Team | `month` | $49.00 USD | Per-seat. Phase 2. |

### Promo Codes (Optional, Day 30+)

| Code | Discount | Duration | Purpose |
|------|----------|----------|---------|
| `BETA50` | 50% off | 3 months | Beta tester reward |
| `LAUNCH20` | 20% off | first payment | Reddit launch campaign |

---

## 3. Environment Variables

```env
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_ANNUAL=price_...
STRIPE_PRICE_TEAM_MONTHLY=price_...

# App
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_APP_URL=https://examflow.app
```

Add test-mode equivalents (`sk_test_...`) in `.env.local`.

---

## 4. Firestore Schema Changes

### `UserProfile` — Add billing fields

```typescript
// ADD to existing UserProfile interface in src/types/index.ts
interface UserProfile {
    // ... existing fields ...

    // ── Billing ──
    plan: 'free' | 'pro' | 'team';               // current active plan
    stripeCustomerId: string | null;               // Stripe customer ID
    stripeSubscriptionId: string | null;           // active subscription ID
    stripeSubscriptionStatus: StripeSubStatus | null;  // 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid'
    planPeriodEnd: number | null;                  // epoch ms — current period end (for grace period display)
    trialEndsAt: number | null;                    // epoch ms — null if never trialed
}

type StripeSubStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete';
```

**Default for new users:** `plan: 'free'`, all Stripe fields `null`.

**Default for existing users:** Migration script sets `plan: 'free'` on all existing `UserProfile` docs that lack the field. Use Firestore `updateDoc` with `merge: true`. Non-destructive.

### New Collection: `stripeEvents/{eventId}`

```typescript
// Idempotency log — prevents double-processing webhooks
{
    eventId: string;          // Stripe event ID (evt_...)
    type: string;             // event type
    processedAt: Timestamp;
}
```

Auto-expire via Firestore TTL policy: `processedAt` + 30 days.

---

## 5. API Routes — New

### `POST /api/billing/create-checkout`

**Guard:** `withAuth`

**Request body:**
```json
{
    "priceId": "price_...",
    "successUrl": "/dashboard?checkout=success",
    "cancelUrl": "/pricing"
}
```

**Logic:**
1. Validate `priceId` is one of the allowed price env vars.
2. Look up or create Stripe Customer for this user:
   - If `user.stripeCustomerId` exists → use it.
   - Else → `stripe.customers.create({ email, metadata: { firebaseUid: user.uid } })`. Write `stripeCustomerId` to Firestore.
3. Check if user already has an active subscription → return error `ALREADY_SUBSCRIBED`.
4. Create `stripe.checkout.sessions.create`:
   - `mode: 'subscription'`
   - `customer: stripeCustomerId`
   - `line_items: [{ price: priceId, quantity: 1 }]`
   - `success_url`, `cancel_url` with `{CHECKOUT_SESSION_ID}` template
   - `subscription_data.trial_period_days: 7` (if `trialEndsAt` is null — first-time trial only)
   - `allow_promotion_codes: true`
   - `metadata: { firebaseUid: user.uid }`
5. Return `{ url: session.url }`.

**Client:** Redirect to `session.url` (full-page redirect, not iframe).

### `POST /api/billing/portal`

**Guard:** `withAuth`

**Logic:**
1. Require `user.stripeCustomerId`. If null → 400.
2. Create `stripe.billingPortal.sessions.create({ customer, return_url })`.
3. Return `{ url: session.url }`.

**Client:** Redirect to portal URL.

### `POST /api/billing/webhook`

**Guard:** NONE (raw request). Stripe signature verification instead.

**Logic:**
1. Read raw body (`request.text()`).
2. Verify signature: `stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)`.
3. Check idempotency: if `stripeEvents/{event.id}` exists → return 200 (already processed).
4. Switch on `event.type` — see Webhook Events section below.
5. Write `stripeEvents/{event.id}` with `processedAt`.
6. Return 200.

**Critical:** This route must NOT use `withAuth`. It must NOT parse JSON via Next.js (disable body parsing). It must read raw body for signature verification.

### `GET /api/billing/status`

**Guard:** `withAuth`

**Logic:** Read billing fields from UserProfile, return:
```json
{
    "plan": "pro",
    "status": "active",
    "periodEnd": 1740000000000,
    "cancelAtPeriodEnd": false,
    "trial": false
}
```

Client uses this for UI gating. Cached by SWR with 60s revalidation.

---

## 6. Webhook Events

### Events to Listen For

| Event | Action |
|-------|--------|
| `checkout.session.completed` | 1. Extract `firebaseUid` from metadata. 2. Write to UserProfile: `plan: 'pro'`, `stripeSubscriptionId`, `stripeSubscriptionStatus: 'active'` (or `'trialing'`), `planPeriodEnd`. 3. If trial: set `trialEndsAt`. |
| `customer.subscription.updated` | 1. Find user by `stripeCustomerId`. 2. Update `stripeSubscriptionStatus`, `planPeriodEnd`. 3. If `cancel_at_period_end: true` → keep `plan: 'pro'` but surface "canceling" in UI. 4. Handle plan changes (monthly↔annual). |
| `customer.subscription.deleted` | 1. Find user by `stripeCustomerId`. 2. Set `plan: 'free'`, `stripeSubscriptionId: null`, `stripeSubscriptionStatus: null`. User loses Pro immediately. |
| `invoice.paid` | 1. Update `planPeriodEnd` to new period end. 2. Ensure `plan: 'pro'` and `status: 'active'`. |
| `invoice.payment_failed` | 1. Set `stripeSubscriptionStatus: 'past_due'`. 2. Keep `plan: 'pro'` (Stripe retries for ~3 weeks). 3. After final retry fails, Stripe fires `customer.subscription.deleted`. |
| `customer.subscription.trial_will_end` | Optional. Send in-app notification: "Your trial ends in 3 days." |

### User Lookup in Webhooks

**Primary:** `subscription.metadata.firebaseUid` (set during checkout).
**Fallback:** Query Firestore `users` where `stripeCustomerId == event.data.object.customer`.

Always validate that the user exists before writing. Log and return 200 if user not found (don't block Stripe retries).

---

## 7. Entitlement Check — Server-Side

### New middleware: `withPlan`

```typescript
// Pseudocode — not implementation
function withPlan(requiredPlan: 'pro' | 'team') {
    return withAuth(async (req, ctx) => {
        const profile = await getUserProfile(ctx.user.uid);
        const effectivePlan = resolveEffectivePlan(profile);
        if (!meetsRequirement(effectivePlan, requiredPlan)) {
            throw new PaywallError(requiredPlan);
        }
        return handler(req, { ...ctx, plan: effectivePlan });
    });
}
```

**Plan hierarchy:** `team > pro > free`

`resolveEffectivePlan` logic:
1. If `plan === 'pro'` AND (`status === 'active'` OR `status === 'trialing'`) → `'pro'`
2. If `plan === 'pro'` AND `status === 'past_due'` → `'pro'` (grace period — Stripe handles retry)
3. If `plan === 'pro'` AND `status === 'canceled'` AND `planPeriodEnd > now` → `'pro'` (paid through period)
4. If `plan === 'pro'` AND `status === 'canceled'` AND `planPeriodEnd <= now` → `'free'`
5. Otherwise → `plan` as stored

### New error class

```typescript
// Add to src/lib/errors.ts
class PaywallError extends AppError {
    constructor(requiredPlan: string) {
        super(`Upgrade to ${requiredPlan} to access this feature`, 403, 'PAYWALL_REQUIRED', { requiredPlan });
    }
}
```

Client interprets `code: 'PAYWALL_REQUIRED'` to show upgrade modal instead of generic error.

---

## 8. Entitlement Check — Client-Side

### Hook: `usePlan()`

```typescript
// Pseudocode
function usePlan() {
    const { data } = useSWR('/api/billing/status', fetcher, { revalidateOnFocus: true });
    return {
        plan: data?.plan ?? 'free',
        isPro: data?.plan === 'pro' || data?.plan === 'team',
        isTrialing: data?.status === 'trialing',
        isCanceling: data?.cancelAtPeriodEnd === true,
        periodEnd: data?.periodEnd,
    };
}
```

Client uses `isPro` to:
- Show/hide UI elements (locked icons, upgrade CTAs)
- Disable form fields (e.g., advanced exam modes)
- Show upgrade modal on gate interaction

**Client gating is cosmetic only.** Server enforces via `withPlan`. A user bypassing client UI still hits the paywall API.

---

## 9. Implementation Phases

### Phase A — Checkout + Webhook + Entitlement (Days 1–4)

| Step | Files Touched | Description |
|------|--------------|-------------|
| A1 | `package.json` | `npm install stripe @stripe/stripe-js` |
| A2 | `.env.local`, Vercel env vars | Add all Stripe env vars |
| A3 | `src/types/index.ts` | Add billing fields to `UserProfile`, add `StripeSubStatus` type |
| A4 | `src/lib/stripe.ts` | New. Stripe SDK singleton (`new Stripe(STRIPE_SECRET_KEY)`). |
| A5 | `src/lib/errors.ts` | Add `PaywallError` class |
| A6 | `src/app/api/billing/create-checkout/route.ts` | New. Checkout session creation. |
| A7 | `src/app/api/billing/webhook/route.ts` | New. Webhook handler. Raw body parsing. Idempotency. |
| A8 | `src/app/api/billing/portal/route.ts` | New. Customer Portal redirect. |
| A9 | `src/app/api/billing/status/route.ts` | New. Return billing state for client. |
| A10 | `scripts/migrate-billing.ts` | New. Backfill `plan: 'free'` on all existing users. |
| A11 | `src/lib/api-middleware.ts` | Add `withPlan` middleware. |
| A12 | `src/hooks/usePlan.ts` | New. SWR hook for billing status. |

### Phase B — Paywall Enforcement + Pricing Page (Days 4–7)

| Step | Files Touched | Description |
|------|--------------|-------------|
| B1 | `src/app/[locale]/pricing/page.tsx` | New. Pricing comparison page with checkout buttons. |
| B2 | `src/app/api/exams/route.ts` | Enforce plan limits on exam creation (mode + question count). |
| B3 | `src/app/api/analytics/route.ts` | Gate full analytics behind Pro. |
| B4 | `src/app/api/export/route.ts` | Gate CSV export behind Pro. |
| B5 | `src/app/api/marketplace/import/route.ts` | Limit free tier imports. |
| B6 | `src/components/exams/ExamConfigForm.tsx` | Show locked state on gated modes. Upgrade CTA. |
| B7 | `src/app/[locale]/dashboard/[studyId]/page.tsx` | Gate analytics section. Show upgrade prompt. |
| B8 | `src/app/[locale]/(landing)/page.tsx` | Add pricing section. Update CTAs from "free" to "free trial". |
| B9 | `src/messages/en.json`, `src/messages/pt-BR.json` | Add billing/pricing i18n strings. |
| B10 | `src/components/ui/UpgradeModal.tsx` | New. Reusable upgrade prompt shown on paywall hit. |
| B11 | `src/components/layout/Header.tsx` or `Sidebar.tsx` | Show plan badge + "Upgrade" button for free users. |

---

## 10. Edge Cases

### Trial

- 7-day free trial on first subscription only.
- Tracked via `trialEndsAt` on UserProfile. If non-null → user has trialed before → no second trial.
- Stripe handles trial→paid transition automatically. Webhook `invoice.paid` confirms.
- If trial ends without payment method → `customer.subscription.deleted` fires → downgrade to free.

### Failed Payments

- Stripe retries failed invoices 3 times over ~3 weeks (configurable in Stripe Dashboard → Settings → Subscriptions → Retry schedule).
- During retry period: `stripeSubscriptionStatus: 'past_due'`. User keeps Pro access (grace period).
- After all retries fail: Stripe cancels subscription → `customer.subscription.deleted` → downgrade to free.
- Optional: Show "Payment failed" banner in UI when `status === 'past_due'`.

### Cancellation

- User cancels via Stripe Customer Portal (not custom UI).
- Stripe sets `cancel_at_period_end: true` on the subscription.
- `customer.subscription.updated` webhook fires → store flag.
- User keeps Pro until `planPeriodEnd`. UI shows: "Your plan cancels on {date}."
- At period end: `customer.subscription.deleted` fires → downgrade to free.

### Refunds

- Handle via Stripe Dashboard manually (no API route needed for MVP).
- On refund: `charge.refunded` event fires. No automatic downgrade — handle case-by-case.
- If subscription refund + cancel: `customer.subscription.deleted` handles downgrade.

### Proration (Plan Change)

- Monthly ↔ Annual switch handled by Stripe Customer Portal.
- Default Stripe behavior: prorate immediately (charge/credit the difference).
- `customer.subscription.updated` webhook updates `planPeriodEnd` and interval.
- No custom proration logic needed.

### Account Deletion

- User deletes account → app should:
  1. Cancel Stripe subscription: `stripe.subscriptions.cancel(subscriptionId)`.
  2. Delete Firestore user data (existing flow).
  3. Optionally: delete Stripe Customer (`stripe.customers.del`), or keep for financial records.
- Must happen before Firestore user doc deletion.

### Multiple Tabs / Session Sync

- SWR `revalidateOnFocus: true` ensures billing status refreshes when user switches tabs.
- After checkout success redirect, client calls `mutate('/api/billing/status')` to force refresh.

### Webhook Ordering

- Stripe doesn't guarantee event order. The webhook handler must be idempotent and handle late-arriving events.
- Always read the subscription object from the event payload — don't assume previous state.
- Idempotency key (`stripeEvents/{eventId}`) prevents double-processing.

### Webhook Failures

- If webhook endpoint returns non-2xx, Stripe retries with exponential backoff for up to 3 days.
- Failsafe: Nightly cron job (Vercel Cron) that reconciles `plan` field against Stripe subscription status for all users with `stripeSubscriptionId`. Query Stripe API directly. Correct any drift.
- Cron route: `GET /api/billing/reconcile` (withAdmin or cron secret header).

---

## 11. Security Considerations

| Concern | Mitigation |
|---------|------------|
| Webhook spoofing | Verify Stripe signature on every webhook. Reject if invalid. |
| Client-side plan spoofing | Server-side `withPlan` middleware is the enforcement layer. Client is cosmetic only. |
| Price ID manipulation | Validate `priceId` against allowlist of env var values. Reject unknown prices. |
| CSRF on checkout | Checkout creation uses `withAuth` (session cookie). Stripe redirect is server-generated. |
| PII in Stripe metadata | Only store `firebaseUid` in metadata. No email, name, or other PII. |
| Session cookie + billing race | After checkout redirect, client polls `/api/billing/status` until plan updates. Use `revalidateOnFocus`. |

---

## 12. Testing Checklist

| Scenario | How to Test |
|----------|-------------|
| Free user hits paywall | Call gated API without Pro. Expect `403 PAYWALL_REQUIRED`. |
| Checkout → Pro activation | Use Stripe test card. Verify UserProfile updates. |
| Webhook idempotency | Send same event ID twice. Verify single processing. |
| Trial expiry (no payment) | Use Stripe test clock. Fast-forward 7 days. Verify downgrade. |
| Payment failure → grace → cancel | Use Stripe `4000000000000341` (decline after attach). Verify `past_due` → eventual `canceled`. |
| Cancel → access until period end | Cancel in portal. Verify Pro access persists until `planPeriodEnd`. |
| Annual ↔ Monthly switch | Switch in portal. Verify `planPeriodEnd` updates. |
| Account deletion with active sub | Delete account. Verify Stripe subscription canceled. |
| Existing user migration | Run migration script. Verify all users get `plan: 'free'`. |
| Concurrent webhook events | Fire `invoice.paid` and `subscription.updated` near-simultaneously. Verify consistency. |

---

## 13. Dependencies & Non-Goals

### Dependencies
- Stripe account (already available or create)
- Stripe Customer Portal configured (manage subscriptions, update payment, view invoices)
- Vercel environment variables set for prod/preview/dev
- Stripe webhook endpoint registered in Stripe Dashboard

### Non-Goals (this spec)
- Team/Enterprise full implementation (placeholder tier only — see pricing-tiers.md)
- Custom billing admin UI (use Stripe Dashboard)
- Usage-based billing
- Invoice PDF generation (Stripe handles this)
- Tax collection (add Stripe Tax in Phase 2)
- Mobile payment flows (Apple Pay, Google Pay — Stripe Checkout supports these automatically)

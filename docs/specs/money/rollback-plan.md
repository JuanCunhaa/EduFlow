# Rollback Plan — Monetization

> Status: DRAFT
> Date: 2026-02-12
> Depends on: monetization-stripe-spec.md, paywall-rules.md

---

## 1. Purpose

If monetization deployment causes critical issues (checkout broken, webhooks failing, users locked out of features they should have access to, or severe UX regressions), this document defines how to roll back safely without data loss or inconsistency.

---

## 2. Risk Categories

| Risk | Severity | Likelihood | Rollback Trigger |
|------|----------|------------|------------------|
| Webhook endpoint unreachable → users pay but don't get Pro | 🔴 Critical | Low | Any user reports payment without plan activation |
| Paywall blocks Pro users due to stale/wrong plan field | 🔴 Critical | Low | Pro user gets 403 PAYWALL_REQUIRED on any endpoint |
| Stripe Checkout redirect fails | 🟡 High | Low | >5% checkout session creation failures |
| Billing status endpoint errors | 🟡 High | Low | `/api/billing/status` returning 500s |
| Free tier limits too aggressive → mass user complaints | 🟡 Medium | Medium | NPS drops below 20 or >10 complaints/day |
| Migration script corrupts UserProfile docs | 🔴 Critical | Very Low | Any user loses existing profile data |

---

## 3. Rollback Levels

### Level 0: Fix Forward (default)

**When:** Issue is minor and isolated. Fix can be deployed in <30 minutes.

**Action:** Deploy a hotfix. Do not roll back.

**Examples:**
- i18n key missing → add key, redeploy
- Upgrade modal not showing → fix component, redeploy
- Pricing page layout broken → fix CSS, redeploy

### Level 1: Disable Paywall (keep billing live)

**When:** Paywall incorrectly blocks users. Billing itself works fine.

**Action:** Set environment variable `PAYWALL_ENABLED=false`. The `withPlan` middleware checks this flag — if false, all plan checks pass regardless of user plan.

**Implementation:**
```
// In withPlan middleware:
if (process.env.PAYWALL_ENABLED === 'false') {
    // Skip all plan checks — everyone gets Pro access
    return handler(req, { ...ctx, plan: 'pro' });
}
```

**Effect:**
- All users get unlimited access (like before monetization)
- Stripe billing continues to work (users can still subscribe/cancel)
- No data loss
- Deploy fix for paywall logic, then re-enable

**Recovery:** Set `PAYWALL_ENABLED=true` after fix deployed.

### Level 2: Disable Checkout (keep existing subs active)

**When:** Stripe Checkout flow is broken. New purchases fail. Existing subscribers should keep access.

**Action:** Set `CHECKOUT_ENABLED=false`. The create-checkout endpoint returns a maintenance message instead of creating a session.

**Effect:**
- No new subscriptions can be created
- Existing subscribers keep Pro access (webhooks still process)
- Pricing page shows "Temporarily unavailable" on CTA buttons
- No revenue loss from existing customers

**Recovery:** Fix checkout flow, set `CHECKOUT_ENABLED=true`.

### Level 3: Full Monetization Rollback

**When:** Critical data corruption or systematic billing failure affecting all users.

**Action:**
1. Set `PAYWALL_ENABLED=false` (immediate — all users get full access)
2. Set `CHECKOUT_ENABLED=false` (stop new purchases)
3. Pause Stripe webhook endpoint in Stripe Dashboard (stop processing events)
4. Deploy code revert (remove `withPlan` calls from all API routes, revert to pre-monetization routes)
5. Run reconciliation: ensure no user was incorrectly downgraded

**Effect:**
- App returns to pre-monetization state
- All features accessible to all authenticated users
- Existing Stripe subscriptions continue to bill (Stripe-side) but have no effect on app access
- Must manually handle: refund any users who paid during the broken period

**Recovery:**
1. Fix root cause
2. Restore webhook processing
3. Run billing reconciliation script (compare Stripe subscription status vs Firestore `plan` field for all users with `stripeSubscriptionId`)
4. Re-enable paywall
5. Re-enable checkout
6. Notify affected users

---

## 4. Pre-Deployment Safeguards

### 4.1 Feature Flags

Add these environment variables before deploying monetization:

```env
# Feature flags — all default to 'true' in production
PAYWALL_ENABLED=true          # Master switch for plan enforcement
CHECKOUT_ENABLED=true         # Master switch for creating new subscriptions
BILLING_WEBHOOK_ENABLED=true  # Master switch for processing webhooks
```

All three must be checked at the relevant code entry points. This gives instant rollback capability without code deployment.

### 4.2 Migration Script Safety

The billing migration script (`scripts/migrate-billing.ts`) that adds `plan: 'free'` to existing users:

**Before running:**
1. Take a Firestore export backup (console → Export)
2. Run migration in dry-run mode first (log changes without writing)
3. Run on a single test user first
4. Then run on all users

**Script requirements:**
- Use `merge: true` on all updates (never overwrite existing fields)
- Skip any user doc that already has a `plan` field
- Log every document touched: `{ uid, before, after }`
- Idempotent: safe to run multiple times

**Rollback:** The migration only ADDS fields. It doesn't modify or delete anything. No rollback needed unless the script has a bug. In that case:
1. Stop script immediately
2. Review logs for affected docs
3. Manually fix incorrect docs (if any)

### 4.3 Webhook Validation

Before going live:
1. Register Stripe webhook endpoint in test mode first
2. Use `stripe trigger` CLI to send test events: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`, `customer.subscription.updated`
3. Verify each event is processed correctly in Firestore
4. Check idempotency: send same event twice, verify single processing
5. Only then register the production webhook endpoint

### 4.4 Canary Deployment

Deploy monetization with paywall applied to **internal/test users only** for 24 hours:

```
// In withPlan middleware (temporary canary logic):
const CANARY_UIDS = ['uid1', 'uid2', 'uid3'];  // internal testers
if (!CANARY_UIDS.includes(user.uid) && process.env.PAYWALL_CANARY === 'true') {
    // Skip paywall for non-canary users
    return handler(req, { ...ctx, plan: 'pro' });
}
```

After 24 hours with no issues: remove canary logic, enable for all users.

---

## 5. Data Integrity Guarantees

### What is NEVER rolled back:

| Data | Why |
|------|-----|
| Stripe Customer IDs | Needed for billing reconciliation. Harmless if unused. |
| Stripe Subscription IDs | Stripe is source of truth. Keep for reconciliation. |
| `plan` field on UserProfile | Set to `'free'` by default. Harmless. Accurate. |
| `stripeEvents` collection | Idempotency log. Auto-expires via TTL. |
| Payment records in Stripe | Stripe retains all payment history. Not our data to rollback. |

### What CAN be rolled back:

| Data | How |
|------|-----|
| Paywall enforcement in API routes | Remove `withPlan` wrappers from routes. Revert to pre-monetization code. |
| Client-side plan checks | Remove `usePlanLimits`, `FeatureLock`, `UpgradeModal` references. |
| Pricing page | Delete `/[locale]/pricing` directory. Remove links. |
| Landing page copy changes | Revert i18n strings to pre-monetization values. |

---

## 6. Reconciliation Script

**File:** `scripts/billing-reconcile.ts` (run manually or via cron)

**Purpose:** Detect and fix drift between Stripe subscription state and Firestore `plan` field.

**Logic:**
```
For each user where stripeSubscriptionId is not null:
  1. Fetch subscription from Stripe API
  2. Compare subscription.status vs Firestore stripeSubscriptionStatus
  3. If mismatch:
     a. Log discrepancy
     b. Update Firestore to match Stripe (Stripe is source of truth)
  4. If subscription not found in Stripe (deleted):
     a. Set plan: 'free', clear subscription fields
```

**When to run:**
- After any webhook outage
- After any Level 2+ rollback
- Daily as a safety net (Vercel Cron, `GET /api/billing/reconcile` with admin/cron-secret auth)

---

## 7. Communication Plan

### If rollback is needed:

| Audience | Channel | Message |
|----------|---------|---------|
| All users | In-app banner | "We're experiencing billing issues. All features are temporarily available to everyone. Thank you for your patience." |
| Paying users | Email (if email available) | "We temporarily disabled our paywall due to a technical issue. Your subscription is safe. You will not be double-charged." |
| Internal | Slack/Discord | Post-mortem within 24 hours. |

### If pricing changes:

| Change | Action |
|--------|--------|
| Lower price | Grandfather existing subscribers at their current rate OR apply new lower rate to next billing cycle. |
| Higher price | Grandfather ALL existing subscribers at their current rate. New price for new subscribers only. |
| Remove a free feature | 30-day notice in-app. Never remove access retroactively. |
| Add a free feature | Immediate. No notice needed. |

---

## 8. Rollback Checklist

Use this checklist during an actual rollback:

```
□ 1. Identify rollback level needed (0/1/2/3)
□ 2. Set environment variables (PAYWALL_ENABLED, CHECKOUT_ENABLED)
□ 3. Verify change propagated (Vercel redeployment or env var cache)
□ 4. Test: free user can access previously gated feature
□ 5. Test: Pro user still has access
□ 6. If Level 3: Pause webhook in Stripe Dashboard
□ 7. If Level 3: Deploy code revert
□ 8. Monitor error rates for 30 minutes
□ 9. Communicate to affected users (if any)
□ 10. Begin root cause investigation
□ 11. Fix, test in staging, re-deploy
□ 12. Run reconciliation script
□ 13. Re-enable features (PAYWALL_ENABLED=true)
□ 14. Monitor for 24 hours post-recovery
□ 15. Write post-mortem
```

# 01 — Monetization

---

## Problem Statement

ExamFlow has zero revenue infrastructure. No payment provider, no pricing page, no plan differentiation, no paywall. The `UserProfile` type has no `plan` field. Every CTA says "free". The marketplace hardcodes a "Free" badge. Users are trained to expect zero cost.

Without monetization, there is no business. Everything else in this plan is irrelevant until someone pays.

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Time to first payment | < 7 days from start |
| Free→Pro conversion rate | 10% within 30 days |
| MRR at Day 30 | $500+ |
| Churn rate (monthly) | < 8% |
| Average Revenue Per User (ARPU) | $25+/month |

---

## MVP Scope (2 weeks)

### Tier Design

| Feature | Free | Pro ($29/mo · $199/yr) |
|---------|------|------------------------|
| Questions accessible | 50 per study | Unlimited |
| Exam modes | `practice` only | All 6 modes |
| Analytics dashboard | Hidden | Full access |
| Flashcard mode | Hidden | Full access |
| Daily challenge | Available | Available |
| Marketplace import | 1 study | Unlimited |
| Export CSV | No | Yes |

### Engineering Tasks

1. **Add Stripe SDK** — `npm install stripe @stripe/stripe-js`
2. **Firestore schema** — Add `plan: 'free' | 'pro'`, `stripeCustomerId`, `subscriptionId`, `planExpiresAt` to `UserProfile`
3. **API routes:**
   - `POST /api/billing/create-checkout` — creates Stripe Checkout session
   - `POST /api/billing/webhook` — handles `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`
   - `GET /api/billing/portal` — returns Stripe Customer Portal URL for self-service
4. **Paywall middleware** — `withPlan(requiredPlan)` wrapper for API routes. Returns 403 + `{ upgrade: true }` for gated features.
5. **Client-side gating** — Show locked state with upgrade CTA at gate points (exam config form, analytics page, flashcard page, export button).
6. **Pricing page** — `/pricing` with comparison table and Stripe Checkout redirect.
7. **Landing page updates** — Replace "free" CTAs with "Start your 7-day free trial". Add pricing section.
8. **Remove "Free" badge** from marketplace items.

### Webhook Events to Handle

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Set `plan: 'pro'`, store `stripeCustomerId` + `subscriptionId` |
| `invoice.paid` | Extend `planExpiresAt` |
| `customer.subscription.deleted` | Set `plan: 'free'`, clear subscription fields |
| `customer.subscription.updated` | Handle plan changes |

---

## Phase 2 Scope (6–8 weeks)

1. **Annual billing discount** — $199/yr (43% savings) prominently displayed
2. **Team tier** — $49/user/month with org-level billing (see [06-enterprise-tier.md](06-enterprise-tier.md))
3. **Stripe Customer Portal** — self-service plan changes, payment method updates, invoice history
4. **Grace period** — 3-day grace on failed payments before downgrade
5. **Usage-based upsell triggers** — "You've used 48/50 free questions. Upgrade to unlock unlimited."
6. **Promo codes** — Stripe Coupon support for beta users, Reddit campaigns
7. **Lifetime deal** — $399 one-time purchase option (limited to first 100 buyers) as early traction lever

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Users revolt at paywall (everything was free) | 🟡 Medium | Grandfather existing users with 30-day Pro trial. Communicate openly. Free tier still functional. |
| Stripe webhook reliability | 🟡 Medium | Idempotent webhook handler. Store `stripeEventId` to prevent double-processing. Fallback: nightly cron reconciliation. |
| Pricing too high / too low | 🟡 Medium | Start at $29/mo. Monitor conversion rate. A/B test $19 vs $29 vs $39 at 200+ users. |
| Payment fraud | 🟢 Low | Stripe Radar handles this. No custom fraud logic needed. |
| Tax compliance (VAT, sales tax) | 🟡 Medium | Use Stripe Tax from day 1. Adds ~1% to Stripe fees but handles global tax automatically. |
| Scope creep (billing admin UI) | 🟡 Medium | Use Stripe Customer Portal for all self-service. Build zero custom billing UI beyond checkout redirect. |

# Billing UX — User Flows & Interface Spec

> Status: DRAFT
> Date: 2026-02-12
> Depends on: monetization-stripe-spec.md, pricing-tiers.md, paywall-rules.md

---

## 1. UX Principles

1. **Upgrade prompts are contextual, never nagging.** Show the upgrade CTA *at the moment the user hits a limit*, not on every page load.
2. **No custom billing UI.** Use Stripe Checkout for payment. Use Stripe Customer Portal for subscription management. Zero billing forms to build or maintain.
3. **Plan status is always visible but not obnoxious.** Small badge in sidebar — not a persistent banner.
4. **Downgrade is graceful.** User keeps access until period end. Data is never deleted on downgrade.
5. **Dark-theme-native.** All billing UI matches existing dark premium aesthetic.

---

## 2. New Pages

### 2.1 Pricing Page — `/[locale]/pricing`

**Entry points:** Landing page CTA, sidebar "Upgrade" link, all upgrade modals, header badge.

**Layout:**
- Full-width. No sidebar. Minimal nav (logo + sign in / back to dashboard).
- 3-column tier comparison (responsive → stacked on mobile).
- Default: annual billing toggle selected (show monthly price crossed out).
- Pro card highlighted as "Most Popular" with accent border.

**Tier cards:**

| Element | Free | Pro | Team |
|---------|------|-----|------|
| Name | Free | Pro | Team |
| Price (monthly toggle) | $0 | $29/mo | $49/user/mo |
| Price (annual toggle) | $0 | $16.58/mo (billed $199/yr) | Contact us |
| Badge | — | "7-day free trial" | "Coming soon" |
| CTA (logged out) | "Get started" → signup | "Start free trial" → signup | "Contact us" → mailto |
| CTA (logged in, free) | Current plan (disabled) | "Start free trial" → checkout | "Contact us" |
| CTA (logged in, pro) | — | "Current plan" (disabled) | "Contact us" |
| Feature list | Abbreviated (5 items) | Full list (10+ items) | "Everything in Pro +" |

**Billing toggle:**
- Switch between Monthly / Annual
- Annual shows per-month breakdown + "Save 43%" badge
- Prices update in-place (no page reload)

**FAQ section** below tiers:
- "Can I cancel anytime?" → Yes, via account settings.
- "What happens when my trial ends?" → You'll be charged. Cancel anytime before.
- "Can I switch from monthly to annual?" → Yes, from your billing portal. You'll be credited.
- "Do you offer refunds?" → Contact support within 7 days.
- "What payment methods do you accept?" → Credit/debit cards. We use Stripe.

**i18n:** Full localization in `en.json` and `pt-BR.json`. No hardcoded strings.

### 2.2 Checkout Success — `/[locale]/dashboard?checkout=success`

Not a separate page. On `/dashboard`, detect `?checkout=success` query param:

1. Show success toast: "Welcome to Pro! Your account has been upgraded."
2. Call `mutate('/api/billing/status')` to force refresh billing state.
3. Remove query param from URL (replace state, don't push).
4. If billing status still shows `free` after 3 seconds (webhook delay): show "Activating your account..." spinner for up to 10 seconds, polling `/api/billing/status` every 2 seconds.

### 2.3 Billing Settings — No custom page

**Location:** Settings section in existing UI (or new `/[locale]/settings` if none exists).

**Content:**
- Current plan badge: "Pro (Monthly)" / "Free"
- If Pro: "Manage subscription" button → opens Stripe Customer Portal
- If Pro + canceling: "Your plan cancels on {date}. Reactivate →" button → Customer Portal
- If Pro + past_due: "⚠️ Payment failed. Update payment method →" button → Customer Portal
- If Free: "Upgrade to Pro →" button → `/pricing`

**No custom billing forms.** No payment method display. No invoice list. Stripe handles all of this in the Customer Portal.

---

## 3. UI Components

### 3.1 `UpgradeModal` (new component)

**File:** `src/components/ui/UpgradeModal.tsx`

**Trigger:** Called when user hits a paywall (client-side check or API 403 response).

**Props:**
```typescript
interface UpgradeModalProps {
    feature: string;             // Feature key from paywall response
    currentUsage?: number;       // e.g., 3
    limit?: number;              // e.g., 3
    onClose: () => void;
}
```

**Content mapping** (feature → copy):

| `feature` | Title | Body |
|-----------|-------|------|
| `daily_exam_limit` | "Daily exam limit reached" | "Free accounts include 3 exams per day. Upgrade to Pro for unlimited exams." |
| `exam_question_limit` | "Need more questions?" | "Free exams are limited to 25 questions. Pro exams support up to 150." |
| `advanced_exam_modes` | "Unlock smart study modes" | "Spaced Review, Weak Domains, and 4 more adaptive modes are available with Pro." |
| `analytics` | "Track your progress" | "Unlock score trends, readiness predictions, and domain mastery insights." |
| `csv_export` | "Export your data" | "Download your exam history and scores as CSV with Pro." |
| `marketplace_import_limit` | "Import more content" | "Free accounts include 1 marketplace import. Upgrade for unlimited." |
| `question_creation_limit` | "Create more questions" | "You've reached the free limit. Upgrade for unlimited question creation." |
| `study_creation_limit` | "Add more studies" | "Free accounts include 2 studies. Upgrade for unlimited." |
| `bulk_import` | "Bulk import available with Pro" | "Import up to 500 questions at once with Pro." |
| `question_notes` | "Take notes on questions" | "Question notes are a Pro feature. Upgrade to annotate your study material." |

**Layout:**
- Modal overlay (dark backdrop)
- Icon + title + body text
- Two buttons: "Upgrade to Pro" (primary accent) → navigate to `/pricing`, "Maybe later" (ghost) → close
- If usage/limit provided: progress bar showing "3 of 3 used"

**Follows existing modal patterns**: Uses same `useModalA11y` hook, same animation (Framer Motion), same dark styling.

### 3.2 `PlanBadge` (new component)

**File:** `src/components/ui/PlanBadge.tsx`

**Usage:** Sidebar, header, settings page.

**Variants:**
- Free: Gray badge "Free" + "Upgrade" text link
- Pro: Accent-colored badge "Pro"
- Pro (trial): Accent badge "Pro Trial · X days left"
- Pro (canceling): Yellow badge "Pro · Cancels {date}"
- Pro (past_due): Red badge "Pro · Payment issue"

### 3.3 `FeatureLock` (new component)

**File:** `src/components/ui/FeatureLock.tsx`

**Usage:** Overlay on locked UI elements (exam mode buttons, question count chips, etc.)

**Props:**
```typescript
interface FeatureLockProps {
    feature: string;
    children: React.ReactNode;     // The locked element
    showLabel?: boolean;           // Show "Pro" text label (default: true)
}
```

**Behavior:**
- Renders children with reduced opacity (0.5) + lock icon overlay
- On click: prevents default + opens UpgradeModal with feature context
- On hover: tooltip "Available with Pro"

### 3.4 Updates to ExamConfigForm

**File:** `src/components/exams/ExamConfigForm.tsx`

**Changes:**
- Mode buttons for `real_mix`, `weak_domains`, `recent_misses`, `spaced_review` → wrapped in `FeatureLock` for free users
- Question count chips for 50, 100, 150 → wrapped in `FeatureLock` for free users
- Before "Start Exam" submission: check `examsToday < maxExamsPerDay`, otherwise show UpgradeModal
- All checks via `usePlanLimits()` hook — no API call needed for client-side gating

### 3.5 Updates to Dashboard Study Page

**File:** `src/app/[locale]/dashboard/[studyId]/page.tsx`

**Changes:**
- Analytics section: If free → show placeholder card with lock icon + "Upgrade to see analytics"
- Export button: If free → show with `FeatureLock` wrapper
- Question bank count: If free → show "{accessible}/{total} questions (upgrade for all)"

### 3.6 Updates to Sidebar/Header

**Files:** `src/components/layout/Sidebar.tsx` or `Header.tsx`

**Changes:**
- Add `PlanBadge` component below user info
- Free users see: `[Free] Upgrade →` (link to /pricing)
- Pro users see: `[Pro]` badge (no link)

---

## 4. User Flows

### 4.1 New User → Free → Trial → Pro

```
1. User signs up (Google OAuth)
2. UserProfile created with plan: 'free'
3. User explores: takes 3 exams, sees basic scores
4. User hits paywall (4th exam or gated mode)
5. UpgradeModal → "Start free trial" → /pricing
6. /pricing → "Start free trial" → POST /api/billing/create-checkout
7. Redirect to Stripe Checkout (trial: 7 days, no charge yet)
8. User enters payment method
9. Stripe redirects to /dashboard?checkout=success
10. Webhook fires → plan: 'pro', status: 'trialing'
11. User has full access for 7 days
12. Day 7: Stripe charges card. invoice.paid → plan stays 'pro', status: 'active'
13. Recurring monthly charge.
```

### 4.2 Pro → Cancel → Downgrade

```
1. Pro user → Settings → "Manage subscription" → Stripe Customer Portal
2. User clicks "Cancel plan" in portal
3. Stripe sets cancel_at_period_end: true
4. Webhook: subscription.updated → UI shows "Cancels on {date}"
5. User retains Pro access until period end
6. Period end: subscription.deleted webhook → plan: 'free'
7. User now on free tier limits
8. Data NOT deleted — history, scores, questions all preserved
9. User can re-subscribe anytime
```

### 4.3 Failed Payment → Grace → Recovery

```
1. Pro user's card declines on renewal
2. invoice.payment_failed → status: 'past_due'
3. UI shows: "⚠️ Payment failed. Update payment method →"
4. User still has Pro access during Stripe retry window (~3 weeks)
5a. User updates card in portal → invoice.paid → status: 'active'. Banner cleared.
5b. All retries fail → subscription.deleted → plan: 'free'. User downgraded.
```

### 4.4 Free → Hit Paywall (Contextual)

```
1. Free user on ExamConfigForm
2. Clicks "Weak Domains" mode (gated)
3. FeatureLock intercepts → UpgradeModal
4. Modal: "Unlock smart study modes — Spaced Review, Weak Domains, and more"
5. CTA: "Start free trial" → /pricing
   OR "Maybe later" → modal closes, returns to form
```

### 4.5 Post-Checkout Activation Delay

```
1. User completes Stripe Checkout
2. Redirects to /dashboard?checkout=success
3. Client calls /api/billing/status → still "free" (webhook hasn't arrived yet)
4. Client shows "Activating..." spinner
5. Client polls /api/billing/status every 2s
6. Webhook arrives → Firestore updated → next poll returns "pro"
7. Spinner replaced with success toast
8. If 15 seconds pass with no update:
   → Show: "Almost done! Your account is being activated. Refresh if needed."
   → This handles Stripe webhook delays (rare but possible)
```

---

## 5. Landing Page Updates

**File:** `src/app/[locale]/(landing)/page.tsx`

### Changes:

1. **Hero CTA:** "Start studying for free" → "Start your free trial" (links to /pricing if logged out, /dashboard if logged in)
2. **Final CTA:** "Create your free account" → "Try ExamFlow free for 7 days"
3. **New section: Pricing** — Embed abbreviated pricing comparison (2 tiers: Free vs Pro) with links to full `/pricing` page
4. **Testimonials:** Remove all 6 fake testimonials. Replace with either:
   - "Join our beta" CTA (pre-beta users)
   - Real testimonials (post-beta)
   - Or simply remove the section

### Meta/SEO:

- Add `<meta name="description" content="Adaptive certification exam prep with spaced repetition. CISSP, CC, Security+. Free trial.">`
- Remove any reference to "Premium practice exam platform" — doesn't match if product has a free tier

---

## 6. Email Notifications (Future — Not MVP)

These are for Phase 2. Do NOT build for initial launch.

| Trigger | Email | When |
|---------|-------|------|
| Trial started | "Welcome to Pro — here's how to get the most out of your trial" | Immediate |
| Trial ending | "Your trial ends in 2 days — keep your Pro access" | 2 days before trial end |
| Payment successful | "Your Pro subscription is confirmed" | On `invoice.paid` |
| Payment failed | "Action required: update your payment method" | On `invoice.payment_failed` |
| Subscription canceled | "We're sorry to see you go — your access continues until {date}" | On cancel |
| Downgrade completed | "Your account has been switched to Free" | On `subscription.deleted` |

---

## 7. i18n Keys to Add

Add these key groups to `src/messages/en.json` and `src/messages/pt-BR.json`:

```
billing.plan.free / billing.plan.pro / billing.plan.team
billing.trial.badge / billing.trial.daysLeft
billing.cta.upgrade / billing.cta.startTrial / billing.cta.managePlan
billing.cta.canceledNotice / billing.cta.pastDueNotice
billing.checkout.success / billing.checkout.activating
billing.paywall.title.{feature} / billing.paywall.body.{feature}
pricing.title / pricing.subtitle
pricing.toggle.monthly / pricing.toggle.annual / pricing.toggle.savePercent
pricing.tier.{free|pro|team}.name / .price / .period / .features[]
pricing.faq.{key}.question / .answer
```

Estimated: ~60-80 new i18n keys per language.

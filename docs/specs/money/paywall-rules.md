# Paywall Rules — Enforcement Specification

> Status: DRAFT
> Date: 2026-02-12
> Depends on: monetization-stripe-spec.md, pricing-tiers.md

---

## 1. Enforcement Principle

**Server is the only enforcement layer.** Client-side gating is cosmetic UX — it prevents users from seeing broken states. A determined user who bypasses the client UI still hits a 403 from the API.

Every rule below has:
- **API enforcement** — the route that rejects the request
- **Client treatment** — how the UI communicates the limit
- **Error response** — the exact payload the API returns

---

## 2. Standard Paywall Response

All paywall rejections use the same response shape:

```json
{
    "error": "Upgrade to Pro to access this feature",
    "code": "PAYWALL_REQUIRED",
    "details": {
        "requiredPlan": "pro",
        "feature": "advanced_exam_modes",
        "currentUsage": 3,
        "limit": 3,
        "upgradeUrl": "/pricing"
    }
}
```

HTTP status: **403 Forbidden**

The `details.feature` key tells the client which upgrade CTA to show. The `details.limit` and `details.currentUsage` allow the client to display contextual messaging ("You've used 3 of 3 free exams today").

---

## 3. Paywall Rules — Complete Table

### Rule 1: Exam Creation — Daily Limit (Free)

| Aspect | Value |
|--------|-------|
| **Route** | `POST /api/exams` |
| **Condition** | Free user AND completed/in-progress exams today ≥ `FREE_MAX_EXAMS_PER_DAY` (3) |
| **Check** | Query `users/{uid}/exams` where `startedAt >= startOfTodayUTC`. Count results. |
| **Feature key** | `daily_exam_limit` |
| **Client** | Disable "Start Exam" button. Show: "You've used all 3 free exams today. Upgrade for unlimited." |
| **Pro behavior** | No limit. |

### Rule 2: Exam Creation — Question Count Cap (Free)

| Aspect | Value |
|--------|-------|
| **Route** | `POST /api/exams` |
| **Condition** | Free user AND `config.questionCount > FREE_MAX_QUESTIONS_PER_EXAM` (25) |
| **Check** | Validate input in request handler, before calling `createExam`. |
| **Feature key** | `exam_question_limit` |
| **Client** | In ExamConfigForm, disable question count chips >25. Show lock icon + "Pro" badge on 50/100/150 options. |
| **Pro behavior** | Up to 150 questions. |

### Rule 3: Exam Creation — Mode Restriction (Free)

| Aspect | Value |
|--------|-------|
| **Route** | `POST /api/exams` |
| **Condition** | Free user AND `config.mode` NOT in `FREE_EXAM_MODES` (`practice`, `domain_focus`) |
| **Check** | Validate `mode` against allowed modes for plan. |
| **Feature key** | `advanced_exam_modes` |
| **Client** | In ExamConfigForm, show lock icon on `real_mix`, `weak_domains`, `recent_misses`, `spaced_review`. On click: show upgrade modal. |
| **Pro behavior** | All 6 modes available. |

### Rule 4: Question Pool Size (Free)

| Aspect | Value |
|--------|-------|
| **Route** | `POST /api/exams` (internally, within `createExam`) |
| **Condition** | Free user |
| **Check** | When calling `fetchQuestionPool`, pass `limit: FREE_MAX_QUESTIONS_PER_STUDY` (50). Only first 50 questions (by `createdAt` ASC) are eligible for exam selection. |
| **Feature key** | `question_pool_limit` |
| **Client** | On question bank page, show "50 of {total} questions accessible. Upgrade for full access." First 50 are interactable; rest show lock overlay. |
| **Pro behavior** | Full question pool. |

### Rule 5: Analytics Dashboard (Free)

| Aspect | Value |
|--------|-------|
| **Route** | `GET /api/analytics` |
| **Condition** | Free user |
| **Check** | Wrap with `withPlan('pro')`. Return 403 for free users. |
| **Feature key** | `analytics` |
| **Client** | Analytics page shows blurred preview + "Upgrade to Pro to see your analytics" CTA. Or redirect to pricing page. |
| **Pro behavior** | Full analytics (trends, readiness, domain breakdown). |

### Rule 6: CSV Export (Free)

| Aspect | Value |
|--------|-------|
| **Route** | `GET /api/export` |
| **Condition** | Free user |
| **Check** | Wrap with `withPlan('pro')`. Return 403. |
| **Feature key** | `csv_export` |
| **Client** | Export button shows lock icon. On click: upgrade modal. |
| **Pro behavior** | Full CSV export. |

### Rule 7: Marketplace Import Limit (Free)

| Aspect | Value |
|--------|-------|
| **Route** | `POST /api/marketplace/import` |
| **Condition** | Free user AND existing imported studies count ≥ `FREE_MAX_MARKETPLACE_IMPORTS` (1) |
| **Check** | Query `users/{uid}/studies` where `_source.type == 'marketplace'`. Count. |
| **Feature key** | `marketplace_import_limit` |
| **Client** | After 1 import, Import button shows: "You've used your free import. Upgrade for unlimited." |
| **Pro behavior** | Unlimited imports. |

### Rule 8: Personal Question Creation (Free)

| Aspect | Value |
|--------|-------|
| **Route** | `POST /api/questions` |
| **Condition** | Free user AND total questions across all studies ≥ `FREE_MAX_PERSONAL_QUESTIONS` (10) |
| **Check** | Count all docs in `users/{uid}/questions` (across all studies). This is a cross-study count. |
| **Feature key** | `question_creation_limit` |
| **Client** | "Add Question" button disabled when at limit. Show: "10/10 questions created. Upgrade for unlimited." |
| **Pro behavior** | Unlimited. |

### Rule 9: Study Creation (Free)

| Aspect | Value |
|--------|-------|
| **Route** | `POST /api/studies` |
| **Condition** | Free user AND existing studies count ≥ `FREE_MAX_STUDIES` (2) |
| **Check** | Count `users/{uid}/studies` docs. |
| **Feature key** | `study_creation_limit` |
| **Client** | "New Study" button disabled at limit. Show: "2/2 studies created. Upgrade for unlimited." |
| **Pro behavior** | Unlimited. |

### Rule 10: Bulk Question Import (Free)

| Aspect | Value |
|--------|-------|
| **Route** | `POST /api/questions/import` |
| **Condition** | Free user |
| **Check** | Wrap with `withPlan('pro')`. |
| **Feature key** | `bulk_import` |
| **Client** | Import button shows lock. |
| **Pro behavior** | Up to 500 questions per batch. |

### Rule 11: Question Notes (Free)

| Aspect | Value |
|--------|-------|
| **Route** | `PUT /api/notes` |
| **Condition** | Free user |
| **Check** | Wrap with `withPlan('pro')`. |
| **Feature key** | `question_notes` |
| **Client** | Notes input disabled with "Pro" badge. |
| **Pro behavior** | Unlimited notes. |

---

## 4. Enforcement Implementation Pattern

### Server-Side: `checkPlanLimit` Utility

Instead of duplicating limit checks, create a reusable helper:

```typescript
// Pseudocode for src/lib/plan-limits.ts

interface PlanLimitCheck {
    feature: string;
    allowed: boolean;
    currentUsage?: number;
    limit?: number;
}

async function checkPlanLimit(
    uid: string,
    plan: 'free' | 'pro' | 'team',
    feature: string
): Promise<PlanLimitCheck>

// Usage in API route:
const check = await checkPlanLimit(user.uid, effectivePlan, 'daily_exam_limit');
if (!check.allowed) {
    throw new PaywallError('pro', check);
}
```

This keeps limit logic centralized and testable. Each rule maps to a feature key. Constants come from `src/lib/constants.ts`.

### Server-Side: `withPlan` Middleware

For binary Pro-gated features (analytics, export, notes, bulk import), use `withPlan('pro')` directly on the route. No need for `checkPlanLimit`.

For metered features (exams/day, questions created, imports), use `checkPlanLimit` inside the route handler after `withAuth`.

### Client-Side: `usePlanLimits` Hook

```typescript
// Pseudocode for src/hooks/usePlanLimits.ts

function usePlanLimits() {
    const { plan } = usePlan();
    return {
        maxExamsPerDay: plan === 'free' ? 3 : Infinity,
        maxQuestionsPerExam: plan === 'free' ? 25 : 150,
        allowedModes: plan === 'free' ? ['practice', 'domain_focus'] : ALL_MODES,
        canExport: plan !== 'free',
        canUseAnalytics: plan !== 'free',
        canUseNotes: plan !== 'free',
        canBulkImport: plan !== 'free',
        // ...
    };
}
```

Components read from this hook to show/hide/disable UI elements. Limits constants are shared between server and client via constants file.

---

## 5. Usage Counting — Performance Considerations

| Counter | Query Cost | Strategy |
|---------|-----------|----------|
| Exams today | 1 Firestore query (indexed) | Index on `users/{uid}/exams` → `startedAt DESC`. Query with `startedAt >= startOfToday`. |
| Questions created (total) | 1 Firestore count | Use `countDocuments()` on `users/{uid}/questions` collection. Or maintain denormalized counter on UserProfile. |
| Studies count | 1 Firestore count | Already available: count `users/{uid}/studies`. Small collection — count is cheap. |
| Marketplace imports | 1 Firestore query | Query `users/{uid}/studies` where `_source.type == 'marketplace'`. |

**Optimization:** For frequently checked counters (exams today), consider caching the count in the user's stats document (already updated on each exam submission via `recordActivity`). Avoids an extra query per exam creation.

---

## 6. Admin Override

Admins (`roles.includes('admin')`) are always treated as `plan: 'pro'`. No paywall applies. This is handled in `resolveEffectivePlan` — not in individual route guards.

---

## 7. Paywall Error Handling — Client Flow

```
User clicks gated feature
  → Client checks usePlanLimits()
    → If blocked:
      → Show UpgradeModal with feature-specific messaging
      → CTA: "Start free trial" or "Upgrade to Pro"
      → On click: redirect to /pricing or create checkout session
    → If allowed:
      → Proceed with API call
        → If API returns PAYWALL_REQUIRED (race condition / stale client):
          → Show UpgradeModal
          → Mutate /api/billing/status to refresh plan
```

Race condition: User's trial expired between client check and API call. Client had stale `plan: 'pro'`. API rejects. Client shows upgrade modal and refreshes billing status. This is the happy path — no special handling needed.

---

## 8. Grace Period Rules

| Subscription State | Effective Plan | Duration | User Experience |
|-------------------|----------------|----------|-----------------|
| `active` | Pro | Indefinite | Full access |
| `trialing` | Pro | 7 days | Full access + trial badge in UI |
| `past_due` | Pro | ~3 weeks (Stripe retry) | Full access + "Update payment method" banner |
| `canceled` + `planPeriodEnd > now` | Pro | Until period end | Full access + "Your plan cancels on {date}" banner |
| `canceled` + `planPeriodEnd <= now` | Free | Permanent | Free limits apply |
| `unpaid` | Free | Immediate | Free limits apply |
| `incomplete` | Free | Immediate | Free limits apply |

**Key principle:** Never yank access mid-period. If the user paid, they get what they paid for until the period ends. Stripe handles the rest.

---

## 9. Testing Matrix

| Scenario | Precondition | Action | Expected Result |
|----------|-------------|--------|-----------------|
| Free: 4th exam today | 3 exams created today | `POST /api/exams` | 403 `PAYWALL_REQUIRED` with `daily_exam_limit` |
| Free: 50-question exam | Free plan | `POST /api/exams` with `questionCount: 50` | 403 `PAYWALL_REQUIRED` with `exam_question_limit` |
| Free: spaced_review mode | Free plan | `POST /api/exams` with `mode: 'spaced_review'` | 403 `PAYWALL_REQUIRED` with `advanced_exam_modes` |
| Free: analytics page | Free plan | `GET /api/analytics` | 403 `PAYWALL_REQUIRED` with `analytics` |
| Free: CSV export | Free plan | `GET /api/export` | 403 `PAYWALL_REQUIRED` with `csv_export` |
| Free: 2nd marketplace import | 1 existing import | `POST /api/marketplace/import` | 403 `PAYWALL_REQUIRED` with `marketplace_import_limit` |
| Free: 11th question | 10 existing questions | `POST /api/questions` | 403 `PAYWALL_REQUIRED` with `question_creation_limit` |
| Free: 3rd study | 2 existing studies | `POST /api/studies` | 403 `PAYWALL_REQUIRED` with `study_creation_limit` |
| Pro: all features | Active Pro subscription | All gated endpoints | 200/201 success |
| Admin: all features | Admin role, no subscription | All gated endpoints | 200/201 success (admin override) |
| Past due: Pro access | `status: 'past_due'` | All gated endpoints | 200/201 success (grace) |
| Canceled mid-period | `canceled`, period end in future | All gated endpoints | 200/201 success |
| Canceled past period | `canceled`, period end in past | All gated endpoints | 403 (free limits) |

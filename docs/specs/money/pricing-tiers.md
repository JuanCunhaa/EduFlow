# Pricing Tiers — Feature Matrix & Limits

> Status: DRAFT
> Date: 2026-02-12
> Depends on: monetization-stripe-spec.md

---

## 1. Tier Summary

| | **Free** | **Pro** | **Team** (Phase 2) |
|---|---|---|---|
| **Price** | $0 | $29/mo · $199/yr | $49/user/mo · $39/user/mo annual |
| **Target** | Explorers, evaluators | Individual cert candidates | L&D teams, bootcamps |
| **Trial** | — | 7-day free trial (first time only) | 14-day free trial |

---

## 2. Feature Limits — Exhaustive Matrix

Every row is a **concrete enforcement point** in the API or UI.

### 2.1 Exams

| Feature | Free | Pro | Team | Enforcement Point |
|---------|------|-----|------|-------------------|
| Exams per day | **3** | Unlimited | Unlimited | `POST /api/exams` — count today's exams for user |
| Max questions per exam | **25** | 150 | 150 | `POST /api/exams` — validate `questionCount` |
| Exam modes: `practice` | ✅ | ✅ | ✅ | — |
| Exam modes: `domain_focus` | ✅ | ✅ | ✅ | — |
| Exam modes: `real_mix` | ❌ | ✅ | ✅ | `POST /api/exams` — reject if mode not allowed |
| Exam modes: `weak_domains` | ❌ | ✅ | ✅ | `POST /api/exams` — reject if mode not allowed |
| Exam modes: `recent_misses` | ❌ | ✅ | ✅ | `POST /api/exams` — reject if mode not allowed |
| Exam modes: `spaced_review` | ❌ | ✅ | ✅ | `POST /api/exams` — reject if mode not allowed |
| Exam review (post-exam explanations) | ✅ | ✅ | ✅ | — |
| Timed exams | ✅ | ✅ | ✅ | — |

### 2.2 Questions & Content

| Feature | Free | Pro | Team | Enforcement Point |
|---------|------|-----|------|-------------------|
| Questions accessible per study | **50** | Unlimited | Unlimited | `selectQuestions()` in exam-engine — pool limited by plan |
| Question bank browsing | List only (no explanations) | Full access | Full access | `GET /api/questions` — omit explanations for free |
| Personal question creation | **10** total | Unlimited | Unlimited | `POST /api/questions` — count existing |
| Bulk question import | ❌ | ✅ (500/batch) | ✅ (500/batch) | `POST /api/questions/import` — withPlan |
| Question notes | ❌ | ✅ | ✅ | `PUT /api/notes` — withPlan |

### 2.3 Marketplace

| Feature | Free | Pro | Team | Enforcement Point |
|---------|------|-----|------|-------------------|
| Browse marketplace | ✅ | ✅ | ✅ | — |
| Import from marketplace | **1 study** (max 2 domains) | Unlimited | Unlimited | `POST /api/marketplace/import` — count existing imports |
| View marketplace question previews | 5 per study | Unlimited | Unlimited | `GET /api/marketplace/studies/[id]/questions` — limit |

### 2.4 Analytics & Tracking

| Feature | Free | Pro | Team | Enforcement Point |
|---------|------|-----|------|-------------------|
| Basic score after exam | ✅ | ✅ | ✅ | — |
| Domain-level scores (post-exam) | ✅ | ✅ | ✅ | — |
| Analytics dashboard (trends, readiness) | ❌ | ✅ | ✅ | `GET /api/analytics` — withPlan |
| Score trend chart | ❌ | ✅ | ✅ | Gated with analytics |
| Readiness score | ❌ | ✅ | ✅ | Gated with analytics |
| Domain mastery breakdown | ❌ | ✅ | ✅ | Gated with analytics |

### 2.5 Retention & Gamification

| Feature | Free | Pro | Team | Enforcement Point |
|---------|------|-----|------|-------------------|
| Daily streak counter | ✅ | ✅ | ✅ | — |
| Badges | ✅ | ✅ | ✅ | — |
| Daily challenge | ✅ | ✅ | ✅ | — |
| Activity heatmap | Last **30 days** | Full 180 days | Full 180 days | Client-side truncation (`recentDays.slice(-30)`) |
| Weekly goal tracking | ✅ | ✅ | ✅ | — |

### 2.6 Data & Export

| Feature | Free | Pro | Team | Enforcement Point |
|---------|------|-----|------|-------------------|
| CSV export | ❌ | ✅ | ✅ | `GET /api/export` — withPlan |
| Share progress image | ✅ | ✅ (no watermark) | ✅ | Free tier gets watermark overlay |
| Study creation | **2 studies** | Unlimited | Unlimited | `POST /api/studies` — count existing |

### 2.7 Team Features (Phase 2 only)

| Feature | Free | Pro | Team | Enforcement Point |
|---------|------|-----|------|-------------------|
| Org management | ❌ | ❌ | ✅ | Separate API routes |
| Team analytics (aggregate) | ❌ | ❌ | ✅ | Separate API routes |
| SSO (SAML) | ❌ | ❌ | ✅ | Org-level config |
| Seat management | ❌ | ❌ | ✅ | Org admin dashboard |

---

## 3. Limit Constants

Define in `src/lib/constants.ts`, grouped clearly:

```typescript
// ── Plan Limits (Free Tier) ─────────────────────

/** Max exams a free user can create per calendar day */
export const FREE_MAX_EXAMS_PER_DAY = 3;

/** Max questions per exam for free users */
export const FREE_MAX_QUESTIONS_PER_EXAM = 25;

/** Max questions accessible per study for free users */
export const FREE_MAX_QUESTIONS_PER_STUDY = 50;

/** Max personal questions a free user can create */  
export const FREE_MAX_PERSONAL_QUESTIONS = 10;

/** Max studies a free user can create */
export const FREE_MAX_STUDIES = 2;

/** Max marketplace imports for free users */
export const FREE_MAX_MARKETPLACE_IMPORTS = 1;

/** Max marketplace domains per import for free users */
export const FREE_MAX_MARKETPLACE_IMPORT_DOMAINS = 2;

/** Max marketplace question previews per study for free users */
export const FREE_MAX_MARKETPLACE_QUESTION_PREVIEWS = 5;

/** Activity heatmap days for free users */
export const FREE_HEATMAP_DAYS = 30;

/** Exam modes available to free users */
export const FREE_EXAM_MODES: ExamMode[] = ['practice', 'domain_focus'];

/** Exam modes that require Pro */
export const PRO_EXAM_MODES: ExamMode[] = ['real_mix', 'weak_domains', 'recent_misses', 'spaced_review'];
```

---

## 4. Plan Resolution Logic

Priority order for determining a user's effective plan:

```
1. If user.plan === 'team' AND org subscription active → 'team'
2. If user.plan === 'pro'  AND subscription active/trialing/past_due → 'pro'
3. If user.plan === 'pro'  AND subscription canceled BUT planPeriodEnd > now → 'pro'
4. If admin role → 'pro' (admins always have full access)
5. Otherwise → 'free'
```

**Important:** `past_due` still grants Pro access. Stripe handles dunning. Don't punish users during the retry window.

---

## 5. Free Tier Philosophy

The Free tier must be **useful enough to evaluate** but **limited enough to frustrate power users into upgrading**.

### What Free does well:
- Full exam experience in `practice` and `domain_focus` modes
- Post-exam scores with domain breakdown
- Daily challenge for retention
- Streaks and badges for engagement
- 1 marketplace import for content sampling

### Where Free creates friction:
- Hit the 3 exam/day cap during intense study sessions → "Upgrade for unlimited exams"
- Want 50+ question exams → "Upgrade for up to 150 questions per exam"
- Want to find weak areas automatically → "Upgrade for Smart Modes"
- Want to track progress over time → "Upgrade for Analytics"
- Want to export study data → "Upgrade for CSV Export"

### Deliberate non-limits:
- No time limit on free accounts (no forced upgrade deadline)
- No ad injection (never)
- No feature teasing behind blurred UI (show lock icon, not blurred data)
- Daily challenge always free (retention hook to keep free users coming back)

---

## 6. Upgrade Triggers — Where to Surface CTAs

| Context | Trigger | CTA Message |
|---------|---------|-------------|
| Exam config form | Select gated mode | "🔒 Smart modes available with Pro — Upgrade" |
| Exam config form | Select >25 questions | "🔒 Free plan allows up to 25 questions — Upgrade for 150" |
| Exam config form | 4th exam today | "You've used all 3 free exams today — Upgrade for unlimited" |
| Analytics page | Navigate to `/analytics` | "📊 Upgrade to Pro to track your progress — Start free trial" |
| Export button | Click export | "📦 CSV export is a Pro feature — Upgrade" |
| Marketplace import | 2nd import attempt | "You've used your free import — Upgrade for unlimited" |
| Question bank | Create 11th question | "You've reached the free limit of 10 questions — Upgrade" |
| Study creation | Create 3rd study | "Free plan allows 2 studies — Upgrade for unlimited" |
| Sidebar/Header | Always visible for free users | Small "Upgrade to Pro" badge |
| Share image | After generation | Free tier watermark: "Made with ExamFlow — Get Pro" |

---

## 7. Pricing Display

### On `/pricing` page:

```
┌──────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│     Free     │  │    Pro (Popular)      │  │       Team           │
│              │  │                      │  │                      │
│  $0/forever  │  │  $29/mo  ·  $199/yr  │  │  Contact us          │
│              │  │  Save 43% annually   │  │  $49/user/mo         │
│              │  │                      │  │                      │
│  3 exams/day │  │  Unlimited exams     │  │  Everything in Pro   │
│  25 Q/exam   │  │  150 Q/exam          │  │  + Team dashboard    │
│  2 modes     │  │  All 6 modes         │  │  + SSO               │
│  No analytics│  │  Full analytics      │  │  + Admin analytics   │
│              │  │                      │  │                      │
│ [Get started]│  │ [Start free trial →] │  │ [Contact sales]      │
└──────────────┘  └──────────────────────┘  └──────────────────────┘
```

- Default toggle: Annual billing (higher conversion, show monthly price crossed out)
- Team tier: "Coming soon" or "Contact us" mailto link. No checkout.
- Badge: "7-day free trial" on Pro card

---

## 8. Pricing Iteration Plan

| Timeframe | Action | Signal to Watch |
|-----------|--------|-----------------|
| Day 1–30 | Launch at $29/mo, $199/yr | Conversion rate, trial→paid rate |
| Day 30–60 | If conversion <5%, test $19/mo | A/B test via Stripe price switching |
| Day 30–60 | If conversion >15%, test $39/mo | Users are clearly underpriced |
| Day 60+ | Survey churned users | "Why did you cancel?" — price vs. value |
| Day 90+ | Introduce lifetime deal ($399 one-time) if MRR >$2K | Test on AppSumo or direct |

**Never discount more than 50%.** Deep discounts attract low-quality users who churn immediately.

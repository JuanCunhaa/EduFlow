# Email Capture — Capture Points & Architecture

> Status: DRAFT
> Date: 2026-02-12
> Role: Lifecycle Marketing + Growth Engineer
> Dependency: `seo/seo-strategy.md`, `money/pricing-tiers.md`, `beta/beta-program.md`

---

## 1. Why Email Capture Matters

ExamFlow's current growth model has a fatal leak:

```
Visitor → (Google sign-in) → Dashboard → (study) → (maybe pay)
                                                      ↕
                                   No way to re-engage if they leave
```

If a visitor doesn't sign up immediately, they're gone forever. There's no remarketing pixel, no retargeting budget, and no way to follow up. Email fixes this:

```
Visitor → email captured → drip sequence → sign up → activate → convert
           ↑                                   ↑              ↑
        low friction                    trust built         value proven
```

**Goal:** Capture email before or alongside account creation so ExamFlow can nurture leads who aren't ready to sign up on first visit.

### 1.1 Funnel Economics

| Metric | Without Email | With Email Engine |
|--------|--------------|-------------------|
| Landing page → signup | 3-5% | 3-5% (unchanged) |
| Landing page → email captured | 0% | 8-15% (new) |
| Email captured → signup (14d) | — | 20-35% |
| Effective visitor → signup | 3-5% | 5-9% (1.5-2× lift) |
| Cost per email | — | $0 (organic content + tooling) |

At 1,000 monthly visitors, that's 20-40 additional signups/month from email alone.

---

## 2. Capture Points

### 2.1 Capture Point Map

```
┌─────────────────────────────────────────────────────────────┐
│  VISITOR JOURNEY                                            │
│                                                             │
│  ┌──────────┐                                               │
│  │  Google   │─→ Landing Page ─┬─→ Sign Up (existing flow)  │
│  │  Organic  │                 │                             │
│  │  Social   │                 ├─→ [CP1] Hero Email Gate     │
│  │  Reddit   │                 │                             │
│  └──────────┘                  ├─→ [CP2] Free Quiz CTA       │
│                                │                             │
│                                ├─→ [CP3] Study Plan Download │
│                                │                             │
│                                └─→ [CP4] Exit Intent Popup   │
│                                                             │
│  ┌──────────┐                                               │
│  │  SEO      │─→ Content Pages ─┬─→ [CP5] Inline Content    │
│  │  Blog     │   (guides, tips) │    Upgrade / Gate          │
│  │  Domain   │                  │                             │
│  │  Pages    │                  └─→ [CP6] Bottom-of-Post CTA │
│  └──────────┘                                               │
│                                                             │
│  ┌──────────┐                                               │
│  │  In-App   │─→ Free User ─────┬─→ [CP7] Post-Quiz Email   │
│  │  (logged  │   hits limit     │    Capture                 │
│  │   in)     │                  │                             │
│  │           │                  └─→ [CP8] Analytics Teaser    │
│  └──────────┘                       (blurred + email gate)   │
└─────────────────────────────────────────────────────────────┘
```

---

### 2.2 CP1 — Hero Email-First Option

**Where:** Landing page hero section, below the main CTA
**Trigger:** Page load (always visible)
**Friction:** Very low — one field

```
┌────────────────────────────────────────────────────┐
│  Study smarter. Perform higher.                    │
│                                                    │
│  [Start studying for free →]    ← existing CTA     │
│                                                    │
│  ── or get a free study plan ──                    │
│                                                    │
│  ┌────────────────────────┐ [Send Plan]            │
│  │  your@email.com        │                        │
│  └────────────────────────┘                        │
│                                                    │
│  "Join 500+ cybersecurity professionals studying   │
│   for CISSP, CC, and Security+"                    │
└────────────────────────────────────────────────────┘
```

**What they get:** 7-day CISSP study plan PDF (see `lead-magnets.md`)
**What we get:** Email + implicit cert interest (CISSP)
**Tag applied:** `source:landing_hero`, `cert:cissp`, `lead_magnet:study_plan`

### 2.3 CP2 — Free Readiness Quiz CTA

**Where:** Landing page, cert hub pages (`/en/cissp/`), blog posts
**Trigger:** User clicks "Check your readiness"
**Friction:** Low — answer 10 questions, enter email for report

```
┌────────────────────────────────────────────────────┐
│  How ready are you for CISSP?                      │
│                                                    │
│  Take a free 10-question readiness check.          │
│  Get a personalized domain weakness report.        │
│                                                    │
│  [Start Readiness Check →]                         │
│                                                    │
│  ✓ No signup required to take the quiz             │
│  ✓ Email required to see your report               │
└────────────────────────────────────────────────────┘
```

**Flow:**
1. User clicks → mini quiz (10 curated questions, one per domain area)
2. User answers all 10
3. Show partial result: "You scored 6/10. Your weakest area is Domain 4."
4. Gate the full report: "Enter your email to get your complete domain weakness breakdown"
5. Email submitted → full report delivered + user enters drip

**What we get:** Email + cert + per-domain weakness data (extremely valuable for segmentation)
**Tag applied:** `source:readiness_quiz`, `cert:{cert}`, `quiz_score:{score}`, `weak_domains:{d1,d4}`

### 2.4 CP3 — Study Plan Download

**Where:** Cert hub pages, blog posts ("How to study for CISSP in 3 months")
**Trigger:** User clicks download CTA
**Friction:** Email for PDF

```
┌────────────────────────────────────────────────────┐
│  📄 Free: 7-Day CISSP Study Plan                    │
│                                                    │
│  Day-by-day schedule with domains, time            │
│  estimates, and practice exam targets.             │
│                                                    │
│  ┌────────────────────┐ [Download Free →]          │
│  │ your@email.com     │                            │
│  └────────────────────┘                            │
└────────────────────────────────────────────────────┘
```

**Tag applied:** `source:study_plan_download`, `cert:{cert}`, `lead_magnet:study_plan`

### 2.5 CP4 — Exit Intent Popup

**Where:** Landing page, cert hub pages
**Trigger:** Mouse moves toward browser close/back (desktop), 30s + scroll > 50% on mobile
**Frequency:** Once per session, max once per 7 days (cookie-based)

```
┌────────────────────────────────────────────────────┐
│  Before you go —                                   │
│                                                    │
│  Get a free domain weakness report for CISSP.      │
│  10 questions. 3 minutes. Know exactly where       │
│  to focus.                                         │
│                                                    │
│  [Take the Free Quiz →]        [No thanks]         │
└────────────────────────────────────────────────────┘
```

**Rules:**
- Never show to logged-in users (they're already captured)
- Never show on the login page
- Respect "No thanks" — don't re-show for 30 days
- No dark patterns (clear close button, no guilt-trip copy)

**Tag applied:** `source:exit_intent`, `cert:{cert}`

### 2.6 CP5 — Inline Content Gate

**Where:** SEO content pages (domain deep-dives, blog posts)
**Trigger:** User reads ~60% of the article
**Friction:** Low — contextual and relevant

```
┌────────────────────────────────────────────────────┐
│  ── Continue reading ──                            │
│                                                    │
│  Want practice questions for this domain?          │
│  Get 10 free practice questions + explanations     │
│  for CISSP Domain 4: Communication & Network       │
│  Security.                                         │
│                                                    │
│  ┌────────────────────┐ [Get Questions →]          │
│  │ your@email.com     │                            │
│  └────────────────────┘                            │
└────────────────────────────────────────────────────┘
```

**Tag applied:** `source:content_gate`, `cert:{cert}`, `domain:{domain}`

### 2.7 CP6 — Bottom-of-Post CTA

**Where:** Every blog post, guide, and comparison page
**Trigger:** User reaches bottom of content
**Friction:** Lowest — just a banner

```
┌────────────────────────────────────────────────────┐
│  Ready to start practicing?                        │
│                                                    │
│  ExamFlow generates adaptive practice exams that   │
│  target your weak domains. Free to start.          │
│                                                    │
│  [Create Free Account →]  or  [Get Study Plan →]   │
└────────────────────────────────────────────────────┘
```

No email gate here — direct to signup or lead magnet. This catches high-intent readers.

### 2.8 CP7 — Post-Free-Quiz Email Capture (In-App)

**Where:** After a free-tier user completes their 3rd exam
**Trigger:** Exam results screen, free user, no email on file yet (if using anonymous/guest mode)
**Friction:** Low — they've already experienced value

```
┌────────────────────────────────────────────────────┐
│  Your score: 72%                                   │
│                                                    │
│  Save your progress and get weekly study tips:     │
│                                                    │
│  ┌────────────────────┐ [Save & Continue →]        │
│  │ your@email.com     │                            │
│  └────────────────────┘                            │
│                                                    │
│  ✓ We'll never spam you. Unsubscribe anytime.      │
└────────────────────────────────────────────────────┘
```

**Tag applied:** `source:post_exam_capture`, `cert:{cert}`, `exam_score:{score}`, `exams_taken:3`

### 2.9 CP8 — Analytics Teaser (In-App)

**Where:** Free user clicks on "Analytics" in sidebar
**Trigger:** Free user attempts to access Pro-only analytics
**Gate:** Show blurred preview + email capture to get a one-time sample report

```
┌────────────────────────────────────────────────────┐
│  Your Domain Performance (Preview)                 │
│                                                    │
│  ┌──────── BLURRED ────────┐                       │
│  │  Domain 1: ████ 72%     │                       │
│  │  Domain 2: ██████ 85%   │                       │
│  │  Domain 3: ███ 58%      │                       │
│  └─────────────────────────┘                       │
│                                                    │
│  Get your full domain weakness report:             │
│  ┌────────────────────┐ [Send My Report →]         │
│  │ your@email.com     │                            │
│  └────────────────────┘                            │
│                                                    │
│  Or [upgrade to Pro] for real-time analytics.      │
└────────────────────────────────────────────────────┘
```

**Tag applied:** `source:analytics_teaser`, `cert:{cert}`, `plan:free`

---

## 3. Email Capture Data Model

### 3.1 Lead Record

```typescript
interface EmailLead {
    email: string;                         // primary key
    uid: string | null;                    // linked Firebase UID (null if pre-signup)
    source: CaptureSource;
    tags: string[];                        // ["cert:cissp", "lead_magnet:study_plan"]
    certInterest: string[];                // ["cissp", "cc"]
    quizScore: number | null;              // 0-100 from readiness quiz
    weakDomains: string[] | null;          // ["d4", "d7"] from quiz
    status: 'active' | 'unsubscribed' | 'bounced' | 'converted';
    convertedAt: Timestamp | null;         // when they signed up
    capturedAt: Timestamp;
    lastEmailedAt: Timestamp | null;
    drip: DripState | null;
}

type CaptureSource =
    | 'landing_hero'
    | 'readiness_quiz'
    | 'study_plan_download'
    | 'exit_intent'
    | 'content_gate'
    | 'post_exam_capture'
    | 'analytics_teaser'
    | 'blog_cta';

interface DripState {
    sequenceId: string;                    // "onboarding_7d", "paywall", etc.
    stepIndex: number;                     // current step in sequence
    startedAt: Timestamp;
    pausedUntil: Timestamp | null;         // for throttling
}
```

### 3.2 Storage Options

| Option | Where | When |
|--------|-------|------|
| Firestore `emailLeads/{email}` | If using Resend/Postmark (custom engine) | Phase 1 |
| ConvertKit/Beehiiv subscriber | If using marketing tool | Phase 1 alt |
| Both (sync'd) | If leads live in marketing tool but drip triggers need product data | Phase 2 |

---

## 4. Consent & Compliance

### 4.1 GDPR / CAN-SPAM Requirements

| Requirement | Implementation |
|-------------|----------------|
| Explicit opt-in | Checkbox: "I agree to receive study tips and product updates" (pre-checked = NO) |
| Unsubscribe link | Every email includes one-click unsubscribe |
| Sender identity | "ExamFlow <hello@examflow.pro>" — real company name |
| Physical address | Required by CAN-SPAM — include in email footer |
| Data deletion | Honor unsubscribe within 48h; delete lead record on request |
| No purchased lists | Only capture emails from direct user action — never buy lists |
| Double opt-in (EU) | Send confirmation email first; only add to drip after click |

### 4.2 Privacy-Friendly Default

```
┌────────────────────────────────────────┐
│  ┌────────────────────┐ [Get Plan →]   │
│  │ your@email.com     │                │
│  └────────────────────┘                │
│                                        │
│  □ Send me weekly CISSP study tips     │
│    and product updates. Unsubscribe    │
│    anytime.                            │
│                                        │
│  We respect your privacy. See our      │
│  [Privacy Policy].                     │
└────────────────────────────────────────┘
```

Checkbox is **unchecked** by default (GDPR-safe). If user doesn't check it, they only get the lead magnet — no drip sequence.

---

## 5. Capture Point Priority

Ship in this order:

| Priority | Capture Point | Effort | Expected Impact |
|----------|--------------|--------|-----------------|
| 1 | CP1 — Hero email gate | 0.5 day | Highest volume (all visitors see it) |
| 2 | CP2 — Readiness quiz | 2-3 days | Highest quality leads (quiz data) |
| 3 | CP3 — Study plan download | 0.5 day | Easy — just PDF + email gate |
| 4 | CP6 — Bottom-of-post CTA | 0.5 day | Depends on SEO traffic existing |
| 5 | CP4 — Exit intent popup | 1 day | Catches abandoners |
| 6 | CP5 — Inline content gate | 0.5 day | Needs content pages to exist |
| 7 | CP7 — Post-exam capture | 0.5 day | In-app; only if guest mode exists |
| 8 | CP8 — Analytics teaser | 1 day | In-app; paywall adjacent |

**Phase 1 (launch):** CP1 + CP2 + CP3 = ~3-4 days
**Phase 2 (with SEO content):** CP4 + CP5 + CP6 = ~2 days
**Phase 3 (in-app):** CP7 + CP8 = ~1.5 days

---

## 6. Success Metrics

| Metric | Target (90d) | Measurement |
|--------|-------------|-------------|
| Emails captured / month | 100+ | Count new `emailLeads` docs |
| Capture rate (visitors → email) | 8-15% | Emails / unique visitors |
| Lead → signup conversion | 20-35% | Leads with `convertedAt != null` |
| Lead → paid conversion (Pro) | 3-8% | Leads with paid plan |
| Unsubscribe rate per email | < 2% | Unsubscribes / emails sent |
| Bounce rate | < 3% | Hard bounces / emails sent |
| Readiness quiz completion rate | > 60% | Quizzes completed / started |

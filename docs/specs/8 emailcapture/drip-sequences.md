# Drip Sequences — Email Automation Playbook

> Status: DRAFT
> Date: 2026-02-12
> Role: Lifecycle Marketing + Growth Engineer
> Dependency: `email-capture.md`, `segmentation-triggers.md`, `money/pricing-tiers.md`

---

## 1. Sequence Map

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  LEAD (no account)                                           │
│  ────────────────                                            │
│  ┌──────────────────────┐                                    │
│  │  S1: Lead Nurture    │─── signup ──→ S2                   │
│  │  (7 emails / 14d)    │                                    │
│  └──────────────────────┘                                    │
│                                                              │
│  FREE USER (account, no payment)                             │
│  ──────────────────────────────                              │
│  ┌──────────────────────┐                                    │
│  │  S2: Onboarding      │─── 7d done ──→ S3                 │
│  │  (7 emails / 7d)     │                                    │
│  └──────────────────────┘                                    │
│            │                                                 │
│            │ no conversion after 14d                         │
│            ▼                                                 │
│  ┌──────────────────────┐                                    │
│  │  S3: Paywall Conv.   │─── upgrade ──→ STOP (success)     │
│  │  (5 emails / 14d)    │                                    │
│  └──────────────────────┘                                    │
│            │                                                 │
│            │ still free after 28d                             │
│            ▼                                                 │
│  ┌──────────────────────┐                                    │
│  │  S4: Reactivation    │─── reactivate ──→ S3              │
│  │  (3 emails / 21d)    │─── no response ──→ DORMANT        │
│  └──────────────────────┘                                    │
│                                                              │
│  PRO USER (paying)                                           │
│  ────────────────                                            │
│  ┌──────────────────────┐                                    │
│  │  S5: Churn Prevent.  │─── re-engaged ──→ STOP            │
│  │  (4 emails / 14d)    │─── canceled ──→ S6                │
│  └──────────────────────┘                                    │
│            │                                                 │
│            ▼                                                 │
│  ┌──────────────────────┐                                    │
│  │  S6: Win-Back        │─── re-subscribe ──→ STOP          │
│  │  (3 emails / 30d)    │─── no response ──→ DORMANT        │
│  └──────────────────────┘                                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 1.1 Mutual Exclusion Rules

- A user is in **at most one sequence** at a time
- Upgrading to Pro immediately cancels any active S1/S2/S3/S4 sequence
- Signing up cancels S1 and starts S2
- Sequences do not overlap — each has a clear entry and exit trigger

---

## 2. S1 — Lead Nurture (Pre-Signup)

**Entry:** Email captured via any capture point (no account yet)
**Exit:** User signs up → move to S2 | User unsubscribes → STOP
**Goal:** Build trust, demonstrate value, drive signup
**Duration:** 14 days, 7 emails

| Day | Subject Line | Content | CTA |
|-----|-------------|---------|-----|
| 0 | Your CISSP study plan is ready | Deliver lead magnet (study plan or quiz report). Brief intro to ExamFlow. | [Download Study Plan] |
| 1 | The #1 mistake CISSP candidates make | Short insight: studying all domains equally wastes time. Weak-domain targeting works better. | [See how it works →] |
| 3 | Which CISSP domains are your weakest? | If they took the quiz: reference their results. If not: invite them to take it. | [Take Readiness Quiz →] |
| 5 | "I scored 85% after 3 weeks" | Social proof — beta user testimonial (real). Short story format. | [Start practicing free →] |
| 7 | Quick question: when's your exam? | Simple reply-requested email. Builds engagement. Replies help deliverability. | [Reply with your date] |
| 10 | CISSP Domain {weakest}: cheat sheet | Domain-specific value email based on their quiz weakness (or most common weak domain if no quiz). | [Practice Domain {X} →] |
| 14 | Last one — here's 20% off Pro | Final push. Don't over-stay. Offer a small discount. Clear "this is the last email in this series." | [Claim 20% Off →] |

### 2.1 Personalization Variables

| Variable | Source | Fallback |
|----------|--------|----------|
| `{first_name}` | Lead record | "there" (as in "Hey there") |
| `{cert}` | Lead tags / quiz | "CISSP" |
| `{weak_domain}` | Quiz results | "Domain 1: Security & Risk Management" |
| `{quiz_score}` | Quiz results | Omit sentence |
| `{exam_date}` | Reply or form | Omit sentence |

### 2.2 Exit Conditions

| Condition | Action |
|-----------|--------|
| User signs up for ExamFlow | Cancel S1, trigger S2 |
| User unsubscribes | Cancel S1, mark `status: 'unsubscribed'` |
| Email bounces (hard) | Cancel S1, mark `status: 'bounced'` |
| All 7 emails sent, no signup | Mark as `dormant_lead`, no further emails for 90 days |

---

## 3. S2 — Onboarding (New Free User)

**Entry:** User creates account (Google sign-in)
**Exit:** 7 days elapsed | User upgrades to Pro → STOP (success)
**Goal:** Activate key behaviors — first exam, explore modes, see analytics preview
**Duration:** 7 days, 7 emails

| Day | Subject Line | Content | CTA | Behavioral Gate |
|-----|-------------|---------|-----|-----------------|
| 0 | Welcome to ExamFlow — start here | Quick-start: create first study, take first exam. 3 steps, screenshots. | [Take Your First Exam →] | — |
| 1 | Your first exam score: here's what it means | Explain scoring. "72% is a solid start. Here's how to improve." | [Try Domain Focus mode →] | Skip if no exam taken (send nudge instead) |
| 2 | The study mode most people miss | Introduce weak-domains mode. Explain why it's the fastest path. | [Start Weak Domains Exam →] | — |
| 3 | Your analytics at a glance | Preview of what Pro analytics shows. Blurred screenshot + "here's your Domain 1 score." | [See Your Analytics →] | — |
| 4 | 3 tips from users who passed CISSP | Curated tips (real beta user advice if available). | [Practice Now →] | — |
| 5 | You've been studying for 5 days 🔥 | Celebrate streak. Show their stats (exams taken, questions answered). | [Keep Your Streak →] | Only if actually active |
| 6 | What's next: Pro features unlocked free for 7 days | Trial offer — 7-day free Pro trial. Show what they're missing (analytics, all modes, unlimited exams). | [Start Free Trial →] | — |

### 3.1 Behavior-Conditional Logic

| Condition | Modification |
|-----------|-------------|
| Day 1 but no exam taken yet | Replace Day 1 email with nudge: "You haven't taken your first exam yet — here's the fastest way to start" |
| User took ≥ 5 exams by Day 3 | Skip Day 2 and 3 — they're activated. Send Day 4 early. |
| User already on Pro trial | Skip Day 6 trial offer |
| User scores < 60% on first exam | Day 1 email adds: "Don't worry — that's exactly where most people start. Domain focus mode exists for this." |

### 3.2 Activation Milestones Tracked

| Milestone | Target by Day | % Achieving (Goal) |
|-----------|--------------|-------------------|
| First exam completed | Day 1 | > 70% |
| 3 exams completed | Day 3 | > 50% |
| Tried ≥ 2 exam modes | Day 5 | > 40% |
| Viewed analytics (or attempted) | Day 4 | > 30% |
| 7-day streak | Day 7 | > 25% |

---

## 4. S3 — Paywall Conversion (Free → Pro)

**Entry:** S2 completed + user is still on Free plan + active in last 7 days
**Exit:** User upgrades → STOP | 14 days elapsed → S4 (if inactive) or DORMANT
**Goal:** Convert demonstrated value into a payment
**Duration:** 14 days, 5 emails

| Day | Subject Line | Content | CTA |
|-----|-------------|---------|-----|
| 0 | You've outgrown the free plan | Show their stats: "You've taken X exams, answered Y questions." Show what they're missing (analytics, advanced modes, unlimited). | [Upgrade to Pro — $29/mo →] |
| 3 | "I wish I'd upgraded sooner" | Testimonial from a real user who converted and found analytics helpful. | [Start 7-Day Free Trial →] |
| 7 | Your {cert} exam is in {X} weeks — here's what you need | If exam date known: urgency-based. If not: "Most CISSP candidates study for 3-6 months." | [Unlock All Exam Modes →] |
| 10 | Quick math: ExamFlow Pro vs. retaking CISSP | Cost comparison: $29/mo for 3 months = $87. CISSP retake = $749. ROI framing. | [Invest in Passing →] |
| 14 | Last chance: 20% off Pro (annual) | Final offer. Clear end-of-sequence signal. No guilt. | [Get 20% Off →] |

### 4.1 Offer Escalation

| Email | Offer | Discount |
|-------|-------|----------|
| Day 0 | No discount — full price | $29/mo |
| Day 3 | Free trial push (7 days) | $0 for 7 days |
| Day 7 | No discount — urgency framing | $29/mo |
| Day 10 | No discount — ROI framing | $29/mo |
| Day 14 | 20% off annual only | $159/yr (was $199) |

**Important:** Don't lead with discounts. Most conversions happen on value, not price. Reserve discounts for final-touch.

---

## 5. S4 — Reactivation (Dormant Free Users)

**Entry:** Free user inactive ≥ 14 days (no login, no exam)
**Exit:** User logs in → pause sequence | User upgrades → STOP
**Goal:** Re-engage lapsed free users before they forget ExamFlow exists
**Duration:** 21 days, 3 emails (light touch — they've already heard from us)

| Day | Subject Line | Content | CTA |
|-----|-------------|---------|-----|
| 0 | Your {cert} progress is waiting | "You left off at exam #{X} with a {score}% average. Pick up where you stopped." | [Resume Studying →] |
| 7 | New: {feature/content} just launched | Product update — new exam mode, new cert, new questions. Give them a reason to come back. | [Try It Free →] |
| 21 | Still studying for {cert}? | Low-pressure check-in. "If you've moved on, no worries. Click here to unsubscribe." Respectful exit. | [Jump Back In →] or [Unsubscribe] |

### 5.1 Rules

- Never send more than 3 reactivation emails per 90-day period
- If user doesn't respond to all 3: mark as DORMANT, no emails for 6 months
- If user reactivates (logs in): immediately cancel reactivation, resume normal communication

---

## 6. S5 — Churn Prevention (Pro Users at Risk)

**Entry:** Pro user shows churn signals (see `segmentation-triggers.md`)
**Exit:** User re-engages (≥ 2 exams in 7 days) → STOP | User cancels → S6
**Goal:** Save the subscription before they cancel
**Duration:** 14 days, 4 emails

### 6.1 Churn Signals

| Signal | Weight | Detection |
|--------|--------|-----------|
| No login for 7+ days | High | `lastActiveAt` check |
| No exams for 10+ days | High | Exam count plateau |
| Visited billing/cancel page | Critical | Page view event |
| Exam scores declining | Medium | Score trend negative over 3+ exams |
| Stripe subscription past_due | Critical | Webhook event |

| Day | Subject Line | Content | CTA |
|-----|-------------|---------|-----|
| 0 | We noticed you haven't practiced this week | Gentle nudge. Show their streak (broken). Remind them of their goal. | [Continue Practicing →] |
| 3 | Your Domain {weakest} needs attention | Personalized: "Your Domain 4 score dropped to 58%. Here are 3 things to focus on." | [Practice Domain {X} →] |
| 7 | You're closer than you think | Motivational. Show progress stats. "You've answered X questions and improved Y% overall." | [See Your Progress →] |
| 14 | Is Pro right for you? | Direct: "If Pro isn't a fit right now, no hard feelings. Here's what you'll keep on Free and what you'll lose." Transparent. | [Keep Pro →] or [Downgrade to Free] |

### 6.2 Important: No Guilt, No Dark Patterns

- Never hide the cancel button
- Never say "You'll lose everything" (they keep their data on Free)
- Be honest about what Free includes
- If they cancel, thank them and move to S6

---

## 7. S6 — Win-Back (Canceled Pro Users)

**Entry:** Pro user cancels subscription (Stripe webhook: `customer.subscription.deleted`)
**Exit:** User re-subscribes → STOP | 30 days → DORMANT
**Goal:** Win back churned users with targeted offers
**Duration:** 30 days, 3 emails

| Day | Subject Line | Content | CTA |
|-----|-------------|---------|-----|
| 1 | We're sorry to see you go | Confirmation of downgrade. Remind what they keep (Free). Ask: "Was there something we could've done better?" (reply-to = founder). | [Tell Us Why →] |
| 14 | We shipped {improvement} since you left | Product update email. Show specific changes. "We heard your feedback." | [Come Back to Pro — 30% Off →] |
| 30 | One more thing | Final reach-out. "If you still need ExamFlow later, this 30% off code is good for 30 more days: COMEBACK30." | [Reactivate Pro →] |

### 7.1 Win-Back Offers

| Timing | Offer |
|--------|-------|
| Day 1 | No offer — listen first |
| Day 14 | 30% off first month back |
| Day 30 | 30% off code valid for 30 more days |

After Day 30: no more emails. Mark as DORMANT. They know ExamFlow exists — they'll come back if they need it.

---

## 8. Global Email Rules

### 8.1 Frequency Caps

| Rule | Limit |
|------|-------|
| Max emails per user per week | 3 |
| Max emails per user per day | 1 |
| Min gap between emails | 24 hours |
| Max sequences simultaneously | 1 |
| Transactional emails (receipt, password reset) | Exempt from caps |

### 8.2 Sending Best Practices

| Practice | Guideline |
|----------|-----------|
| Send time | 8-10 AM in user's timezone (or UTC-5 default) |
| From address | `hello@examflow.pro` (S1-S4), `[founder]@examflow.pro` (S5-S6) |
| From name | "ExamFlow" (S1-S4), "[Founder Name] from ExamFlow" (S5-S6) |
| Reply-to | Always a real, monitored inbox |
| Unsubscribe | One-click link in every email + list-unsubscribe header |
| Preview text | Always set — don't leave it to email client to pick |

### 8.3 Email Design

- **Plain text or minimal HTML** — looks personal, delivers better
- No heavy images, no flashy templates
- Mobile-first (>60% of opens are mobile)
- Short: aim for 100-200 words per email
- One CTA per email (maximum two)
- P.S. line for secondary CTA or human touch

### 8.4 A/B Testing (Phase 2)

Once volume ≥ 100 emails/week per sequence:

| Test | What to Vary |
|------|-------------|
| Subject line | Question vs. statement, personalized vs. generic |
| Send time | 8 AM vs. 10 AM vs. 6 PM |
| CTA text | "Start practicing" vs. "Take a free exam" |
| Offer timing | Discount on Day 7 vs. Day 14 |

---

## 9. Metrics to Track

| Metric | Target | Red Flag |
|--------|--------|----------|
| Open rate | > 40% (S2 onboarding), > 25% (S3 paywall) | < 15% (deliverability issue) |
| Click rate | > 8% (S2), > 5% (S3) | < 2% (content issue) |
| Unsubscribe rate | < 1% per email | > 3% (too aggressive) |
| S1 → signup conversion | > 20% | < 10% |
| S2 → Pro trial start | > 15% | < 5% |
| S3 → Pro conversion | > 5% | < 2% |
| S5 → churn saved (re-engaged) | > 20% | < 10% |
| S6 → win-back | > 5% | < 2% |
| Bounce rate | < 3% | > 5% (list hygiene issue) |
| Spam complaints | < 0.1% | > 0.3% (stop sending) |

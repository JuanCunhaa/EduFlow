# Segmentation & Triggers — Rules Engine

> Status: DRAFT
> Date: 2026-02-12
> Role: Lifecycle Marketing + Growth Engineer
> Dependency: `email-capture.md`, `drip-sequences.md`

---

## 1. Why Segmentation Matters

A CISSP candidate who scored 45% on their readiness quiz and a CC candidate who scored 90% should never get the same email. Segmentation turns a generic drip into a personalized conversation.

### 1.1 Segmentation Axes

```
┌─────────────────────────────────────────────────────────┐
│  EVERY USER EXISTS AT AN INTERSECTION OF:               │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Certification │  │   Lifecycle  │  │   Activity   │  │
│  │  CISSP        │  │  Lead        │  │  Active      │  │
│  │  CC           │  │  Free user   │  │  Engaged     │  │
│  │  SSCP         │  │  Trial       │  │  At-risk     │  │
│  │  CCSP         │  │  Pro         │  │  Dormant     │  │
│  │  CGRC         │  │  Churned     │  │  Churned     │  │
│  │  Sec+         │  │              │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐                     │
│  │   Weakness   │  │   Urgency    │                     │
│  │  Domain 1-8  │  │  Exam < 30d  │                     │
│  │  (per cert)  │  │  Exam 1-3mo  │                     │
│  │              │  │  No date set │                     │
│  │              │  │  Already     │                     │
│  │              │  │  passed      │                     │
│  └──────────────┘  └──────────────┘                     │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Segment Definitions

### 2.1 By Certification Interest

| Segment | Tag | How Detected | Population (Est.) |
|---------|-----|-------------|-------------------|
| CISSP candidates | `cert:cissp` | Quiz cert selection, study created, form selection | 60% of users |
| CC candidates | `cert:cc` | Same | 15% |
| Security+ | `cert:sec_plus` | Same | 10% |
| SSCP | `cert:sscp` | Same | 5% |
| CCSP | `cert:ccsp` | Same | 5% |
| CGRC | `cert:cgrc` | Same | 3% |
| Multi-cert | `cert:multi` | >1 study active | 2% |

**Usage:** Cert-specific email content (domain names, resource links, exam tips). A CISSP candidate gets "CISSP Domain 4" references; a CC candidate gets "CC Domain 3" references.

### 2.2 By Lifecycle Stage

| Segment | Criteria | Tag |
|---------|----------|-----|
| **Lead** | Email captured, no account | `stage:lead` |
| **New user** | Account created ≤ 7 days ago, Free plan | `stage:new_free` |
| **Active free** | Account > 7 days, Free plan, active in last 7 days | `stage:active_free` |
| **Engaged free** | Free plan, ≥ 10 exams total, active in last 7 days | `stage:engaged_free` |
| **Trial** | Pro trial active (7-day free trial) | `stage:trial` |
| **Pro monthly** | Active Pro sub, monthly billing | `stage:pro_monthly` |
| **Pro annual** | Active Pro sub, annual billing | `stage:pro_annual` |
| **Past due** | Stripe status = `past_due` | `stage:past_due` |
| **Canceled** | Was Pro, now Free (canceled) | `stage:canceled` |
| **Dormant** | No login for 30+ days, any plan | `stage:dormant` |

### 2.3 By Activity Level

| Segment | Criteria | Detection |
|---------|----------|-----------|
| **Power user** | ≥ 5 exams/week, ≥ 3 modes used | Exam count + mode diversity |
| **Steady** | 2-4 exams/week | Exam count |
| **Light** | 1 exam/week | Exam count |
| **Slipping** | Was Steady/Power, now < 1 exam/week | Activity delta detection |
| **Ghost** | No exam in 14+ days | `lastExamAt` check |

### 2.4 By Domain Weakness

| Segment | Criteria | Source |
|---------|----------|--------|
| `weak:d1` through `weak:d8` (CISSP) | Domain score < 60% on last 3 exams | PerformanceSummary data |
| `strong:d1` through `strong:d8` | Domain score ≥ 80% on last 3 exams | PerformanceSummary data |
| `improving:{domain}` | Score trend positive (last 5 exams) | Score delta calculation |
| `declining:{domain}` | Score trend negative (last 5 exams) | Score delta calculation |

**Usage:** Domain-specific study tips, targeted practice recommendations.

### 2.5 By Exam Urgency

| Segment | Criteria | Source |
|---------|----------|--------|
| **Exam imminent** | Exam date < 30 days away | Self-reported or form response |
| **Exam soon** | Exam date 30-90 days away | Self-reported |
| **Exam planned** | Exam date > 90 days away | Self-reported |
| **No date set** | No exam date on file | Default |
| **Already passed** | Self-reported pass | CertExamOutcome record |

**Usage:** Urgency in messaging. Imminent users get time-pressure framing; no-date users get longer nurture.

### 2.6 By Source / Channel

| Segment | Tag | Usage |
|---------|-----|-------|
| Reddit organic | `source:reddit` | Community-style messaging |
| LinkedIn | `source:linkedin` | Professional tone |
| SEO / Google | `source:seo` | Keyword-aligned content |
| Readiness quiz | `source:quiz` | Reference quiz results |
| Study plan download | `source:study_plan` | Reference the plan |
| Beta alumni | `source:beta` | Insider messaging, loyalty offers |
| Bootcamp referral | `source:bootcamp` | Mention their program |

---

## 3. Trigger Rules

### 3.1 Sequence Triggers

| Trigger Event | Condition | Action |
|---------------|-----------|--------|
| Email captured (no account) | New lead record created | Start S1 (Lead Nurture) |
| Account created | `UserProfile` created | Cancel S1 → Start S2 (Onboarding) |
| Onboarding complete (Day 7) | S2 all emails sent, still Free | Start S3 (Paywall Conversion) |
| Inactive free user | No login for 14+ days, Free plan | Start S4 (Reactivation) |
| Pro churn signal | Pro user matches ≥ 2 churn signals (§3.3) | Start S5 (Churn Prevention) |
| Pro canceled | Stripe event: subscription canceled | Start S6 (Win-Back) |
| User upgrades to Pro | Plan changes from Free to Pro | Cancel any active S1/S2/S3/S4 |
| User unsubscribes | Unsubscribe link clicked | Cancel all sequences, mark unsubscribed |

### 3.2 Behavioral Triggers (Within Sequences)

| Trigger | When | Effect |
|---------|------|--------|
| User completes first exam | During S2 | Skip Day 1 nudge email, send Day 1 score interpretation instead |
| User hits daily exam limit (3) | During S2 or S3 | Send upgrade prompt within 24h: "You've hit today's limit. Pro = unlimited." |
| User views pricing page | Any time | Tag `intent:pricing_viewed`; advance paywall sequence |
| User starts and abandons checkout | Any time | Send "Forgot something?" email within 4 hours |
| User's practice score crosses 70% | During any sequence | Send "You're reaching pass territory" encouragement |
| User's practice score drops below 60% | During any sequence | Send domain-specific study tip |
| User achieves 7-day streak | During S2 | Send celebration + analytics teaser |

### 3.3 Churn Signal Detection Rules

A Pro user enters S5 (Churn Prevention) when **≥ 2 of these are true:**

| Signal | Weight | Detection Method |
|--------|--------|-----------------|
| No login for 7+ days | 3 | `lastActiveAt` < now - 7d |
| No exams for 10+ days | 3 | Last exam `createdAt` check |
| Visited `/dashboard/billing` or `/dashboard/settings` | 2 | Client-side event or page view log |
| Exam scores declining (last 3 scores trending down) | 1 | Score comparison |
| Stripe payment failed (`invoice.payment_failed`) | 4 | Webhook event |
| Subscription set to `cancel_at_period_end` | 5 | Stripe subscription field |

**Scoring:** Sum weights. If total ≥ 4: trigger S5.

### 3.4 Transactional Triggers (Always Send, Not Drip)

| Event | Email | Timing |
|-------|-------|--------|
| Account created | Welcome confirmation | Immediate |
| Pro trial started | Trial started confirmation (trial end date) | Immediate |
| Trial ending in 2 days | "Your trial ends in 2 days" | 2 days before trial end |
| Trial ended, no conversion | "Your trial has ended — here's what changed" | Day of trial end |
| Payment successful | Receipt (Stripe-generated or custom) | Immediate |
| Payment failed | "Payment failed — update method" | Immediate + retry at 3d, 7d |
| Password/auth change | Security confirmation | Immediate |
| Cert exam passed (self-reported) | Congratulations + testimonial ask | Immediate |

---

## 4. Segment-Conditional Content Blocks

### 4.1 Dynamic Blocks Within Emails

Instead of separate emails per segment, use **conditional blocks** within shared emails:

```
Subject: Your CISSP study update

Hi {first_name},

{IF cert == "cissp"}
  You've completed {exams_taken} CISSP practice exams and your 
  current average is {avg_score}%.
{ELSIF cert == "cc"}
  You've completed {exams_taken} CC practice exams and your 
  current average is {avg_score}%.
{ELSE}
  You've completed {exams_taken} practice exams and your 
  current average is {avg_score}%.
{END}

{IF weak_domain}
  Your weakest area is {weak_domain_name} at {weak_domain_score}%.
  Here are 3 tips for improving:
  ...
{END}

{IF exam_date AND exam_date < now + 30d}
  Your exam is coming up in {days_to_exam} days. Time to 
  increase your practice frequency.
{END}

{IF plan == "free" AND exams_taken >= 10}
  You've gotten a lot out of the free plan. Ready for 
  unlimited practice and analytics?
  [Upgrade to Pro →]
{END}
```

### 4.2 Implementation Approach

| Tool | Dynamic Content Support |
|------|----------------------|
| **Resend + custom** | Build conditionals in the template render function (TypeScript) |
| **ConvertKit** | Liquid templating: `{% if subscriber.cert == "cissp" %}` |
| **Beehiiv** | Limited — merge tags only, no conditionals |
| **Customer.io** | Full Liquid + attribute-based branching |

---

## 5. Tool Options — Tradeoffs

### 5.1 Option A: Minimal Stack (Resend/Postmark + Custom Logic)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Firestore   │────→│  Vercel Cron │────→│  Resend API  │
│  (lead data, │     │  (sequence   │     │  (sends      │
│   segments)  │     │   engine)    │     │   emails)    │
└──────────────┘     └──────────────┘     └──────────────┘
```

| Pros | Cons |
|------|------|
| Full control over logic | You build and maintain the sequence engine |
| No monthly SaaS cost (Resend = $0 up to 100 emails/day, $20/mo for 50K) | No visual email builder |
| Product data is already in Firestore — no sync needed | No built-in analytics (build your own open/click tracking) |
| Can do complex behavioral triggers (exam scores, domain weakness) | More engineering time upfront (3-5 days for engine) |
| No vendor lock-in | Deliverability management is your responsibility |

**Best for:** Solo founder who wants full control and has <1,000 contacts.

**Resend pricing:** Free tier = 100 emails/day, 1 domain. Paid = $20/mo for 50K emails.
**Postmark pricing:** $15/mo for 10K emails. Superior deliverability out of the box.

### 5.2 Option B: Marketing Automation (ConvertKit)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Firestore   │────→│  Webhook /   │────→│  ConvertKit  │
│  (product    │     │  API sync    │     │  (sequences, │
│   data)      │     │              │     │   segments,  │
│              │     │              │     │   sends)     │
└──────────────┘     └──────────────┘     └──────────────┘
```

| Pros | Cons |
|------|------|
| Visual sequence builder — faster iteration | $29/mo for 1K subs, $49/mo for 3K subs |
| Built-in analytics (open rate, click rate, revenue) | Product data must be synced via API/webhooks |
| Landing page / form builder included | Complex behavioral triggers (exam scores) require custom integration |
| Deliverability managed by ConvertKit | Liquid templating has limits vs. custom code |
| Subscriber management, tagging, automations out of the box | Another vendor dependency |

**Best for:** Founder who wants to move fast on email without building an engine.

**ConvertKit pricing:** Free for 1K subs (no automations). $29/mo for automations + 1K subs.

### 5.3 Option C: Creator Platform (Beehiiv)

| Pros | Cons |
|------|------|
| Newsletter + drip in one tool | Weak automation — designed for newsletters, not drips |
| Free tier up to 2,500 subs | No conditional content blocks |
| Referral program built-in | No API for behavioral triggers |
| Good for blog-style content to subscribers | Poor fit for lifecycle sequences |

**Best for:** Content-heavy marketing. **Not recommended** for ExamFlow's lifecycle use case.

### 5.4 Option D: Full Lifecycle Platform (Customer.io)

| Pros | Cons |
|------|------|
| Best-in-class behavioral triggers | $100/mo starting price |
| Event-driven architecture (perfect for product-triggered emails) | Overkill for <1K users |
| Full Liquid templating + A/B testing | Steep learning curve |
| Built for SaaS lifecycle | Expensive for a pre-revenue product |

**Best for:** Post-PMF with 5K+ users and revenue to justify the cost.

### 5.5 Recommendation

| Stage | Recommended Tool | Why |
|-------|-----------------|-----|
| **Now (0-500 contacts)** | **Resend + custom engine** | Free, full control, no sync complexity |
| **500-3K contacts** | **ConvertKit** | Visual builder, automations, manageable cost ($29-49/mo) |
| **3K+ contacts + revenue** | **Customer.io** | Behavioral triggers at scale, event-driven |

**Phase 1 (launch):** Start with Resend. Build a minimal sequence runner as a Vercel Cron job. When email becomes a meaningful growth channel, migrate to ConvertKit.

---

## 6. Data Sync Architecture (If Using External Marketing Tool)

### 6.1 What to Sync

| Data Point | Direction | Frequency |
|-----------|-----------|-----------|
| Email + name + cert | ExamFlow → Marketing tool | On capture / signup |
| Plan (free/pro/team) | ExamFlow → Marketing tool | On plan change |
| Exams taken (count) | ExamFlow → Marketing tool | Daily batch |
| Avg score | ExamFlow → Marketing tool | Daily batch |
| Weak domains | ExamFlow → Marketing tool | Weekly batch |
| Last active date | ExamFlow → Marketing tool | Daily batch |
| Exam date (if known) | ExamFlow → Marketing tool | On update |
| Unsubscribe | Marketing tool → ExamFlow | Webhook (immediate) |

### 6.2 Sync Implementation

```typescript
// Daily cron job: sync user attributes to marketing tool
// Schedule: 03:00 UTC daily via Vercel Cron

async function syncMarketingAttributes(): Promise<void> {
    const users = await getActiveUsersLast30d();

    for (const user of users) {
        const stats = await getUserStats(user.uid);
        const weakDomains = await getWeakDomains(user.uid);

        await marketingTool.updateSubscriber(user.email, {
            plan: user.plan,
            cert: user.activeStudy?.abbreviation,
            exams_taken: stats.examCount,
            avg_score: stats.avgScore,
            weak_domains: weakDomains.join(','),
            last_active: user.lastActiveAt,
        });
    }
}
```

---

## 7. Priority Implementation Order

| Step | What | Tool | Effort |
|------|------|------|--------|
| 1 | Set up Resend account + verify domain | Resend | 1 hour |
| 2 | Build email template renderer (plain text + minimal HTML) | Custom | 0.5 day |
| 3 | Build S1 lead nurture (7 emails, static) | Resend API | 1 day |
| 4 | Build S2 onboarding (7 emails, behavioral gates) | Resend API + Cron | 1.5 days |
| 5 | Build trigger engine (Vercel Cron, checks state, sends next email) | Custom | 1 day |
| 6 | Build S3 paywall conversion | Resend API | 0.5 day |
| 7 | Build S4 reactivation | Resend API | 0.5 day |
| 8 | Build S5 churn prevention + S6 win-back | Resend API | 1 day |
| **Total** | | | **~6 days** |

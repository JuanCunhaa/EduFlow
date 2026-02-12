# 08 — Email Capture & Drip Campaigns

---

## Problem Statement

ExamFlow requires Google sign-in as the first interaction. No email capture exists before authentication. There's no nurturing pipeline — visitors either sign up immediately or are lost forever. No re-engagement mechanism for inactive users.

In B2C SaaS, email is the highest-ROI acquisition channel. A visitor who gives their email is 10x more likely to convert than one who bounces. A user who receives a well-timed drip campaign is 3x more likely to activate.

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Email capture rate (visitor→email) | 5%+ of landing page visitors |
| Email→signup conversion | 25%+ within 14 days |
| Signup→paid conversion (email-nurtured) | 15%+ |
| Drip campaign open rate | 35%+ |
| Drip campaign click rate | 8%+ |
| Unsubscribe rate | < 2% per email |

---

## MVP Scope (2 weeks)

### 1. Email Capture Points

**a) Free Readiness Quiz (no signup required)**
- `/quiz/cissp-readiness` — 10-question mini quiz
- No auth needed — works for anonymous visitors
- After submission: "Your readiness score: 62%. Want detailed domain analysis? Enter your email."
- Captures: email, cert studying for, readiness score
- Store in `leads/{leadId}` Firestore collection

**b) Landing page email capture**
- Below hero section: "Get a free CISSP study plan → Enter your email"
- Lightweight — no quiz, just email + cert
- Optional: replace one of the landing page sections

**c) SEO page email capture**
- Bottom of every `/resources/*` page: "Get 5 free practice questions → Enter your email"
- Contextual to the page topic

### 2. Email Service Integration

- Use **Resend** (simple API, generous free tier, developer-friendly) or **SendGrid**
- API route: `POST /api/email/subscribe` — validates email, stores lead, triggers welcome sequence
- Unsubscribe: `GET /api/email/unsubscribe?token=` — one-click unsubscribe with signed token

### 3. Welcome Drip Sequence (7 emails over 14 days)

| Day | Subject | Content | CTA |
|-----|---------|---------|-----|
| 0 | "Your CISSP study plan is ready" | Personalized study plan based on readiness quiz score | "Start studying →" (signup) |
| 2 | "The #1 mistake CISSP candidates make" | Educational: studying without tracking weak areas | "See how ExamFlow tracks your progress →" |
| 4 | "Domain 1 breakdown: Security & Risk Management" | 3 sample questions with explanations | "Practice more Domain 1 questions →" |
| 7 | "How to know when you're ready for the exam" | Readiness score concept, domain mastery | "Check your readiness score →" |
| 10 | "What ExamFlow users are saying" | Real testimonials (once collected from beta) | "Join them →" |
| 12 | "Your study progress (or lack of it)" | Re-engagement for non-signups | "Don't let another week pass →" |
| 14 | "Last chance: 20% off Pro" | Limited discount for email leads | "Claim your discount →" |

### 4. Transactional Emails (for registered users)

| Trigger | Email |
|---------|-------|
| Signup | Welcome + onboarding guide |
| First exam completed | "Great start! Here's what to focus on next" |
| 3-day streak | "You're building momentum — keep going" |
| 7-day inactive | "We miss you — your study plan is waiting" |
| 14-day inactive | "Don't lose your progress — quick 5-min session?" |
| 30-day inactive | "Your free trial is ending" (if applicable) |

---

## Phase 2 Scope (6–8 weeks)

1. **Weekly digest** — Every Monday: "Your week in review: X questions answered, Y% accuracy, focus on Domain Z this week." Only for active users. Keeps engagement high.
2. **Exam reminder emails** — If user set an expected exam date: countdown emails at 30, 14, 7, 3, 1 day(s) before exam. "Your CISSP exam is in 7 days. Your readiness: 78%. Focus areas: Domain 3, 5."
3. **Segmented campaigns** — Segment by: cert type, readiness score, activity level, plan type. Send targeted content per segment.
4. **A/B testing** — Subject line testing on drip campaigns. Optimize for open rate → click rate → conversion.
5. **Referral email** — "Give your study buddy 1 month Pro free, get 1 month free when they subscribe." Viral loop via email.
6. **Post-purchase onboarding** — Pro subscribers get separate drip: feature tutorials, advanced mode explanations, analytics walkthrough.

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Emails go to spam | 🟡 Medium | Use verified domain (SPF, DKIM, DMARC). Warm up sending reputation gradually. Start with transactional emails only. |
| GDPR compliance (EU users) | 🔴 High | Double opt-in for EU visitors. Clear consent checkbox. Easy unsubscribe. Privacy policy link on every capture form. |
| CAN-SPAM compliance | 🟡 Medium | Physical address in footer. Unsubscribe link in every email. Honor unsubscribes within 24h. |
| Low open rates | 🟡 Medium | A/B test subject lines. Send at optimal times (Tuesday 10am user timezone). Keep emails short and valuable. |
| Over-emailing causes unsubscribes | 🟡 Medium | Max 2 emails/week for leads, 1/week for active users. Respect email frequency preferences. |
| Engineering time on email system | 🟡 Medium | Use Resend's free tier (100 emails/day). Template emails in simple HTML. No custom email builder needed. |

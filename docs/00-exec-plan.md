# 00 — Execution Plan: 30 / 60 / 90 Days

> Owner: Founder (solo)
> Start: 2026-02-12
> North Star: First paying user within 7 days. 100 paying users within 90 days.

---

## WHAT TO SHIP FIRST (Days 1–7) — Start Charging Money

**Goal: Go from $0 to $1 in revenue.**

| Day | Outcome | Details |
|-----|---------|---------|
| 1–2 | **Stripe integration + pricing page** | Add `stripe` SDK. Create `/api/billing/checkout` and `/api/billing/webhook`. Two tiers: Free (50 questions, practice mode only) and Pro ($29/mo or $199/yr — all modes, all questions, analytics, flashcards). Add `plan` field to `UserProfile` type (`'free' \| 'pro'`). |
| 2–3 | **Paywall middleware** | Create `withPlan('pro')` API middleware. Gate: all exam modes except `practice`, question bank >50, analytics, flashcards, daily challenge. Soft-gate on client: show locked UI with upgrade CTA. |
| 3–4 | **Pricing page + upgrade flow** | `/pricing` page with comparison table. In-app upgrade prompts at gate points. Stripe Checkout redirect. Webhook handles `checkout.session.completed` → update Firestore `plan` field. |
| 5 | **Kill "free" messaging** | Replace all "Start studying for free" → "Start your free trial". Replace "Create your free account" → "Try ExamFlow free for 7 days". Remove "Free" badge from marketplace. |
| 6–7 | **Remove fake testimonials** | Delete the 6 fabricated testimonials. Replace with "Join the beta" CTA or leave section empty. A single fake testimonial caught by r/cissp destroys the product forever. |

**Outcome by Day 7:** Stripe live. Pricing page live. Paywall enforced. First Pro subscriber possible.

---

## 30-DAY PLAN (Weeks 1–4)

### Theme: "Revenue + Real Users"

| # | Outcome | KPI Target | Depends On |
|---|---------|------------|------------|
| 1 | Stripe billing live, two tiers enforced | $1+ revenue | — |
| 2 | Beta launch on r/cissp + r/cybersecurity | 200 signups, 20 paying | Monetization live |
| 3 | Remove Pomodoro, heatmap, accent colors from critical path | 0 eng hours/week on these | — |
| 4 | Email capture on landing page (no-auth quiz) | 500 emails captured | — |
| 5 | Real testimonials from beta users | 3+ real testimonials | Beta launch |
| 6 | Fix landing page: outcome-driven copy, pricing section | Bounce rate <60% | Monetization live |
| 7 | Content: reach 500+ questions per ISC2 study | 2,500 total questions | — |

### Key Results at Day 30:
- **Revenue:** $500+ MRR (17+ Pro subscribers)
- **Users:** 200+ registered, 20+ paying
- **Content:** 2,500+ questions across 5 ISC2 certs
- **Testimonials:** 3+ real, verified

---

## 60-DAY PLAN (Weeks 5–8)

### Theme: "Content Moat + Growth Engine"

| # | Outcome | KPI Target | Depends On |
|---|---------|------------|------------|
| 1 | Cross-user analytics v1 (anonymized) | Data from 200+ users | 200+ active users |
| 2 | SEO content pages: 20 pages targeting "CISSP practice questions Domain X" | 500 organic visits/month | — |
| 3 | Email drip campaign (7-day onboarding + weekly digest) | 25% email→signup conversion | Email capture |
| 4 | CompTIA Security+ study added to marketplace | 1,000+ Security+ questions | Content pipeline |
| 5 | Creator application form (manual onboarding) | 3 external creators onboarded | — |
| 6 | Pass-rate tracking: "Are you ready?" readiness predictor | Readiness score on dashboard | Cross-user analytics |

### Key Results at Day 60:
- **Revenue:** $2,000+ MRR (70+ Pro subscribers)
- **Users:** 800+ registered, 70+ paying
- **Content:** 5,000+ questions (ISC2 + Security+)
- **SEO:** 20 indexed pages, 500+ organic visits/month
- **Data moat:** Cross-user difficulty/prediction data active

---

## 90-DAY PLAN (Weeks 9–12)

### Theme: "Platform + Enterprise Signal"

| # | Outcome | KPI Target | Depends On |
|---|---------|------------|------------|
| 1 | Team/org tier ($49/user/month) with admin dashboard | 1 enterprise pilot signed | Monetization stable |
| 2 | Creator marketplace v1 (external creators publish) | 5 active creators, 2,000+ creator questions | Creator onboarding |
| 3 | SSO (SAML via Firebase) for enterprise pilot | 1 SSO integration live | Enterprise tier |
| 4 | 50 SEO pages + blog | 2,000 organic visits/month | SEO pipeline |
| 5 | Referral program (give 1 month Pro, get 1 month Pro) | 10% of signups from referrals | User base >500 |
| 6 | ISACA CISM study added | 500+ CISM questions | Content pipeline |

### Key Results at Day 90:
- **Revenue:** $5,000+ MRR (150+ Pro subscribers + 1 team account)
- **Users:** 2,000+ registered, 150+ paying
- **Content:** 8,000+ questions across 3 ecosystems (ISC2, CompTIA, ISACA)
- **SEO:** 50 indexed pages, 2,000+ organic visits/month
- **Creators:** 5 external content creators active
- **Enterprise:** 1 pilot running

---

## DEPENDENCY MAP

```
Monetization (Day 1-7)
  ├── Beta Launch (Day 8-14) → Real Testimonials (Day 15-21)
  ├── Pricing Page → Landing Page Rewrite
  ├── Paywall middleware → Feature gating
  └── Revenue signal → Enterprise tier (Day 60+)

Email Capture (Day 14-21)
  └── Email Drip (Day 30-45)
      └── Conversion funnel optimization

Content Pipeline (ongoing)
  ├── ISC2 question volume → Beta quality
  ├── CompTIA Security+ (Day 45-60)
  ├── ISACA CISM (Day 75-90)
  └── Creator Marketplace (Day 60-90)

Cross-User Analytics (Day 30-45)
  └── Readiness Predictor (Day 45-60)
      └── "Am I ready?" → marketing differentiator

SEO (Day 30+)
  └── Organic acquisition → reduces paid CAC
```

---

## STOP DOING LIST

**Stop immediately:**
1. **Do NOT add new exam modes.** 6 is already 5 too many for zero users. Validate which ones people actually use before building more.
2. **Do NOT improve the Pomodoro timer.** It's going to be removed or hidden behind a feature flag.
3. **Do NOT add more badge types.** Gamification without users is decoration.
4. **Do NOT build more accent color / theme customization.** Zero revenue impact.
5. **Do NOT optimize the anti-scraping system.** It's already over-engineered for 0 users.
6. **Do NOT add new admin-only marketplace features.** The bottleneck is not admin tools — it's that there are no other creators.
7. **Do NOT refactor architecture** (no service layer rewrites, no database migration). The architecture is solid. Ship features that make money.
8. **Do NOT build mobile app.** Web-first. Responsive is enough until $50K MRR.
9. **Do NOT add more i18n locales.** English + Portuguese is enough. No Japanese, no German, no French until there's demand signal.
10. **Do NOT build AI question generation** until there's a human review pipeline and paying users who need more content.

---

## KPI DASHBOARD

| Metric | Day 7 | Day 30 | Day 60 | Day 90 |
|--------|-------|--------|--------|--------|
| MRR | $29+ | $500+ | $2,000+ | $5,000+ |
| Registered users | 10+ | 200+ | 800+ | 2,000+ |
| Paying users | 1+ | 20+ | 70+ | 150+ |
| Free→Pro conversion | — | 10%+ | 9%+ | 8%+ |
| Total questions | 1,500 | 2,500 | 5,000 | 8,000 |
| Certification ecosystems | 1 (ISC2) | 1 | 2 | 3 |
| Organic visits/month | 0 | 100 | 500 | 2,000 |
| Email list size | 0 | 500 | 2,000 | 5,000 |
| Real testimonials | 0 | 3 | 10 | 25 |
| NPS (from beta users) | — | 40+ | 50+ | 50+ |

---

## GUIDING PRINCIPLE

> Every engineering hour spent on something that doesn't lead to revenue, content, or distribution is wasted. The exam engine is done. Now build the business.

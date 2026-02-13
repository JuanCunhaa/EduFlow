# Beta Program — Structure & Operations

> Status: DRAFT
> Date: 2026-02-12
> Role: Community Lead + Growth
> Dependency: `money/pricing-tiers.md`, `seo/seo-strategy.md`

---

## 1. Program Goals

| Goal | Metric | Threshold to Proceed |
|------|--------|---------------------|
| Validate product-market fit | Beta NPS ≥ 40 | Kill or pivot if < 20 |
| Collect real testimonials | ≥ 10 usable quotes | Need ≥ 5 to launch marketing |
| Measure study effectiveness | Track score improvement over time | Statistically meaningful N |
| Find and fix UX friction | ≤ 3 critical bugs reported repeatedly | Ship fixes before public launch |
| Build early evangelist base | ≥ 15 users willing to recommend publicly | Seed the word-of-mouth engine |

**Non-goal:** Revenue. Beta is free. The point is learning, not earning.

---

## 2. Cohort Structure

### 2.1 Cohort Parameters

| Parameter | Value | Reasoning |
|-----------|-------|-----------|
| Cohort size | **30 users** | Small enough for personal attention, large enough for signal |
| Duration | **6 weeks** | Matches typical CISSP final-push study period |
| Number of cohorts | 2 sequential (Cohort A, then Cohort B) | Apply Cohort A learnings to Cohort B |
| Cohort A start | Week of launch readiness (target: W+2 from spec approval) |
| Cohort B start | 3 weeks after Cohort A starts (staggered) |
| Total beta users | ~60 across both cohorts |

### 2.2 User Profile Targets

Recruit a mix — not just power users:

| Segment | Count | Why |
|---------|-------|-----|
| CISSP candidates (active study, exam booked) | 12 | Core ICP — highest motivation |
| CC / SSCP candidates (entry-level ISC2) | 6 | Broaden cert coverage feedback |
| Security+ candidates (if content ready) | 4 | Test CompTIA expansion |
| Career changers (new to cybersec) | 4 | Test UX for beginners |
| Experienced pros (cert maintenance/CPE) | 4 | Test advanced use case |

### 2.3 Cohort Timeline (6 Weeks)

```
Week 0: Onboarding (async)
  - Welcome email with quick-start guide
  - 5-minute onboarding survey (background, goals, exam date)
  - Set up account, first study, first exam

Week 1-2: Active Study Phase
  - Use ExamFlow ≥ 3x/week
  - Complete ≥ 5 practice exams
  - Flag bugs/friction in feedback channel

Week 3-4: Deep Practice Phase
  - Try all exam modes (weak domains, recent misses, spaced review)
  - Use analytics to identify weak areas
  - Mid-beta check-in (5-min async survey OR 15-min call)

Week 5: Reflection Phase
  - Complete exit survey
  - Testimonial request (opt-in)
  - NPS survey

Week 6: Wrap-Up
  - Thank-you email with results summary
  - Early-bird Pro discount offer (50% off first 3 months)
  - Ask for public review (Reddit, LinkedIn, G2 — opt-in only)
```

---

## 3. Incentives

### 3.1 What Beta Users Get

| Incentive | Detail |
|-----------|--------|
| **Free Pro access** during beta (6 weeks) | Full feature unlock — no limits |
| **Free Pro for 3 months** post-beta if they complete the program | Reward for engagement, not just signing up |
| **"Founding User" badge** | Visible on their profile; permanent |
| **Early access** to new features | First to try new exam modes, certs |
| **Direct founder access** | Slack/Discord channel with the founder |
| **50% off Pro annual** if they convert within 30 days of beta end | Conversion incentive |

### 3.2 "Completion" Criteria

To earn post-beta Pro access, a user must:

- Complete ≥ 15 practice exams during the beta
- Complete the mid-beta survey
- Complete the exit survey

This filters out signups who never engage.

### 3.3 What Beta Users Don't Get

- No payment required at any point during beta
- No obligation to provide a testimonial
- No obligation to post publicly
- No NDA (product is already public)

---

## 4. Weekly Metrics Dashboard (Internal)

Track every week for each cohort:

| Metric | Source | Target |
|--------|--------|--------|
| **WAU** (weekly active users) | Firebase Auth `lastActiveAt` | ≥ 70% of cohort |
| **Exams per user per week** | `exams` collection count | ≥ 3 |
| **Avg score trend** | `exams` score field | Positive trend W1→W5 |
| **Questions answered** | Sum from exam data | ≥ 50/user/week |
| **Feature usage** | Which exam modes used | All modes tried by ≥ 50% |
| **Bug/friction reports** | Feedback channel | ≤ 5 critical/week |
| **NPS (mid-beta)** | Survey response | ≥ 30 |
| **Drop-off rate** | Users inactive ≥ 7 days | ≤ 20% |

### 4.1 Weekly Review Ritual

Every Monday, the founder reviews:

1. Cohort metrics spreadsheet (15 min)
2. Feedback channel messages from past week (10 min)
3. Reply to every unanswered question (10 min)
4. Ship ≥ 1 fix or improvement based on feedback (ongoing)

Budget: **~1 hour/week** minimum for beta management.

---

## 5. Communication Cadence

| When | What | Channel |
|------|------|---------|
| Day 0 | Welcome email + quick-start guide | Email |
| Day 1 | "First exam completed?" nudge (if not) | Email |
| Day 3 | Tip: "Try domain-focus mode for targeted practice" | Email |
| Week 1 | "How's your first week?" check-in | Slack/Discord |
| Week 2 | Feature highlight: "Have you tried weak-domains mode?" | Email |
| Week 3 | Mid-beta survey (5 min) | Email → Google Form |
| Week 4 | "You're halfway! Here's your progress" | Email (personalized stats) |
| Week 5 | Exit survey + testimonial request | Email → Google Form |
| Week 6 | Thank you + Pro discount offer | Email |

### 5.1 Email Automation

Use a lightweight sequence (Resend, Loops, or manual if <60 users):

- **Trigger-based:** "First exam completed" → skip Day 1 nudge
- **Personalized:** Include their exam count, avg score, streak in Week 4 email
- **Unsubscribe:** Always include opt-out (CAN-SPAM/GDPR)

---

## 6. Beta Channels

### 6.1 Primary: Private Discord Server or Slack Channel

Create a dedicated space (not a public community yet):

```
#general         - Introductions, casual chat
#feedback        - Bug reports, feature requests, friction points
#wins            - "I scored 85% on my practice exam!"
#feature-preview - Founder shares upcoming features for early input
```

**Why private, not public:**

- Easier to manage with 30-60 people
- Creates exclusivity ("founding member" feeling)
- Candid feedback — people are more honest in smaller groups
- Prevents public negativity if bugs arise during beta

### 6.2 Secondary: Email

For users who don't want to join another Discord/Slack.
All surveys and major updates go via email regardless.

---

## 7. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Low engagement (users sign up but don't use) | High | High | Completion criteria for rewards; nudge emails; small cohort for personal follow-up |
| Too much feedback, can't keep up | Medium | Medium | Triage: critical bugs → fix now, features → backlog, nice-to-haves → note |
| Users expect the product to be polished | Medium | Medium | Set expectations in onboarding: "This is beta. Things will break. Your feedback shapes the product." |
| Users share negative experiences publicly | Low | High | Be responsive. Fix issues fast. Most beta users understand — they signed up to help. |
| Cohort too homogeneous (all CISSP, all senior) | Medium | Medium | Deliberate diversity in recruitment; track segments |
| Beta delays public launch | Medium | Medium | Hard deadline: beta = 6 weeks, then ship. Do not extend indefinitely. |

---

## 8. Post-Beta Transition

### 8.1 For Beta Users

```
Beta ends → Users get 3 months free Pro (if completed program)
  → After 3 months: auto-revert to Free tier (no surprise charges)
  → Offer: 50% off Pro annual ($99/yr instead of $199/yr) within 30 days
  → "Founding User" badge remains permanently
```

### 8.2 For the Product

```
Beta ends → Ship final bug fixes from beta feedback (1 week)
  → Update marketing site with real testimonials
  → Update landing page with real user count and score data
  → Launch Pro tier publicly with Stripe billing
  → Write "What we learned from beta" blog post (SEO + transparency)
```

### 8.3 Launch Checklist (Post-Beta)

- [ ] ≥ 5 real testimonials on landing page
- [ ] Pass-rate / score improvement data validated (see `pass-rate-measurement.md`)
- [ ] All critical beta bugs resolved
- [ ] Stripe billing tested end-to-end
- [ ] Pricing page live with Free/Pro comparison
- [ ] "What we learned" blog post drafted
- [ ] Email to beta users: "We're live! Here's your discount."

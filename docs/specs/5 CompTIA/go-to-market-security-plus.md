# Go-to-Market — CompTIA Security+

> Status: DRAFT
> Date: 2026-02-12
> Role: Product Lead — Growth
> Dependency: `comptia-security-plus-launch.md`, `content-plan-security-plus.md`, `seo-strategy.md`
> Monetization context: `docs/specs/money/` (Stripe integration, pricing tiers)

---

## 1. Positioning

### 1.1 One-Line Positioning

**"The free Security+ practice exam with the adaptive engine paid tools wish they had."**

### 1.2 Positioning Matrix

| Dimension | ExamFlow Security+ | Jason Dion (Udemy) | CompTIA CertMaster | Pocket Prep |
|-----------|-------------------|-------------------|-------------------|-------------|
| Price | Free (core) | $15-90 | $399 | $20/mo |
| Questions | 150 → 500+ | ~500 | ~1,000 | ~500 |
| Adaptive engine | ✅ | ❌ | ❌ | ❌ |
| Analytics | Deep (domain + objective) | ❌ | Basic | Basic |
| Spaced repetition | ✅ | ❌ | ❌ | ❌ |
| Video content | ❌ | ✅ (course) | ❌ | ❌ |
| Upgrade path | Sec+ → CC → CISSP | Sec+ only | Sec+ only | Multi-cert |

### 1.3 Messaging by Audience

| Audience | Message | Channel |
|----------|---------|---------|
| **College students** | "Pass Security+ with free practice exams. No credit card." | SEO, Reddit r/CompTIA |
| **Career changers** | "Your fastest path from 0 to cybersecurity job — start free." | SEO, LinkedIn |
| **IT pros getting certified** | "Adaptive practice that targets your weakest domains." | SEO, blog |
| **CISSP aspirants** | "Already passed Sec+? Your analytics carry over to CISSP prep." | In-app cross-sell |

---

## 2. Security+ as Funnel — Pricing Architecture

### 2.1 Role in Pricing Tiers

Security+ is the **acquisition product** — its job is to bring users in, not to generate direct revenue.

```
┌─────────────────────────────────────────────────────┐
│  FREE TIER                                          │
│  ─────────                                          │
│  • Security+ (full question bank)                   │
│  • CC (full question bank)                          │
│  • All exam modes                                   │
│  • Basic analytics                                  │
│  • 3 exams per day limit                            │
│                                                     │
├─────────────────────────────────────────────────────┤
│  PRO TIER — $9-12/month                             │
│  ──────────────────────                             │
│  • CISSP (full question bank)                       │
│  • SSCP, CCSP, CGRC (full question banks)           │
│  • Unlimited exams                                  │
│  • Advanced analytics                               │
│  • Spaced repetition optimization                   │
│  • Performance reports                              │
│  • Priority support                                 │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 2.2 Why Security+ Is Free

| Reason | Business Logic |
|--------|---------------|
| Maximizes top-of-funnel | Higher conversion from organic search |
| Builds habit before paywall | Users establish practice routine before being asked to pay |
| Competitive wedge | None of the top competitors offer free + adaptive |
| Network effects | More users → more questions (marketplace) → more users |
| Upsell path clear | "Ready for CISSP? $9/mo." — natural progression |
| Low marginal cost | Questions already written; Firestore costs < $0.01/user/month |

### 2.3 Conversion Triggers (Free → Paid)

| Trigger | When | CTA |
|---------|------|-----|
| User hits exam limit | After 3rd exam in a day | "Unlock unlimited exams for $9/mo" |
| User completes Security+ bank | Scored >80% on all domains | "You're ready for CISSP. Start Pro." |
| User browses CISSP/SSCP/CCSP/CGRC | Clicks locked cert in sidebar | "This cert requires Pro. Start 7-day trial." |
| User tries advanced analytics | Clicks performance deep-dive | "Advanced analytics available in Pro." |
| Time-based nudge | 30 days on free tier, active user | "You've practiced 500+ questions. Take your prep to the next level." |

### 2.4 Pricing Communication

| Page | Language |
|------|----------|
| Security+ cert hub | "100% free — no credit card, no trial, no limits on questions." |
| CISSP cert hub | "Start with Security+ for free. Upgrade to Pro for CISSP." |
| Pricing page | "Free: Security+ & CC. Pro: CISSP + 4 more certs." |
| Post-exam screen | "Score: 85%. Ready to level up? CISSP Pro starts at $9/mo." |

---

## 3. SEO Launch Plan

### 3.1 Security+ URL Structure

```
/en/security-plus/                              ← Cert hub
/en/security-plus/domain-1-general-security-concepts/
/en/security-plus/domain-2-threats-vulnerabilities-mitigations/
/en/security-plus/domain-3-security-architecture/
/en/security-plus/domain-4-security-operations/
/en/security-plus/domain-5-security-program-management/
/en/security-plus/practice-questions/            ← Lead magnet
/en/security-plus/study-plan/                    ← Study guide
/en/security-plus/exam-format/                   ← SY0-701 format explainer
```

**Note:** URL slug is `security-plus` (not `comptia-security-plus`) — shorter, matches how users search.

### 3.2 Target Keywords

| Keyword | Monthly Volume | Difficulty | Page |
|---------|---------------|------------|------|
| "security+ practice test" | 22K | High | Cert hub |
| "security+ practice exam free" | 8K | Medium | Practice questions |
| "security+ study plan" | 6K | Medium | Study plan |
| "security+ sy0-701 exam" | 4K | Low | Exam format |
| "security+ domain 4 practice" | 1.5K | Low | Domain 4 page |
| "security+ vs cissp" | 3K | Medium | Blog post |
| "best security+ practice exams" | 5K | High | Comparison blog |
| "how to pass security+" | 4K | Medium | Blog post |
| "security+ practice questions free" | 6K | Medium | Practice page |
| "security+ study guide 2025" | 3K | Medium | Cert hub |

**Total addressable: ~60K-80K monthly searches** — larger than CISSP search volume.

### 3.3 SEO Page Priority

| Priority | Page | Target Launch |
|----------|------|--------------|
| P0 | Cert hub `/en/security-plus/` | Week 1 |
| P0 | Practice questions `/en/security-plus/practice-questions/` | Week 2 |
| P0 | 5 domain pages | Week 2-3 |
| P1 | Study plan guide | Week 3 |
| P1 | Blog: "How to Pass Security+" | Week 3 |
| P1 | Blog: "Security+ Study Plan 60 Days" | Week 4 |
| P2 | Blog: "Security+ vs CISSP" | Week 4 |
| P2 | Blog: "Best Security+ Practice Exams" | Week 5 |
| P2 | Exam format explainer | Week 5 |
| P3 | PT-BR cert hub + practice page | Week 8 |

### 3.4 Internal Linking from Existing Pages

Update existing SEO pages to cross-link Security+:

| Existing Page | Link to Add |
|---------------|-------------|
| Landing page | "Now with CompTIA Security+ practice exams" |
| CISSP cert hub | "Start with Security+ (free) → graduate to CISSP" |
| Blog: "Security+ vs CISSP" (new) | Links to both cert hubs |
| Compare: competitors | Add Security+ mention where relevant |
| Footer nav | "Security+" in certifications column |
| Sitemap | All Security+ URLs |

---

## 4. Launch Sequence

### 4.1 Pre-Launch (Week -1 to 0)

| Day | Action | Owner |
|-----|--------|-------|
| -7 | Finalize 150 questions (reviewed, tagged, imported) | Founder |
| -5 | Create Security+ Study in marketplace | Founder |
| -3 | Complete cert hub SEO page content | Founder |
| -2 | Complete 5 domain page content | Founder |
| -1 | Complete practice questions page (with 10 free Qs) | Founder |
| -1 | Update `seo-data.ts` with Security+ slugs | Founder |
| -1 | Update sitemap to include Security+ URLs | Founder |
| 0 | **Deploy.** Push to production. | Founder |

### 4.2 Launch Day (Day 0)

| Action | Time |
|--------|------|
| Verify all pages render correctly | Morning |
| Request indexing in GSC for all Security+ URLs | Morning |
| Submit to Bing Webmaster Tools | Morning |
| Post on Reddit r/CompTIA: "We built a free adaptive Security+ practice exam" | Afternoon |
| Post on Reddit r/cybersecurity | Afternoon |
| Post on LinkedIn (personal) | Afternoon |
| Tweet / X post | Afternoon |

### 4.3 Week 1 Post-Launch

| Day | Action |
|-----|--------|
| 1-2 | Monitor GSC for indexing status, fix any crawl errors |
| 2-3 | Publish "How to Pass Security+" blog post |
| 3-5 | Publish study plan guide page |
| 5-7 | Monitor signups, quiz completion rates, first user feedback |

### 4.4 Month 1 Post-Launch

| Week | Action |
|------|--------|
| 2 | Expand question bank to 200 |
| 2 | Publish 2 more blog posts |
| 3 | First comparison blog: "Best Security+ Practice Exams" |
| 3 | Expand to 250 questions |
| 4 | Review analytics: which pages drive signups |
| 4 | Expand to 300 questions |

---

## 5. Distribution Channels

### 5.1 Organic (Primary — $0)

| Channel | Action | Expected Impact |
|---------|--------|-----------------|
| Google SEO | 10+ pages targeting Sec+ keywords | 60% of signups |
| Reddit r/CompTIA (380K members) | Genuine value posts, not spam | 15% of Day 0 signups |
| Reddit r/cybersecurity (1.3M) | Share as tool, not promotion | 10% of Day 0 signups |
| Reddit r/ITCareerQuestions (300K) | Answer cert questions, mention tool | 5% |

### 5.2 Reddit Strategy (Critical Channel)

**Do:**
- Post in r/CompTIA as a community member sharing a tool you built
- Offer genuinely helpful content (study tips, free resources)
- Be transparent: "I'm the creator of ExamFlow"
- Respond to all comments and questions
- Share practice exam results screenshots

**Don't:**
- Post "check out my app!" low-effort promotions
- Spam multiple subreddits on the same day
- Use alt accounts
- Disparage competitors

**Template post for r/CompTIA:**

> **Title:** I built a free adaptive Security+ practice exam — here's what makes it different
>
> Hey r/CompTIA, I've been building ExamFlow, a practice exam platform for cybersecurity certs. I just launched Security+ SY0-701 support and wanted to share it.
>
> What makes it different from other practice tools:
> - **Adaptive engine** — targets your weak domains automatically
> - **Spaced repetition** — reviews questions you got wrong at optimal intervals
> - **Domain-level analytics** — see exactly where you need to focus
> - **100% free** for Security+ — no trial, no credit card
>
> Currently have 150 questions covering all 28 SY0-701 objectives, expanding to 500+ over the next few weeks.
>
> Link: [examflow.com/en/security-plus/practice-questions/]
>
> Would love feedback from anyone studying for Security+.

### 5.3 Social (Secondary — $0)

| Platform | Content Format | Cadence |
|----------|---------------|---------|
| LinkedIn | Personal post about building the tool | 1x at launch, 1x/month |
| X/Twitter | Thread: "What I learned building a free Security+ practice exam" | 1x at launch |
| Dev.to / Hashnode | Technical writeup on the adaptive engine | 1x post-launch |

### 5.4 Paid (Not Recommended for Launch)

Skip paid acquisition until organic channel is validated. Security+ has thin margins — CAC must be near $0 since the product is free.

---

## 6. Conversion Path Design

### 6.1 Security+ User Journey

```
Discovery → Landing → Quiz → Signup → Practice → Upgrade
```

| Stage | Page/Action | Conversion Goal |
|-------|-------------|-----------------|
| **Discovery** | Google: "security+ practice test free" | Click through to ExamFlow |
| **Landing** | `/en/security-plus/` cert hub | Click "Try Practice Questions" CTA |
| **Quiz** | `/en/security-plus/practice-questions/` (10 free Qs) | Complete quiz, see score |
| **Signup** | Post-quiz: "Create free account for 150+ more questions" | Sign up (email/Google) |
| **Practice** | Dashboard: take Sec+ exams | Complete 3+ exams, build habit |
| **Cross-browse** | See CISSP in sidebar | Click CISSP → hit paywall |
| **Upgrade** | Pricing page / paywall modal | Subscribe to Pro |

### 6.2 Conversion Rate Targets

| Step | Target | Benchmark |
|------|--------|-----------|
| SEO → Cert hub visit | 3-5% CTR | Industry avg for position 5-10 |
| Cert hub → Practice page | 30-40% | Strong CTA positioning |
| Practice page → Quiz start | 50-60% | Interactive, no friction |
| Quiz → Signup | 15-25% | Score reveals + "get more" hook |
| Signup → Active (3+ exams) | 30-40% | Strong onboarding |
| Active → Pro upgrade | 5-10% (of active users) | Within 60 days |

### 6.3 In-App Cross-Sell Touchpoints

| Touchpoint | Trigger | Message |
|------------|---------|---------|
| Post-exam results | Score >80% on Sec+ exam | "Strong score! You have the foundation for CISSP. Learn more →" |
| Domain mastery | All 5 Sec+ domains >80% | "You've mastered Security+. Ready for the next challenge? Try CISSP →" |
| Dashboard sidebar | When CISSP study is clicked | "CISSP practice requires Pro. Start 7-day free trial." |
| Weekly email digest | After 30 days of Sec+ activity | "You've answered 300+ questions. Here's your CISSP readiness score." |
| Settings / cert picker | When browsing available certs | Sec+ and CC marked "FREE". Others marked "PRO". |

### 6.4 CISSP Readiness Score (Cross-Sell Feature)

Unique feature: calculate how much Sec+ knowledge transfers to CISSP.

```
CISSP Readiness from Security+
──────────────────────────────
Domain 1 (Security & Risk Mgmt): 35% ready ████████░░░░░░░
Domain 3 (Security Architecture): 40% ready █████████░░░░░░
Domain 7 (Security Operations):   50% ready ████████████░░░
Overall: 25% CISSP-ready from Security+ alone

"Unlock full CISSP practice → Pro Plan"
```

Based on the cross-cert topic overlap defined in `certification-model-extensions.md`. This is a powerful conversion tool because it makes the user feel their progress is transferable.

---

## 7. Launch Metrics & Decision Gates

### 7.1 Day 7 Check

| Metric | Red Flag | On Track | Outperforming |
|--------|----------|----------|---------------|
| Signups | <10 | 20-50 | >50 |
| Quiz completions | <20 | 50-100 | >100 |
| DAU | <5 | 10-20 | >20 |
| Reddit post karma | <5 | 20-50 | >100 |
| Pages indexed (GSC) | <3 | 5-8 | 10+ |

### 7.2 Day 30 Decision Gate

| Scenario | Signal | Action |
|----------|--------|--------|
| **Green: Working** | >100 signups, >20 DAU, positive Reddit feedback | Accelerate to 300+ questions, more blog posts, double down |
| **Yellow: Slow** | 30-100 signups, 5-20 DAU | Check SEO indexing, try different Reddit angles, improve quiz |
| **Red: Not working** | <30 signups, <5 DAU | Audit: is it discovery (SEO not ranking) or conversion (users don't sign up)? |

### 7.3 Day 90 Success Criteria

| Metric | Target |
|--------|--------|
| Total Sec+ signups | 200-500 |
| Monthly active users (Sec+) | 100-200 |
| Question bank size | 500+ |
| Organic sessions/month to Sec+ pages | 1K-3K |
| Sec+ users who view CISSP | 10-20% |
| Sec+ users who upgrade to Pro | 3-5% of actives |
| NPS or Reddit sentiment | Positive |

### 7.4 90-Day Revenue Impact Estimate

```
Sec+ signups:          300 (conservative)
Active users:          120 (40% retention)
Browse CISSP:          24  (20% of active)
Convert to Pro:        7   (30% of browsers)
Pro price:             $9/month

Month 3 MRR from Sec+ funnel: ~$63
Month 6 MRR (compounding):    ~$200-400

Compare to:
  Direct CISSP acquisition cost with ads: $20-50 CPA
  7 conversions via Sec+ funnel: $0 CAC
  Equivalent ad spend saved: $140-350
```

Revenue from Sec+ funnel is small early but compounds. The real value is **$0 CAC** for CISSP Pro subscribers.

---

## 8. Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| r/CompTIA post gets removed as spam | Medium | Medium | Build karma first. Post value, not promo. Have backup text post. |
| Low signup conversion from SEO | Medium | High | A/B test headlines, improve free quiz CTA. |
| Security+ users never upgrade to CISSP | Medium | Medium | Acceptable — they still grow TAM and create content moat. |
| Competitor launches free Sec+ tool | Low | Medium | Adaptive engine + analytics + cross-cert path is hard to copy. |
| CompTIA trademark complaint | Very Low | Medium | Use "Security+" not "CompTIA Security+®" in marketing. Reference exam code. |
| Question quality complaints on Reddit | Low | High | QA every question before launch. Respond fast to reported issues. |

---

## 9. Post-Launch Roadmap

| Timeline | Milestone |
|----------|-----------|
| Month 1 | 300 questions, 3 blog posts, Reddit presence |
| Month 2 | 500 questions, objective mastery view (T1), study plan tracker |
| Month 3 | CISSP readiness score feature, comparison pages |
| Month 4 | Consider Network+ (same playbook, same engine) |
| Month 6 | Evaluate CySA+ launch (Sec+ → CySA+ upgrade path) |

### 9.1 Future CompTIA Certs (Same Playbook)

| Cert | TAM | Effort | Strategic Value |
|------|-----|--------|-----------------|
| Network+ (N10-009) | ~200K/year | Same as Sec+ | Lateral expansion |
| CySA+ (CS0-003) | ~80K/year | Same as Sec+ | Sec+ upgrade path |
| PenTest+ (PT0-002) | ~40K/year | Same as Sec+ | Niche, high-value users |
| A+ (220-1101/1102) | ~500K/year | Higher (2 exams) | Massive funnel, lower value |

**Priority:** Security+ first → CySA+ (natural upgrade) → Network+ (lateral) → PenTest+ (niche).

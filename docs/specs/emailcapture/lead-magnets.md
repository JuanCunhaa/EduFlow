# Lead Magnets — Design & Delivery

> Status: DRAFT
> Date: 2026-02-12
> Role: Lifecycle Marketing + Growth Engineer
> Dependency: `email-capture.md`, `drip-sequences.md`, `seo/seo-page-templates.md`

---

## 1. Lead Magnet Inventory

| Lead Magnet | Format | Value to User | Value to ExamFlow | Effort to Build |
|-------------|--------|--------------|-------------------|-----------------|
| **Readiness Quiz** | Interactive (in-page) | Know weak domains before committing to a study plan | Highest-quality lead data (cert, score, weak domains) | 2-3 days |
| **7-Day Study Plan** | PDF download | Structured daily schedule to start studying | Email + cert interest | 0.5 day |
| **Domain Weakness Report** | Email/PDF (personalized) | Specific domain breakdown + study tips | Deep engagement + personalization data | 1 day (template) |

### 1.1 Lead Magnet Funnel Position

```
Cold visitor                                 Warm lead
    │                                            │
    │  7-Day Study Plan                          │
    │  (lowest friction,                         │
    │   broadest appeal)                         │
    │                                            │
    ├──────────────────────────────────────────→  │
    │                                            │
    │  Readiness Quiz                            │
    │  (medium friction,                         │
    │   highest data quality)                    │
    │                                            │
    ├──────────────────────────────────────────→  │
    │                                            │
    │  Domain Weakness Report                    │
    │  (post-quiz or post-exam,                  │
    │   deepest personalization)                 │
    │                                            │
    └──────────────────────────────────────────→  │
```

**The study plan** catches everyone. **The quiz** qualifies them. **The report** hooks them.

---

## 2. Lead Magnet #1 — Readiness Quiz

### 2.1 What It Is

A free, public, 10-question mini-assessment that tells visitors how ready they are for their certification exam — before they sign up for anything.

### 2.2 Why It's the Highest-Value Lead Magnet

| Dimension | Why |
|-----------|-----|
| **For the user** | Immediate, actionable insight. "I'm at 60% — my weakest area is Domain 4." |
| **For ExamFlow** | Captures cert interest, per-domain weakness data, and engagement level — the richest lead data possible |
| **For SEO** | Can be linked from every cert hub and blog post. Generates organic traffic. |
| **For conversion** | "You scored 5/10. ExamFlow can help — start practicing your weak domains free." |

### 2.3 Quiz Design

**Per certification.** Each cert gets its own quiz (different questions, different domains).

#### CISSP Readiness Quiz (Example)

| Q# | Domain | Question Type | Difficulty |
|----|--------|--------------|------------|
| 1 | Domain 1: Security & Risk Management | Concept identification | Medium |
| 2 | Domain 2: Asset Security | Best practice | Easy |
| 3 | Domain 3: Security Architecture | Scenario | Medium |
| 4 | Domain 4: Communication & Network Security | Technical | Medium |
| 5 | Domain 5: IAM | Process | Easy |
| 6 | Domain 6: Security Assessment | Methodology | Medium |
| 7 | Domain 7: Security Operations | Incident response | Hard |
| 8 | Domain 8: Software Development Security | Concept | Medium |
| 9 | Cross-domain | Scenario (governance + risk) | Hard |
| 10 | Cross-domain | Scenario (ops + network) | Hard |

**Question selection criteria:**
- One question per domain (questions 1-8) + 2 cross-domain
- Questions should be representative, not trick questions
- Not from the actual ExamFlow question bank (these are purpose-built for the quiz)
- Updated annually or when cert exam changes

### 2.4 Quiz Flow

```
Step 1: Landing (no gate)
┌────────────────────────────────────────────────────┐
│  How ready are you for CISSP?                      │
│                                                    │
│  10 questions · 5 minutes · Free                   │
│                                                    │
│  Which certification are you studying for?         │
│  ○ CISSP  ○ CC  ○ SSCP  ○ CCSP  ○ Security+      │
│                                                    │
│  [Start Quiz →]                                    │
│  (no email required to start)                      │
└────────────────────────────────────────────────────┘

Step 2: Questions (no gate)
┌────────────────────────────────────────────────────┐
│  Question 4 of 10                    ████░░░░░░    │
│                                                    │
│  Which layer of the OSI model does TLS              │
│  primarily operate at?                             │
│                                                    │
│  ○ A) Layer 3 — Network                            │
│  ○ B) Layer 4 — Transport                          │
│  ○ C) Layer 5 — Session                            │
│  ● D) Layer 6 — Presentation                       │
│                                                    │
│  [Next →]                                          │
└────────────────────────────────────────────────────┘

Step 3: Partial result (teaser — no gate)
┌────────────────────────────────────────────────────┐
│  Your readiness score: 6 / 10                      │
│                                                    │
│  You answered 6 questions correctly.               │
│  Your weakest area appears to be:                  │
│  Domain 4: Communication & Network Security        │
│                                                    │
│  ── Get your full report ──                        │
│                                                    │
│  See your per-domain breakdown, personalized       │
│  study tips, and a recommended practice plan.      │
│                                                    │
│  ┌────────────────────┐ [Get My Report →]          │
│  │ your@email.com     │                            │
│  └────────────────────┘                            │
│                                                    │
│  □ Send me weekly CISSP study tips                 │
└────────────────────────────────────────────────────┘

Step 4: Full report (delivered to email + shown on screen)
┌────────────────────────────────────────────────────┐
│  Your CISSP Readiness Report                       │
│                                                    │
│  Overall: 6/10 (60%)                               │
│  Readiness: DEVELOPING — focus on weak domains     │
│                                                    │
│  Domain Breakdown:                                 │
│  ✅ D1: Security & Risk Mgmt        ✓ Correct     │
│  ✅ D2: Asset Security               ✓ Correct     │
│  ✅ D3: Security Architecture        ✓ Correct     │
│  ❌ D4: Communication & Network      ✗ Incorrect   │
│  ✅ D5: IAM                          ✓ Correct     │
│  ❌ D6: Security Assessment          ✗ Incorrect   │
│  ✅ D7: Security Operations          ✓ Correct     │
│  ❌ D8: Software Dev Security        ✗ Incorrect   │
│  ❌ Cross-domain                     ✗ Incorrect   │
│                                                    │
│  📋 Recommended Focus Areas:                       │
│  1. Domain 4: Communication & Network Security     │
│  2. Domain 8: Software Development Security        │
│  3. Domain 6: Security Assessment & Testing        │
│                                                    │
│  Ready to start practicing your weak domains?      │
│  [Create Free Account →]                           │
│                                                    │
│  Or: Download your 7-day CISSP study plan →        │
└────────────────────────────────────────────────────┘
```

### 2.5 Quiz Technical Implementation

**Hosting:** Static page at `/en/cissp/quiz/` (and `/en/cc/quiz/`, etc.)
**Rendering:** Client-side quiz component (no server calls until email capture)
**Question storage:** Hardcoded in the quiz component or in a JSON file (not Firestore — these are public, curated questions)
**Results calculation:** Client-side — no cheating concern (it's a lead magnet, not a real test)
**Email capture API:** `POST /api/leads` — stores lead + quiz results

```typescript
// POST /api/leads
interface QuizLeadPayload {
    email: string;
    cert: string;
    quizScore: number;                    // 0-10
    answers: { domain: string; correct: boolean }[];
    weakDomains: string[];                // derived from incorrect answers
    source: 'readiness_quiz';
    optInDrip: boolean;                   // true if checkbox was checked
}
```

### 2.6 Quiz Per Certification

| Cert | # Questions | Domains Covered | Status |
|------|------------|-----------------|--------|
| CISSP | 10 | 8 domains + 2 cross-domain | Build first |
| CC | 8 | 5 domains + 3 cross-domain | Build second |
| Security+ | 10 | 5 domains + 5 cross-domain | Build with CompTIA launch |
| SSCP | 8 | 7 domains + 1 cross-domain | Phase 2 |
| CCSP | 8 | 6 domains + 2 cross-domain | Phase 2 |
| CGRC | 8 | 7 domains + 1 cross-domain | Phase 3 |

---

## 3. Lead Magnet #2 — 7-Day Study Plan

### 3.1 What It Is

A downloadable PDF with a day-by-day study schedule for the first week of cert preparation. Structured, practical, and immediately useful.

### 3.2 Plan Structure (CISSP Example)

```
7-Day CISSP Study Kickstart Plan

Day 1: Orientation & Domain 1 (Security & Risk Management)
  ─────────────────────────────────────────────────────
  Morning (45 min):
  ✓ Read CISSP exam overview (format, CAT, scoring)
  ✓ Skim Domain 1 objectives (ISC2 exam outline)

  Afternoon (30 min):
  ✓ Take a 15-question practice exam (Domain 1 focus)
  ✓ Review wrong answers — read explanations carefully

  Evening (15 min):
  ✓ Write down 3 concepts you didn't know
  ✓ Look them up. Don't memorize — understand.

Day 2: Domain 2 (Asset Security) + Domain 3 (Security Architecture)
  ─────────────────────────────────────────────────────
  ...

Day 3: Domain 4 (Communication & Network Security)
  ─────────────────────────────────────────────────────
  ...

Day 4: Domain 5 (IAM) + Domain 6 (Security Assessment)
  ─────────────────────────────────────────────────────
  ...

Day 5: Domain 7 (Security Operations) + Domain 8 (Software Dev)
  ─────────────────────────────────────────────────────
  ...

Day 6: Full Practice Exam (Weak-Domain Mode)
  ─────────────────────────────────────────────────────
  ✓ Take a 50-question full practice exam
  ✓ No time limit — focus on understanding
  ✓ Score yourself. Note weak domains.
  ✓ Re-study the 2 weakest domains.

Day 7: Review & Plan Forward
  ─────────────────────────────────────────────────────
  ✓ Take a 25-question exam targeting your 2 weakest domains
  ✓ Compare your score to Day 6 — did you improve?
  ✓ Set your 30-day study plan based on what you learned
  ✓ Decide: exam date? More practice needed?

Bonus: Tools for Each Day
  ✓ ExamFlow — adaptive practice exams (free tier: 3 exams/day)
  ✓ Official ISC2 Study Guide (companion reading)
  ✓ Flashcard app for terminology
```

### 3.3 Design & Format

| Attribute | Specification |
|-----------|--------------|
| Format | PDF (A4, printable) |
| Pages | 3-4 pages (not a book — a quick-start) |
| Design | Clean, minimal. Logo at top. Checklist format. |
| Tool | Canva or Figma → export PDF |
| Hosting | Static file: `/public/downloads/cissp-7day-plan.pdf` or gated via API |
| Delivery | Immediate — email contains download link + inline summary |
| Personalization | Cert-specific (one PDF per cert) |

### 3.4 Plans Per Certification

| Cert | Title | Status |
|------|-------|--------|
| CISSP | 7-Day CISSP Study Kickstart | Build first |
| CC | 5-Day CC Study Kickstart | Second (shorter cert = shorter plan) |
| Security+ | 7-Day Security+ Study Kickstart | With CompTIA launch |
| SSCP | 7-Day SSCP Study Kickstart | Phase 2 |
| CCSP | 7-Day CCSP Study Kickstart | Phase 2 |

### 3.5 Why PDFs Still Work

| Concern | Reality |
|---------|---------|
| "Nobody downloads PDFs anymore" | Cert candidates are students. They download study guides constantly. |
| "Why not a web page?" | PDF feels like a tangible asset. Higher perceived value = higher capture rate. |
| "Will they actually use it?" | Some will, some won't. The point is the email capture + the drip that follows. |

---

## 4. Lead Magnet #3 — Domain Weakness Report

### 4.1 What It Is

A personalized email/PDF that shows a user exactly which domains they're weakest in, with specific study recommendations for each. Generated from either:
- **Readiness quiz results** (for leads)
- **Actual exam data** (for free users hitting the analytics paywall)

### 4.2 Report Content

```
Your CISSP Domain Weakness Report
Generated: February 12, 2026

Overall Readiness: 64% (Developing)

Domain Performance:
────────────────────────────────────────────────
Strongest:
  ✅ D2: Asset Security                    85%
  ✅ D1: Security & Risk Management        78%
  ✅ D5: IAM                               72%

Needs Work:
  ⚠️  D7: Security Operations              65%
  ⚠️  D3: Security Architecture            63%

Focus Areas (Critical):
  ❌ D4: Communication & Network Security   52%
  ❌ D8: Software Development Security      48%
  ❌ D6: Security Assessment & Testing      44%

Recommendations:
────────────────────────────────────────────────

Domain 6: Security Assessment & Testing (44%)
  Your lowest domain. Focus on:
  • Vulnerability assessment methodologies
  • Penetration testing vs. vulnerability scanning
  • Security audit process and controls
  Study tip: Practice 20 domain-focused questions 
  daily for 1 week.

Domain 8: Software Development Security (48%)
  Common weak area. Focus on:
  • SDLC security integration points
  • OWASP Top 10 concepts
  • Code review and static analysis
  Study tip: Use the "domain focus" exam mode 
  targeting Domain 8.

Domain 4: Communication & Network Security (52%)
  Network fundamentals need reinforcement:
  • OSI model and security at each layer
  • VPN, TLS, IPsec configurations
  • Network attack types and defenses
  Study tip: After mastering D6 and D8, shift 
  focus here.

Next Steps:
────────────────────────────────────────────────
1. Start with your weakest domain (D6)
2. Take a 25-question domain-focused exam on ExamFlow
3. Review every wrong answer's explanation
4. Retake after 2 days — track improvement

[Start Practicing Domain 6 →]
[Create Free Account →]
```

### 4.3 Report Generation

| Source | Trigger | Data Quality |
|--------|---------|-------------|
| Readiness quiz (10 questions) | After email capture on quiz | Low granularity (1 Q per domain) but directionally correct |
| First 3 exams (free user) | After 3rd exam, offer report if email not captured | Medium (15-75 questions across domains) |
| 10+ exams (free/pro user) | Periodic (weekly) or on-demand in analytics | High (statistically meaningful) |

### 4.4 Delivery Method

| Method | When | Format |
|--------|------|--------|
| Email (inline HTML) | Immediately after quiz/email capture | HTML email with domain bars |
| Downloadable PDF | Linked in the email | PDF with full chart |
| In-app page | After signup, `/dashboard/readiness-report` | Interactive, links to practice |

### 4.5 Domain Study Tips Database

Pre-write 3-5 study tips per domain per cert. Store as static content:

```typescript
const DOMAIN_STUDY_TIPS: Record<string, Record<string, string[]>> = {
    cissp: {
        d1: [
            "Focus on risk assessment frameworks (NIST, ISO 27005)",
            "Understand the difference between qualitative and quantitative risk analysis",
            "Practice BCP/DRP scenarios — they appear heavily in the real exam",
        ],
        d2: [
            "Master data classification schemes (public, internal, confidential, restricted)",
            "Understand data lifecycle: create, store, use, share, archive, destroy",
            "Know the difference between data owner, custodian, and processor roles",
        ],
        // ... per domain
    },
    cc: { /* ... */ },
};
```

---

## 5. Lead Magnet Quality Checklist

Before publishing any lead magnet, verify:

| Criterion | ✓ |
|-----------|---|
| Provides genuine value (not just a teaser for the product) | |
| Actionable within 5 minutes of receiving | |
| Professionally formatted (no typos, clean layout) | |
| Cert-specific (not generic "how to study for anything") | |
| Includes ExamFlow branding + CTA, but not aggressively | |
| Accurate technical content (reviewed against latest exam objectives) | |
| Updated for current year (exam format, domain weights) | |
| Mobile-friendly (PDF renders, email renders on mobile) | |
| Quick to consume (study plan: 3-4 pages; report: 1-2 pages) | |
| Clear next step ("Start practicing" or "Create account") | |

---

## 6. Promotion Matrix

Where each lead magnet appears:

| Lead Magnet | Landing Page | Cert Hub | Blog Posts | Exit Intent | In-App | Social |
|-------------|-------------|----------|-----------|-------------|--------|--------|
| Readiness Quiz | ✅ (main CTA) | ✅ (hero) | ✅ (inline) | ✅ (popup) | ❌ | ✅ (Twitter/LinkedIn) |
| 7-Day Study Plan | ✅ (secondary) | ✅ (sidebar) | ✅ (bottom) | ❌ | ❌ | ✅ (Reddit posts) |
| Domain Weakness Report | ❌ | ❌ | ✅ (inline) | ❌ | ✅ (analytics teaser) | ❌ |

---

## 7. Implementation Priority

| Priority | Lead Magnet | Effort | Capture Points Using It |
|----------|------------|--------|------------------------|
| 1 | **7-Day Study Plan (CISSP)** | 0.5 day (write + format PDF) | CP1 hero, CP3 download, CP6 blog |
| 2 | **Readiness Quiz (CISSP)** | 2-3 days (component + API + report) | CP2 quiz, CP4 exit intent |
| 3 | **Domain Weakness Report** | 1 day (template + tips DB) | CP8 analytics teaser, quiz follow-up |
| 4 | Study Plan (CC) | 0.5 day | Same capture points, CC variant |
| 5 | Readiness Quiz (CC) | 0.5 day (reuse component, new questions) | Same capture points, CC variant |
| 6 | Study Plan (Security+) | 0.5 day | After CompTIA launch |

**Total Phase 1:** ~4-5 days for CISSP study plan + quiz + report

---

## 8. Metrics Per Lead Magnet

| Metric | Study Plan | Readiness Quiz | Domain Report |
|--------|-----------|---------------|---------------|
| Capture rate (visitors → email) | 5-10% | 15-25% | N/A (derivative) |
| Lead → signup (14d) | 15-25% | 25-40% | 30-45% (highest intent) |
| Quiz completion rate | N/A | > 60% | N/A |
| Email open rate (delivery email) | > 60% | > 70% | > 70% |
| CTA click rate (in email) | > 10% | > 15% | > 15% |

The readiness quiz is expected to produce the highest-quality leads because of the engagement and data richness, despite slightly higher friction.

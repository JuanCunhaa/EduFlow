# Insights & Product Surfaces

> Status: DRAFT
> Date: 2026-02-12
> Role: Product Analyst
> Dependencies: `cross-user-analytics.md` (data layer), `event-tracking-schema.md` (events), `privacy-anonymization.md` (what can be shown)

---

## 1. Product Philosophy

Every insight surface must answer a user's real question:

| User Question | Surface | Data Required |
|---------------|---------|---------------|
| "Am I ready to take the exam?" | **Readiness Score** | Domain accuracy, question coverage, score trend, hard-question accuracy |
| "Where should I focus?" | **Weakness Graph** | Domain accuracy, co-weakness correlations, question-level failures |
| "How do I compare to others?" | **Percentile Rank** | Cohort score distributions |
| "Which questions matter most?" | **Most Predictive Questions** | Point-biserial correlation, discriminative power |
| "What should I study next?" | **Study Plan Generator** | All of the above + time estimates |

Each surface has three maturity levels:
- **V1 (Day 14–30):** Heuristic, user's own data only, no cross-user
- **V2 (Day 30–60):** Cross-user data added (percentiles, calibrated difficulty)
- **V3 (Day 60–90):** ML-informed, co-failure correlations, adaptive study plans

---

## 2. Readiness Score

### 2.1 What the User Sees

```
┌─────────────────────────────────────────────────┐
│  CISSP Readiness                                │
│                                                 │
│           ┌─────────────┐                       │
│           │     76      │  ← Big number         │
│           │   /100      │                       │
│           └─────────────┘                       │
│                                                 │
│  🟢 Likely Ready                                │
│  "You're in good shape. Polish weak spots       │
│   and schedule your exam."                      │
│                                                 │
│  ┌───────────────────────────────┐              │
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓░░░░  Top 35%   │ ← Percentile │
│  └───────────────────────────────┘   (V2+)      │
│                                                 │
│  Score trend: ↗ Improving (+4 over last 5 exams)│
│                                                 │
│  Factors:                                       │
│  ├── Domain coverage    ████████░░  82%         │
│  ├── Recent scores      ████████░░  78%         │
│  ├── Hard questions     ██████░░░░  65%         │
│  ├── Question coverage  ███████░░░  73%         │
│  ├── Weak domains       █████████░  1 remaining │
│  └── Time management    ██████████  98%         │
│                                                 │
│  [View Study Plan →]                            │
└─────────────────────────────────────────────────┘
```

### 2.2 Readiness Components

| Component | Weight | Source | Calculation |
|-----------|--------|--------|-------------|
| Weighted domain accuracy | 25% | `PerformanceSummary.domainAccuracy` weighted by ISC2 exam domain weights | Σ(domain_accuracy × domain_weight) |
| Recent exam scores | 20% | Last 5 `ExamAttemptSummary.score` | Mean of last 5. If <5 exams, use all with penalty. |
| Hard question accuracy | 15% | `QuestionAttemptRecord` filtered by difficulty=hard | correct/total for hard questions only |
| Question coverage | 15% | Unique questions attempted / total marketplace questions | `min(1.0, unique_attempted / total_available)` |
| Weak domain penalty | 10% | Domains with accuracy <70% | `1.0 - (weak_domain_count / total_domains)` |
| Trend bonus | 10% | Linear regression slope on last 10 exam scores | Positive slope → bonus. Negative → penalty. |
| Time management | 5% | Average seconds/question vs allowed | `1.0` if within limit, scales down with excess |

### 2.3 Readiness Bands

| Score | Band | Color | Icon | Copy |
|-------|------|-------|------|------|
| 0–39 | Not Ready | Red | 🔴 | "Keep studying. Focus on weak domains first." |
| 40–59 | Building | Orange | 🟠 | "You're making progress. Target weak areas and keep practicing." |
| 60–74 | Getting Close | Yellow | 🟡 | "Review weak domains and take more full-length exams." |
| 75–89 | Likely Ready | Green | 🟢 | "You're in good shape. Polish weak spots and schedule your exam." |
| 90–99 | Highly Ready | Blue | 🔵 | "You're ready. Consider scheduling your exam this week." |

### 2.4 Percentile Context (V2 — Requires Cross-User Data)

Below the readiness score, show:

> "Top 35% among CISSP candidates on ExamFlow"

**Data source:** `analytics/cohorts/cissp → readinessPercentiles`

**K-threshold:** Only show if ≥ 20 unique users have readiness computed for this cert. Below threshold: show "Not enough data for comparison yet."

### 2.5 API Design

```
GET /api/analytics/readiness?studyId=cissp

Response:
{
  readiness: 76,
  band: "likely_ready",
  bandLabel: "Likely Ready",
  recommendation: "You're in good shape...",
  percentile: 65,              // null if below K-threshold
  percentileLabel: "Top 35%",  // null if below K-threshold
  trend: {
    direction: "improving",
    delta: 4,
    examsAnalyzed: 5
  },
  factors: {
    weightedDomainAccuracy: { value: 0.82, weight: 0.25 },
    recentScores: { value: 0.78, weight: 0.20, scores: [74, 76, 79, 80, 81] },
    hardQuestionAccuracy: { value: 0.65, weight: 0.15 },
    questionCoverage: { value: 0.73, weight: 0.15, attempted: 1200, total: 1650 },
    weakDomainPenalty: { value: 0.875, weight: 0.10, weakDomains: ["crypto"] },
    trendBonus: { value: 0.6, weight: 0.10 },
    timeManagement: { value: 0.98, weight: 0.05 }
  }
}
```

**Cache:** 5 minutes per user. Invalidated on exam submission.

### 2.6 Where It Appears

| Location | What's Shown |
|----------|-------------|
| Dashboard (main page) | Readiness score card (big number + band + percentile) |
| Analytics page | Full breakdown with factors and trend |
| Post-exam results | Updated readiness score ("Your readiness increased by 2 points") |
| Study Plan page | Readiness as the "target" metric the plan optimizes for |

---

## 3. Weakness Graph

### 3.1 What the User Sees

```
┌──────────────────────────────────────────────────────────────┐
│  Your Weakness Map — CISSP                                   │
│                                                              │
│  Domain Accuracy                    Correlated Weaknesses    │
│  ┌────────────────────────────┐     ┌────────────────────┐   │
│  │ SAM  ████████████████  92% │     │                    │   │
│  │ AS   ██████████████░░  84% │     │   [SAM]            │   │
│  │ SA   ███████████░░░░░  71% │     │     ↕ strong       │   │
│  │ CNS  ██████████████░░  82% │     │   [IAM]            │   │
│  │ IAM  █████████░░░░░░░  61% │◀──  │     ↕ moderate     │   │
│  │ SAT  ████████████░░░░  75% │     │   [CRY]   ──weak──▸[CNS]│
│  │ SO   ███████████████░  88% │     │                    │   │
│  │ SSD  ██████████████░░  81% │     └────────────────────┘   │
│  └────────────────────────────┘                              │
│                                                              │
│  ⚠️ IAM is your weakest domain.                             │
│  Users who struggle with IAM also tend to struggle with      │
│  Security Architecture (SA) — consider reviewing both.       │
│                                                              │
│  📊 Your IAM accuracy (61%) is below the platform average    │
│     of 73%. Focus on: access control models, identity        │
│     federation, and privilege management.                    │
│                                                              │
│  [Start IAM-focused exam →]  [View Study Plan →]            │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Data Components

#### Layer 1: Personal Domain Accuracy (V1 — Day 14)

- Source: `PerformanceSummary.domainAccuracy`
- Already collected today
- Display: horizontal bar chart sorted by accuracy ascending (weakest first)

#### Layer 2: Cross-User Comparison (V2 — Day 30)

- Source: `analytics/domains/{certId}_{domainId} → meanAccuracy`
- Show user's accuracy vs platform average per domain
- Label: "Below average" / "Above average" / "Top quartile"
- K-threshold: 10 unique users per domain

#### Layer 3: Co-Weakness Correlations (V3 — Day 60)

- Source: `analytics/correlations/{certId}`
- Show edges between domains where co-weakness > 0.5
- Visualization: simple graph with domain nodes and weighted edges
- K-threshold: 30 co-occurrences minimum

### 3.3 Co-Weakness Data Structure

```typescript
interface DomainCoWeakness {
  certId: string;
  pairs: Array<{
    domainA: string;
    domainB: string;
    strength: number;       // 0.0–1.0, co-weakness correlation
    sampleSize: number;     // how many users contributed
    direction: 'bidirectional' | 'a_predicts_b' | 'b_predicts_a';
  }>;
  lastComputedAt: number;
}
```

### 3.4 Actionable Recommendations

The weakness graph is not just data — it's a prescription:

| Situation | Recommendation |
|-----------|----------------|
| 1 weak domain | "Focus on {domain}. Start a domain-focused exam." |
| 2+ correlated weak domains | "Tackle {domainA} first — it's the foundation for {domainB}." |
| All domains ≥ 70% but uneven | "You're passing all domains. Equalize by reviewing your lowest: {domain}." |
| User below average on a domain | "Your {domain} accuracy is {x}% vs {avg}% platform average. Review {specific_topics}." |

### 3.5 API Design

```
GET /api/analytics/weakness-graph?studyId=cissp

Response:
{
  domains: [
    { domainId: "iam", accuracy: 0.61, platformAverage: 0.73, comparison: "below", questionsAttempted: 45, totalQuestions: 200 },
    { domainId: "sa", accuracy: 0.71, platformAverage: 0.68, comparison: "above", questionsAttempted: 38, totalQuestions: 180 },
    // ...
  ],
  coWeaknesses: [
    { domainA: "iam", domainB: "sa", strength: 0.68 },
    { domainA: "cry", domainB: "cns", strength: 0.52 }
  ],
  recommendations: [
    { type: "focus", domain: "iam", message: "IAM is your weakest domain at 61%..." },
    { type: "correlated", domains: ["iam", "sa"], message: "Users who struggle with IAM also..." }
  ]
}
```

---

## 4. Most Predictive Questions

### 4.1 Concept

Not all questions are created equal. Some questions are *diagnostic* — getting them right strongly predicts overall exam success. Getting them wrong predicts failure.

These are the questions with the highest **point-biserial correlation** (rpb): the correlation between getting this question right and scoring well on the overall exam.

### 4.2 What the User Sees

```
┌──────────────────────────────────────────────────────────────┐
│  🎯 High-Impact Questions — CISSP                            │
│                                                              │
│  These questions are the strongest predictors of exam        │
│  performance. Getting them right means you're on track.      │
│                                                              │
│  1. [Q: "An organization is implementing a Zero Trust        │
│      architecture. Which principle should be applied FIRST   │
│      to network segmentation?"]                              │
│     Domain: IAM | Difficulty: Hard | Your answer: ✅         │
│     📊 78% of users who got this right scored >75% overall  │
│                                                              │
│  2. [Q: "During a BIA, the CISO determines that the ERP     │
│      system has an RTO of 4 hours..."]                       │
│     Domain: SAM | Difficulty: Hard | Your answer: ❌         │
│     📊 Users who missed this have 45% lower pass probability│
│                                                              │
│  3. [Q: "Which cryptographic algorithm is MOST suitable     │
│      for..."]                                                │
│     Domain: CRY | Difficulty: Medium | Not attempted yet     │
│     📊 Top discriminating question in Cryptography domain   │
│                                                              │
│  [Take an exam with these questions →]                       │
└──────────────────────────────────────────────────────────────┘
```

### 4.3 Discrimination Power Metrics

| Metric | Threshold | Interpretation |
|--------|-----------|----------------|
| rpb ≥ 0.40 | Excellent discriminator | "Getting this right strongly predicts high scores" |
| rpb 0.25–0.39 | Good discriminator | "Moderately predictive" |
| rpb 0.10–0.24 | Weak discriminator | "Everyone gets this right or wrong regardless of ability" |
| rpb < 0.10 | Non-discriminating | Question doesn't differentiate strong from weak students — possibly too easy or too hard |

### 4.4 Computation

From `cross-user-analytics.md`:

```
rpb = (M_correct - M_total) / SD_total × √(p × (1-p))
```

Where:
- M_correct = mean exam score of users who got this question right
- M_total = mean exam score of all users who attempted this question
- SD_total = standard deviation of exam scores
- p = proportion who got it right

**Minimum sample:** 100 attempts per question for reliable rpb.

### 4.5 Product Value

| For the User | For Content Team |
|-------------|-----------------|
| "Focus on THESE questions" → efficient study | "These questions are gold" → never archive them |
| "You missed the 3 most predictive questions" → urgency signal | "These questions have rpb <0.1" → review/rewrite |
| Gamification: "You've mastered 8/10 key questions" | Quality metric: "What % of questions are discriminating?" |

### 4.6 API Design

```
GET /api/analytics/predictive-questions?studyId=cissp&limit=10

Response:
{
  questions: [
    {
      questionId: "q_abc123",
      text: "An organization is implementing...",   // first 100 chars
      domainId: "iam",
      difficulty: "hard",
      rpb: 0.52,
      pValue: 0.48,
      discriminationTier: "excellent",
      userAttempted: true,
      userCorrect: true,
      insight: "78% of users who got this right scored >75% overall"
    },
    // ...
  ],
  coverage: {
    attempted: 7,
    total: 10,
    correctOfAttempted: 5
  }
}
```

**K-threshold:** Only include questions with ≥ 100 attempts. Only show this feature if ≥ 10 questions meet the threshold for this cert.

---

## 5. Study Plan Generator

### 5.1 The Core Problem

Users don't know **what to study next**. They open the app and pick randomly — a 25-question practice exam on "all domains" at "all difficulties." This is like going to the gym and doing random exercises.

A study plan tells them: "Study X domain for Y minutes, then take a Z-type exam, then review wrong answers in W topic."

### 5.2 What the User Sees

```
┌──────────────────────────────────────────────────────────────┐
│  📋 Your CISSP Study Plan                                    │
│                                                              │
│  Target: Reach Readiness 80+ in 21 days                     │
│  Current: Readiness 62 → Need +18 points                    │
│                                                              │
│  This Week                                                   │
│  ─────────────────────────────────────────────────────       │
│  Mon │ IAM Domain Focus (25 Q, ~30 min)           [ Start ] │
│      │ Why: Your weakest domain at 61%                       │
│  ─────────────────────────────────────────────────────       │
│  Tue │ IAM + SAM Mixed Exam (30 Q, ~35 min)       [ Start ] │
│      │ Why: IAM correlates with SAM comprehension            │
│  ─────────────────────────────────────────────────────       │
│  Wed │ Spaced Review (20 Q, ~25 min)               [ Start ]│
│      │ Why: 34 questions are due for SM-2 review             │
│  ─────────────────────────────────────────────────────       │
│  Thu │ Hard Questions Only (20 Q, ~30 min)         [ Start ] │
│      │ Why: Hard question accuracy is 58% — needs work       │
│  ─────────────────────────────────────────────────────       │
│  Fri │ Full-Length Real Mix (150 Q, ~3 hr)          [ Start ]│
│      │ Why: Weekly full-length simulates real exam conditions │
│  ─────────────────────────────────────────────────────       │
│  Sat │ Review weakest questions from this week     [ Review ]│
│  Sun │ Rest or light daily challenge                         │
│                                                              │
│  📈 Following this plan, users like you typically reach      │
│     readiness 80+ in 2–3 weeks.                              │
│                                                              │
│  [Regenerate Plan]  [Adjust Schedule]                        │
└──────────────────────────────────────────────────────────────┘
```

### 5.3 Plan Generation Algorithm

```
Input:
  - User's PerformanceSummary (domain accuracy, question attempts, SM-2 state)
  - User's readiness score and component breakdown
  - Target readiness (default: 80)
  - Available days per week (default: 5)
  - Available minutes per day (default: 45)
  - Co-weakness correlations (from analytics)

Algorithm:

1. IDENTIFY GAPS
   - Weak domains (accuracy < 70%)
   - Low coverage domains (< 50% of questions attempted)
   - Hard question accuracy (if < 60%, needs hard-question practice)
   - Spaced review queue (questions past their SM-2 nextReviewAt)
   - Co-weaknesses (if weak in A, and A→B is correlated, include B)

2. PRIORITIZE
   Stack-rank activities by impact on readiness score:
   a) Weakest domain (highest weight × largest gap = most points)
   b) Spaced review (retention prevents score regression)
   c) Hard question practice (15% of readiness weight)
   d) Coverage expansion (15% of readiness weight)
   e) Full-length exam (calibration + time management)

3. ALLOCATE TIME
   For each available day:
   - Assign the highest-priority activity that fits the time budget
   - Alternate between "push" activities (new material) and "pull" 
     activities (review/retention)
   - Schedule 1 full-length exam per week
   - Schedule 1 spaced review session every 2 days

4. GENERATE EXAM CONFIGS
   Each plan entry maps to a concrete ExamConfig:
   - mode: domain_focus | weak_domains | spaced_review | real_mix | practice
   - domainIds: specific domains for domain_focus
   - difficulty: 'all' or 'hard' depending on the activity
   - questionCount: based on time budget (assume ~90 sec/question)
   - timeLimitMinutes: based on questionCount

5. OUTPUT
   Array of PlanEntry objects with day, activity, examConfig, rationale
```

### 5.4 Plan Data Structure

```typescript
interface StudyPlan {
  studyId: string;
  generatedAt: number;
  targetReadiness: number;
  currentReadiness: number;
  estimatedDaysToTarget: number;
  
  entries: PlanEntry[];
  
  // Personalization context
  weakDomains: string[];
  spReviewDue: number;           // questions due for spaced review
  hardQuestionAccuracy: number;
  questionCoverage: number;
}

interface PlanEntry {
  day: number;                    // 1, 2, 3...
  dayOfWeek: string;             // "Monday", "Tuesday"...
  activity: PlanActivity;
  rationale: string;             // "Your weakest domain at 61%"
  estimatedMinutes: number;
  examConfig: ExamConfig | null; // null for "rest" or "review" days
  completed: boolean;            // tracked locally or in user prefs
}

type PlanActivity =
  | { type: 'domain_focus'; domainId: string; domainName: string }
  | { type: 'weak_domains' }
  | { type: 'spaced_review'; questionsDue: number }
  | { type: 'hard_questions' }
  | { type: 'full_length_exam' }
  | { type: 'review_mistakes' }
  | { type: 'coverage_expansion'; domainId: string }
  | { type: 'rest' }
  | { type: 'daily_challenge' };
```

### 5.5 Plan Maturity Levels

| Level | Day | Features |
|-------|-----|----------|
| **V1** (Heuristic) | 14 | Uses user's own data only. Priority = weakest domain, then spaced review, then general practice. Static weekly template. |
| **V2** (Cross-User Informed) | 45 | Uses co-weakness to recommend correlated domain pairs. Uses "avg days to ready" from cohort data to set expectations. |
| **V3** (Adaptive) | 90+ | Plan re-generates automatically after each session. If user improved IAM by 10% this week, next week shifts focus to next-weakest. Uses "users like you" clusters: study cadence, speed, weak areas. |

### 5.6 API Design

```
POST /api/analytics/study-plan
Body: {
  studyId: "cissp",
  targetReadiness: 80,
  daysPerWeek: 5,
  minutesPerDay: 45
}

Response:
{
  plan: StudyPlan,
  insights: {
    estimatedDaysToTarget: 21,
    biggestGap: { domain: "iam", accuracy: 0.61, platformAverage: 0.73 },
    spReviewBacklog: 34,
    cohortBenchmark: "Users with similar starting readiness typically reach 80+ in 18–25 days"
  }
}
```

**Storage:** Plans are NOT stored in Firestore (they're cheap to regenerate). Plan completion tracking is stored in user preferences or local storage.

---

## 6. Additional Product Surfaces

### 6.1 Post-Exam Insights (Enhances Existing Exam Results)

After every exam, add a cross-user context panel:

```
┌──────────────────────────────────────────────────┐
│  📊 How You Compared                             │
│                                                  │
│  Your score: 76%                                 │
│  Platform average for this exam type: 68%        │
│  You outperformed 62% of users  ← percentile     │
│                                                  │
│  Questions you missed that most people get right: │
│  • Q12: "Which control..." (82% correct rate)    │
│  • Q19: "During a BIA..." (71% correct rate)     │
│                                                  │
│  Questions you got right that most people miss:   │
│  • Q7: "An auditor finds..." (only 38% correct)  │
│                                                  │
│  Your readiness: 76 → 78 (+2)  ↗ Improving      │
└──────────────────────────────────────────────────┘
```

**Data needed:** Question-level p-values (from `QuestionAnalytics`), exam score percentile (from `CohortAnalytics`).

### 6.2 "Most Missed" Per Domain

On the analytics page, per domain:

| Question | Correct Rate | Your Answer |
|----------|-------------|-------------|
| "Which access control model..." | 28% | ❌ |
| "During a BCP exercise..." | 35% | ✅ |
| "The MOST important factor..." | 41% | Not attempted |

**Data source:** `QuestionAnalytics` sorted by `pValue` ascending (hardest first) within a domain.

### 6.3 Daily Digest (Email / In-App Notification — Future)

```
Good morning! Here's your study snapshot:

🔥 Streak: 12 days
📊 Readiness: 74 (up from 71 last week)
⚠️ 8 questions due for spaced review
📋 Today's plan: IAM Domain Focus (25 Q, ~30 min)

[Start Today's Session →]
```

Requires email infrastructure (see `09-email-drip.md`).

### 6.4 Admin Content Dashboard

| Metric | Scope | Use |
|--------|-------|-----|
| Flagged questions (healthScore < 0.4) | Per cert | Immediate content review |
| Dead distractors | Per question | Rewrite specific options |
| Questions with rpb < 0.1 | Per cert | Low-value questions — archive or rewrite |
| Difficulty mismatch (authored ≠ calibrated) | Per cert | Recalibrate or rewrite |
| Report count by question | Global | Prioritize user-reported issues |
| Coverage gaps (objectives with < 5 questions) | Per cert | Content production priority |

---

## 7. Feature Rollout Plan

| Phase | Day | Feature | Dependencies |
|-------|-----|---------|-------------|
| **1** | 14 | Enhanced Analytics page (readiness breakdown, factor view) | User's own PerformanceSummary |
| **1** | 14 | Domain bar chart with weak/strong labels | User's own data |
| **2** | 21 | Post-exam cross-user insight panel | `QuestionAnalytics` p-values |
| **2** | 28 | Percentile ranking on dashboard | `CohortAnalytics` percentiles (K≥20) |
| **2** | 28 | "Most Missed" per domain | `QuestionAnalytics` sorted by pValue |
| **3** | 35 | Weakness Graph V2 (with co-weakness edges) | `analytics/correlations` |
| **3** | 42 | Study Plan Generator V1 (heuristic) | Readiness breakdown + SM-2 data |
| **3** | 45 | Most Predictive Questions list | rpb computation (weekly batch) |
| **4** | 60 | Study Plan V2 (cross-user informed) | Cohort data + co-weakness |
| **4** | 60 | Admin Content Dashboard | All `QuestionAnalytics` metrics |
| **5** | 90+ | Study Plan V3 (adaptive) | User-cluster data, sufficient history |
| **5** | 90+ | Self-reported pass/fail tracking | Survey UI + readiness snapshot |

---

## 8. i18n Keys Required

All user-facing text needs translation. Estimated new keys:

| Surface | Keys | Examples |
|---------|------|---------|
| Readiness Score | ~25 | band labels, recommendations, factor names |
| Weakness Graph | ~15 | domain comparison labels, correlation insights |
| Study Plan | ~30 | activity types, rationale templates, day labels |
| Most Predictive | ~10 | discrimination tier labels, insight templates |
| Post-Exam Insights | ~15 | comparison labels, "most missed" headers |
| Privacy/Opt-Out | ~8 | toggle label, explanation text, degraded-mode notice |
| **Total** | **~103** | |

Add to `src/messages/en.json` and `src/messages/pt-BR.json` under a new `analytics` namespace.

---

## 9. UX Principles for Insights

| Principle | Implementation |
|-----------|----------------|
| **No shame** | Never say "You're bad at X." Say "X is your biggest opportunity." |
| **Actionable** | Every insight includes a CTA button (Start exam, View plan, Review domain) |
| **Progressive disclosure** | Dashboard → summary. Click → detail. Don't overwhelm. |
| **Honest about data quality** | When K-threshold is low: "Based on limited data (45 users). This estimate will improve." |
| **Celebrate progress** | "Your readiness went from 62 to 76 this month. Keep going." |
| **Never compare individuals** | Only compare user to aggregate. Never "User A scored higher than User B." |
| **Default visible, detail on demand** | Show the big number (readiness). Expand for factor breakdown. |

---

## 10. Metrics for These Features

### 10.1 Feature Success Metrics

| Feature | Primary Metric | Target (Day 60) |
|---------|---------------|------------------|
| Readiness Score | % of active users who check readiness weekly | >40% |
| Weakness Graph | Click-through to domain-focused exam after viewing | >25% |
| Study Plan | Plan completion rate (% of plan entries completed) | >30% |
| Most Predictive | Exam starts from predictive questions page | >10% of exams |
| Post-Exam Insights | Engagement (scroll depth, time on page) | >60% scroll to bottom |

### 10.2 Business Metrics Impact

| Metric | Without Analytics | With Analytics |
|--------|-------------------|---------------|
| 7-day retention | Baseline | +15–20% (users have a reason to come back) |
| Exams per user/week | ~3 | ~5 (directed study increases engagement) |
| Pro conversion | — | Study Plan as a premium feature drives upgrades |
| Churn (monthly) | Baseline | -20% (progress visibility reduces "is this working?" doubt) |

---

## 11. What Becomes Premium (Pro-Only)

| Surface | Free | Pro |
|---------|------|-----|
| Readiness Score (raw number + band) | ✅ | ✅ |
| Readiness breakdown (7 factors) | ❌ | ✅ |
| Percentile ranking | ❌ | ✅ |
| Weakness Graph (personal domains) | ✅ | ✅ |
| Weakness Graph (co-weakness edges + recommendations) | ❌ | ✅ |
| Most Predictive Questions | ❌ | ✅ |
| Study Plan Generator | ❌ | ✅ |
| Post-Exam Insights (basic: score, readiness change) | ✅ | ✅ |
| Post-Exam Insights (cross-user: percentile, most-missed) | ❌ | ✅ |
| Admin Content Dashboard | Admin only | Admin only |

**Rationale:** Free users get enough to understand their readiness. Pro users get the *actionable* layer — what to do about it, how they compare, and a plan to improve. This is the strongest Pro conversion lever (see `paywall-rules.md`).

# Cross-User Analytics — Architecture & Aggregation Design

> Status: DRAFT
> Date: 2026-02-12
> Role: Staff Data Engineer
> Dependencies: `event-tracking-schema.md`, `privacy-anonymization.md`, `insights-features.md`

---

## 1. Executive Summary

Today every byte of data in ExamFlow lives under `users/{uid}/`. There are zero global aggregates, zero cross-user comparisons, zero data-calibrated difficulty scores. A CISSP candidate studying alone has no way to know whether their 72% domain accuracy is above or below average, whether the question they just missed is one that *everyone* misses, or whether their study pattern predicts pass readiness.

This spec designs a cross-user analytics layer that:
1. Collects granular answer events (what, who, when, how long, which option)
2. Aggregates them into anonymized global signals (difficulty, discrimination, correlation)
3. Powers product surfaces that no competitor can clone (Readiness Score, Weakness Graph, Study Plan)
4. Becomes a compounding data moat — every new user makes the analytics more accurate

---

## 2. Current State — What Exists

### 2.1 Data Already Captured (Per User)

| Data | Location | Granularity |
|------|----------|-------------|
| Selected option per question | `Exam.answers` → `Record<string, number \| null>` | Per exam, per question |
| Correct/incorrect | Derived from `answers` vs `questionCorrectAnswers` | Per exam |
| Domain accuracy | `PerformanceSummary.domainAccuracy` → `{ correct, total }` per domain | Cumulative per study |
| SM-2 per question | `PerformanceSummary.questionAttempts` → `QuestionAttemptRecord` | Per question (max 2000) |
| Time per exam | `Exam.timeSpentSeconds` | Per exam (wall-clock total) |
| Score per exam | `Exam.score` | Per exam |
| Streak & activity | `UserStats.recentDays` → `DailyRecord[]` | 180-day rolling |
| Badges earned | `UserStats.badges` | Lifetime |

### 2.2 What Is **NOT** Captured

| Missing | Impact |
|---------|--------|
| Time per question | Cannot identify "slow but correct" vs "fast and wrong" patterns |
| Which distractor was selected (stored but never aggregated globally) | Cannot compute distractor effectiveness |
| Cross-user question difficulty | All difficulty is author-assigned, never data-calibrated |
| Session-level behavior (pauses, abandons, review revisits) | Cannot model engagement or fatigue |
| Study plan adherence | Cannot measure which plans lead to passing |
| Feature usage events | Cannot optimize UX or identify drop-off |

### 2.3 Architectural Gap

```
CURRENT:
  User A ──▶ [users/A/exams/...]     ── no connection ──
  User B ──▶ [users/B/exams/...]     ── no connection ──
  User C ──▶ [users/C/exams/...]     ── no connection ──

TARGET:
  User A ──▶ [users/A/exams/...]  ──┐
  User B ──▶ [users/B/exams/...]  ──┼──▶ [analytics/events/...] ──▶ [analytics/aggregates/...]
  User C ──▶ [users/C/exams/...]  ──┘              │                        │
                                          anonymized event log       global aggregates
                                          (append-only)              (per-question, per-domain)
```

---

## 3. Aggregation Design

### 3.1 Per-Question Difficulty Calibration

**Goal:** Replace author-assigned difficulty with data-calibrated difficulty based on actual user performance.

#### 3.1.1 Metrics Per Question

| Metric | Formula | What It Tells You |
|--------|---------|-------------------|
| **p-value** (facility index) | `correct_attempts / total_attempts` | How easy the question is. p=0.9 → very easy. p=0.2 → very hard. |
| **Point-biserial correlation** (rpb) | `rpb = (M_correct - M_total) / SD_total × √(p × (1-p))` where M_correct = mean exam score of users who got this right | How well the question discriminates between strong and weak students. rpb > 0.3 = good. rpb < 0.1 = poor (random noise). |
| **Distractor effectiveness** | Per-option selection rate for incorrect options | Whether wrong options attract real misconceptions or are ignored |
| **Median time** | `median(timeSpentMs)` for all attempts | How much cognitive load the question demands |
| **Skip rate** | `skips / total_presentations` | Whether users avoid the question (confusing stem?) |

#### 3.1.2 Calibrated Difficulty Mapping

| p-value Range | Calibrated Difficulty | Action If Mismatched |
|---------------|-----------------------|---------------------|
| p ≥ 0.80 | Easy | If author said "hard" → flag for review |
| 0.40 ≤ p < 0.80 | Medium | Expected range for good questions |
| p < 0.40 | Hard | If author said "easy" → flag for review |
| p < 0.15 | Suspect | Question may be wrong, ambiguous, or poorly constructed → auto-flag |

**Minimum sample size:** 50 attempts before recalibration. Below 50 → keep author-assigned difficulty.

#### 3.1.3 Question Health Score

Combine metrics into a single health score for content monitoring:

```
health = (
    0.4 × discrimination_normalized     // rpb mapped to 0–1
  + 0.3 × distractor_effectiveness      // % of distractors that attract >5% selections
  + 0.2 × (1 - abs(p - target_p))       // how close to target difficulty band
  + 0.1 × (1 - skip_rate)               // low skip rate = clear stem
)
```

| Health Score | Status |
|-------------|--------|
| ≥ 0.7 | Healthy — no action needed |
| 0.4–0.7 | Review — may need distractor improvements |
| < 0.4 | Unhealthy — flag for rewrite or archive |

#### 3.1.4 Distractor Analysis

For each question, compute per-option metrics:

```
Question Q1 (correct answer: C)
┌─────────┬──────────────┬──────────────────────┐
│ Option  │ Selection %  │ Diagnosis            │
├─────────┼──────────────┼──────────────────────┤
│ A       │ 12%          │ ✅ Effective (>5%)   │
│ B       │ 32%          │ ✅ Strong distractor  │
│ C       │ 48%          │ Correct answer       │
│ D       │ 8%           │ ✅ Effective (>5%)   │
└─────────┴──────────────┴──────────────────────┘

Question Q2 (correct answer: B)
┌─────────┬──────────────┬──────────────────────┐
│ Option  │ Selection %  │ Diagnosis            │
├─────────┼──────────────┼──────────────────────┤
│ A       │ 73%          │ ⚠️ Most-selected but wrong — suspect  │
│ B       │ 14%          │ Correct answer (too few pick it!)     │
│ C       │ 2%           │ ❌ Dead distractor   │
│ D       │ 11%          │ ✅ Effective (>5%)   │
└─────────┴──────────────┴──────────────────────┘
→ Q2 flagged: either correct answer is wrong OR stem is misleading.
```

---

### 3.2 Pass-Readiness Prediction

**Goal:** Given a user's study history, predict the probability they would pass the real ISC2 exam.

#### 3.2.1 Features (Input Signals)

| Feature | Source | Weight Logic |
|---------|--------|-------------|
| **Domain coverage** | `PerformanceSummary.domainAccuracy` | All domains above threshold? |
| **Weighted domain accuracy** | Same, weighted by ISC2 exam domain weights | CISSP weighs Security & Risk Mgmt at 16% |
| **Recent exam scores** | Last 5 `ExamAttemptSummary.score` | Trend matters more than single score |
| **Score trend slope** | Linear regression on last 10 exam scores | Improving (+) vs plateauing (0) vs declining (-) |
| **Question coverage** | Unique questions attempted / total available | Has the user seen enough material? |
| **Hard question accuracy** | Correct rate on difficulty=hard questions | Differentiates "passes easy" from "passes hard" |
| **Spaced review performance** | SM-2 accuracy on reviewed questions | Retention signal |
| **Weak domain count** | Domains with accuracy < 70% | ISC2 can fail you on individual domains |
| **Time management** | Avg time per question vs allowed | Can they answer within time limits? |
| **Consistency** | Std deviation of exam scores | Erratic scores → not ready |

#### 3.2.2 Readiness Model (Day 1 — Heuristic)

No ML model needed initially. Use a weighted composite:

```
readiness_raw = (
    0.25 × weighted_domain_accuracy
  + 0.20 × recent_score_mean           // last 5 exams
  + 0.15 × hard_question_accuracy
  + 0.15 × question_coverage           // min(1.0, unique_attempted / total_available)
  + 0.10 × (1 - weak_domain_penalty)   // 0 if all domains ≥ 70%, scales with weak domains
  + 0.10 × trend_bonus                 // +0.1 if improving, 0 if flat, -0.1 if declining
  + 0.05 × time_management_score       // 1.0 if avg time < allowed, scales down
)

readiness = clamp(readiness_raw × 100, 0, 99)
```

**Readiness bands:**
| Score | Label | Recommendation |
|-------|-------|----------------|
| 0–39 | Not Ready | "Keep studying. Focus on weak domains first." |
| 40–59 | Building | "You're making progress. Target weak areas." |
| 60–74 | Getting Close | "Review weak domains and take more full-length exams." |
| 75–89 | Likely Ready | "You're in good shape. Polish weak spots and schedule your exam." |
| 90–99 | Highly Ready | "You're ready. Consider scheduling your exam this week." |

#### 3.2.3 Readiness Model (Day 90+ — Data-Calibrated)

Once we have pass/fail outcome data (users self-report exam results):

1. Collect self-reported pass/fail after real exam
2. Backfill: what was their readiness score at exam time?
3. Find the readiness threshold that maximizes `F1(predicted_pass, actual_pass)`
4. Adjust weights empirically
5. Eventually: train a logistic regression or gradient-boosted model

This requires ~100 self-reported outcomes. Realistic at Day 180+.

---

### 3.3 "Users Who Missed X Also Struggle With Y"

**Goal:** Identify question-to-question and domain-to-domain correlations that reveal hidden knowledge gaps.

#### 3.3.1 Question Co-Failure Matrix

For every pair of questions (Qi, Qj) that appear in the same exam:

```
co_fail(Qi, Qj) = users who got BOTH wrong / users who attempted BOTH
```

If `co_fail(Qi, Qj) > 0.4` and `co_fail` is significantly above `expected_co_fail` (product of individual failure rates), then Qi and Qj are correlated failures.

**Interpretation:** These questions test the same underlying misconception. If a user misses Qi, proactively surface Qj in their study plan.

**Computational note:** Full pairwise matrix over 8,600 questions is ~37M pairs — too large for Firestore. Compute over same-exam co-occurrence only (max ~150 questions per exam × 150 = 22,500 pairs per exam). Store only pairs with correlation > threshold.

#### 3.3.2 Domain Co-Weakness

Simpler version: for every pair of domains, compute how often users weak in domain A are also weak in domain B.

```
co_weakness(A, B) = users weak in BOTH / users weak in A
```

| Domain A (CISSP) | Strongest Co-Weakness |
|------------------|-----------------------|
| Security & Risk Mgmt | → Identity & Access Mgmt (policies drive access design) |
| Crypto | → Network Security (TLS/IPSec overlap) |
| Software Security | → Security Operations (vuln mgmt overlap) |

This is lightweight (33 domains → 528 pairs) and can be computed entirely in Firestore or at read-time.

#### 3.3.3 Prerequisite Graph

Combine co-failure data with domain ordering to build a prerequisite graph:

```
"If you're failing Asset Security (Domain 2), you may also struggle with 
 Identity & Access Management (Domain 5) because access policies are 
 built on top of data classification."
```

Day 1: Hardcode based on ISC2 CBK chapter ordering.
Day 60+: Validate/adjust using co-weakness data.

---

## 4. Data Architecture

### 4.1 Three-Layer Design

```
Layer 1: Raw Events (Append-Only)
    │     What: Every answer event, every exam start/complete, every feature use
    │     Where: Firestore events collection (Day 1) → BigQuery (Day 90+)
    │     Retention: 90 days in Firestore, indefinite in BigQuery
    │
    ▼
Layer 2: Aggregates (Computed)
    │     What: Per-question stats, per-domain cross-user stats, co-failure matrix
    │     Where: Firestore analytics/ collection
    │     Update: Incremental on write (counters) + daily batch (complex aggregates)
    │
    ▼
Layer 3: Insights (Derived)
    │     What: Readiness score, study plan, weakness graph, percentile ranks
    │     Where: Computed on-demand per user, cached in user profile
    │     Freshness: Recomputed on each exam submission
```

### 4.2 Firestore Collections (New)

| Collection | Document Key | Content | Write Pattern |
|------------|-------------|---------|---------------|
| `analytics/events/{eventId}` | Auto-generated | Raw answer event (see event schema spec) | Append on exam submit |
| `analytics/questions/{questionId}` | Marketplace question ID | `QuestionAnalytics` aggregate | Increment on exam submit |
| `analytics/domains/{certId}_{domainId}` | Compound key | `DomainAnalytics` aggregate | Increment on exam submit |
| `analytics/cohorts/{certId}` | Cert ID | `CohortAnalytics` (percentile tables, distributions) | Daily batch rebuild |
| `analytics/correlations/{certId}` | Cert ID | Co-failure pairs and domain co-weakness | Weekly batch rebuild |
| `analytics/meta/health` | Singleton | Pipeline health: last run, event count, error count | Updated by batch jobs |

### 4.3 Aggregate Document Schemas

#### `QuestionAnalytics`

```typescript
interface QuestionAnalytics {
  questionId: string;
  studyId: string;
  domainId: string;
  authorDifficulty: 'easy' | 'medium' | 'hard';

  // Core metrics (incremented in real-time)
  totalAttempts: number;
  correctAttempts: number;
  skipCount: number;
  totalTimeMs: number;          // sum of all attempt times

  // Per-option selection counts (incremented in real-time)
  optionSelections: Record<string, number>;  // { "0": 340, "1": 120, "2": 500, "3": 40 }

  // Computed fields (daily batch)
  pValue: number;                // correctAttempts / totalAttempts
  calibratedDifficulty: 'easy' | 'medium' | 'hard' | 'suspect';
  medianTimeMs: number;          // requires event scan or histogram
  healthScore: number;           // 0.0–1.0
  rpb: number;                   // point-biserial correlation
  distractorEffectiveness: number; // % of wrong options with >5% selection

  // Flags
  flaggedForReview: boolean;
  flagReason?: string;

  lastUpdatedAt: number;         // epoch ms
  sampleSize: number;            // = totalAttempts (for threshold checks)
}
```

#### `DomainAnalytics`

```typescript
interface DomainAnalytics {
  certId: string;
  domainId: string;
  domainName: string;

  // Aggregate across all users who attempted this domain
  totalAttempts: number;
  correctAttempts: number;
  uniqueUsers: number;           // approximate (HyperLogLog or counter)
  meanAccuracy: number;          // correctAttempts / totalAttempts
  
  // Score distribution for percentile ranking
  accuracyHistogram: Record<string, number>;  // { "0-10": 5, "10-20": 12, ... "90-100": 45 }

  // Question health summary
  totalQuestions: number;
  healthyQuestions: number;      // health > 0.7
  flaggedQuestions: number;      // health < 0.4

  lastUpdatedAt: number;
}
```

#### `CohortAnalytics`

```typescript
interface CohortAnalytics {
  certId: string;

  // Score distributions (for percentile ranking)
  examScoreHistogram: Record<string, number>;     // { "0-5": 3, "5-10": 7, ... }
  readinessHistogram: Record<string, number>;
  
  // Percentile lookup tables (precomputed for O(1) lookups)
  examScorePercentiles: Record<string, number>;   // { "50": 68, "75": 78, "90": 85, "95": 91 }
  readinessPercentiles: Record<string, number>;

  // Population stats
  totalUsers: number;
  activeUsers30d: number;
  totalExams: number;
  avgExamsPerUser: number;
  avgDaysToReady: number;        // mean days from first exam to readiness ≥ 75

  // Study pattern insights
  avgStudyDaysPerWeek: number;
  avgQuestionsPerDay: number;
  mostCommonExamMode: string;
  
  lastRebuiltAt: number;
}
```

### 4.4 Why Firestore First, BigQuery Later

| Factor | Firestore | BigQuery |
|--------|-----------|---------|
| **Cost at <1K users** | ~$0/month (free tier) | $0 (free tier) but more setup |
| **Cost at 10K users** | $5–20/month | $5–20/month |
| **Latency** | <100ms reads | 2–10 seconds (batch) |
| **Real-time counters** | ✅ Native (`increment()`) | ❌ Requires streaming insert + query |
| **Complex queries** | ❌ Limited | ✅ Full SQL |
| **Already in stack** | ✅ Yes | ❌ Not configured |
| **Maintenance** | Near-zero | Moderate (schema, permissions, exports) |

**Decision:** Start with Firestore for real-time counters + aggregates. Add BigQuery at Day 90+ when:
- You need complex queries (cohort analysis, funnel analysis, ML features)
- Event volume exceeds Firestore's cost-effective range (~1M events/month)
- You want to run ad-hoc SQL queries for product decisions

**BigQuery migration path:**
1. Enable Firestore BigQuery export extension (zero-code via Firebase console)
2. Export `analytics/events` collection to BigQuery dataset
3. Schedule daily SQL queries for complex aggregates → write results back to Firestore
4. Raw events in Firestore get TTL-deleted after 90 days; BigQuery retains indefinitely

---

## 5. Write Path — How Events Flow

### 5.1 On Exam Submission (Real-Time)

```
User submits exam
    │
    ▼
exam-service.ts → submitExam()
    │
    ├── (existing) Write exam doc, history, performance summary, stats
    │
    └── (NEW) analytics-writer.ts → writeExamAnalytics(result)
              │
              ├── 1. Batch-write answer events to analytics/events/
              │     (one doc per question answered — or batched into one doc per exam)
              │
              ├── 2. Increment analytics/questions/{qId} counters
              │     (totalAttempts, correctAttempts, optionSelections, totalTimeMs)
              │
              └── 3. Increment analytics/domains/{certId}_{domainId} counters
                    (totalAttempts, correctAttempts)
```

**Firestore batch write cost:** Exam with 25 questions = ~28 writes (25 question increments + 1 event doc + 1–2 domain increments). At $0.18/100K writes → negligible.

### 5.2 Daily Batch (Scheduled)

Run a Cloud Function or Vercel cron at 03:00 UTC daily:

```
1. Scan all analytics/questions/ docs where sampleSize ≥ 50
2. Compute: pValue, calibratedDifficulty, healthScore
3. Flag questions where calibrated ≠ authored difficulty by 2+ levels
4. Rebuild analytics/cohorts/{certId} percentile tables
5. Update analytics/meta/health
```

**Cost:** Reads all question aggregate docs (~8,600 reads) + writes updated ones. At $0.06/100K reads → <$0.01/day.

### 5.3 Weekly Batch (Scheduled)

Run Sunday 03:00 UTC:

```
1. Compute question co-failure matrix
   - Read recent events (last 7 days)
   - For each exam, compute pairwise failures for same-exam questions
   - Update analytics/correlations/{certId} with significant pairs
2. Compute rpb (point-biserial) for questions with ≥ 100 attempts
   - Requires correlating question outcome with total exam score
   - Read from events + exam history
3. Clean up old events (>90 days) from Firestore
```

---

## 6. Read Path — How Insights Are Served

### 6.1 Per-User Readiness Score

```
GET /api/analytics?studyId=cissp
    │
    ├── (existing) Fetch user's PerformanceSummary, exam history
    │
    └── (NEW) Compute readiness using heuristic model (§3.2.2)
              │
              ├── Read analytics/cohorts/cissp for percentile context
              │
              └── Return: { readiness: 72, percentile: 65, band: "Getting Close", ... }
```

Cached per-user for 5 minutes. Recomputed on exam submission.

### 6.2 Question-Level Insights (Admin)

```
GET /api/admin/analytics/questions?studyId=cissp&flagged=true
    │
    └── Query analytics/questions/ where studyId="cissp" and flaggedForReview=true
        → Return list of flagged questions with health scores + reasons
```

### 6.3 Weakness Graph (Per User)

```
GET /api/analytics/weakness-graph?studyId=cissp
    │
    ├── Read user's PerformanceSummary.domainAccuracy
    ├── Read analytics/correlations/cissp for co-weakness data
    │
    └── Return: {
          weakDomains: [...],
          correlatedWeaknesses: [
            { domainA: "crypto", domainB: "network", strength: 0.72 }
          ],
          recommendedOrder: ["crypto", "network", "iam"]
        }
```

---

## 7. Scaling & Cost Model

### 7.1 Event Volume Projections

| Users | Exams/Day | Questions/Day | Events/Day | Events/Month |
|-------|-----------|---------------|------------|-------------|
| 100 | 200 | 5,000 | 5,000 | 150,000 |
| 1,000 | 2,000 | 50,000 | 50,000 | 1,500,000 |
| 10,000 | 20,000 | 500,000 | 500,000 | 15,000,000 |
| 50,000 | 100,000 | 2,500,000 | 2,500,000¹ | 75,000,000¹ |

¹ At 50K users, Firestore event storage becomes expensive. BigQuery export required.

### 7.2 Firestore Cost at Scale

| Users | Writes/Month | Reads/Month | Storage | Total Cost |
|-------|-------------|-------------|---------|------------|
| 100 | 150K | 300K | <1 GB | **$0** (free tier) |
| 1,000 | 1.5M | 3M | ~2 GB | **$3–5** |
| 10,000 | 15M | 30M | ~10 GB | **$30–50** |
| 50,000 | 75M | 150M | ~50 GB | **$150–250** |

**Optimization strategies at scale:**
- Batch event writes (1 doc per exam with array of answers, not 1 doc per answer)
- Use Firestore `increment()` for real-time counters (no read-before-write)
- TTL-delete raw events after BigQuery export
- Cache hot aggregates (top-level cohort stats) in-memory on Vercel edge

### 7.3 BigQuery Cost (Day 90+)

| Component | Cost |
|-----------|------|
| Storage (1 year of events) | $0.02/GB/month → ~$1–5/month |
| Query (daily batch) | $5/TB scanned → ~$0.50–2/month |
| Streaming inserts | $0.01/200MB → ~$1–3/month |
| **Total** | **$3–10/month** |

BigQuery is cheaper than Firestore for raw event storage at scale and enables SQL queries that Firestore can't do.

---

## 8. Implementation Phases

### Phase 1 — Foundation (Day 7–21)

| Task | Days | Deliverable |
|------|------|-------------|
| Define event schema | 1 | `types/analytics.ts` |
| Build `analytics-writer.ts` | 2 | Write path: events + question counters |
| Integrate into `submitExam()` | 1 | Real-time event capture |
| Seed aggregate docs for existing marketplace questions | 1 | Initial `QuestionAnalytics` docs |
| Build daily batch function | 2 | p-value, difficulty calibration |
| Admin question health dashboard | 2 | Flagged questions, health scores |

### Phase 2 — User-Facing Insights (Day 21–45)

| Task | Days | Deliverable |
|------|------|-------------|
| Readiness Score computation | 2 | Heuristic model + API endpoint |
| Percentile ranking | 1 | Cohort analytics + UI placement |
| Weakness Graph | 3 | Domain co-weakness + API + UI |
| "Most Missed" per domain | 1 | API endpoint + exam review integration |

### Phase 3 — Advanced (Day 45–90)

| Task | Days | Deliverable |
|------|------|-------------|
| Co-failure matrix | 3 | Weekly batch + "also struggle with" recommendations |
| Study Plan Generator | 3 | Domain ordering + question selection + time estimates |
| Point-biserial correlation | 2 | Question discrimination scoring |
| Self-reported pass/fail collection | 1 | Post-exam survey + readiness calibration loop |

### Phase 4 — Scale (Day 90+)

| Task | Days | Deliverable |
|------|------|-------------|
| BigQuery export setup | 1 | Firestore extension + dataset |
| Migrate complex aggregates to SQL | 3 | Daily/weekly queries |
| Firestore event TTL | 1 | 90-day cleanup |
| ML readiness model (if data sufficient) | 5 | Logistic regression on pass/fail outcomes |

---

## 9. Success Metrics

| Metric | Target (Day 30) | Target (Day 90) |
|--------|-----------------|-----------------|
| Event capture rate | 100% of exam submissions | 100% |
| Question aggregate coverage | All marketplace questions with ≥ 1 attempt | All with ≥ 50 attempts recalibrated |
| Calibration accuracy | — | <10% of recalibrated questions flagged by experts as wrong |
| Readiness Score available | Yes (heuristic) | Yes (partially data-calibrated) |
| Percentile ranking available | Yes | Yes |
| Weakness Graph available | No | Yes |
| Study Plan available | No | Yes |
| Data moat depth | 150K events | 5M+ events |

# Pass-Rate Measurement — What You Can Claim and How

> Status: DRAFT
> Date: 2026-02-12
> Role: Customer Research + Data Ethics
> Dependency: `beta-program.md`, `testimonial-policy.md`

---

## 1. The Problem

Every cert prep company wants to say "94% of our users pass!" Most of those numbers are garbage.

Common tricks in the industry:

| Trick | Why It's Misleading |
|-------|-------------------|
| "94% pass rate" from self-reported survey (N=30) | Only happy users respond; survivorship bias |
| Counting only users who completed the course | Ignores drop-offs — the denominator is manipulated |
| "First-time pass rate" but not defining "first-time" | Could mean "first attempt on our platform" vs "first real exam attempt" |
| Comparing to ISC2's average pass rate without controlling for anything | Your users might be more motivated/experienced to begin with |
| Making up the number entirely | Unfortunately, common |

**Our approach:** Only claim what we can prove. Be transparent about methodology. Start small.

---

## 2. What ExamFlow Can Actually Measure

### 2.1 Things We Can Measure Directly (In-Product Data)

| Metric | Source | Confidence |
|--------|--------|------------|
| Practice exam score trend | `exams` collection — score field over time | High (objective) |
| Score improvement (delta) | First exam score vs. last exam score per user | High |
| Domain score improvement | Per-domain accuracy over successive exams | High |
| Engagement depth | Exams taken, questions answered, modes used | High |
| Time invested | Session duration, exam count, study days | High |
| Plateau detection | When scores stop improving | High |

### 2.2 Things We CANNOT Measure Directly

| Metric | Why We Can't | What We Can Do Instead |
|--------|-------------|----------------------|
| Actual certification exam pass/fail | ISC2/CompTIA doesn't share results with us | Ask users to self-report (see §3) |
| Causal attribution ("ExamFlow caused them to pass") | Users study with multiple tools; no control group | Never claim causation — only correlation |
| Comparison to ISC2 global pass rates | Different populations, different preparation levels | State this clearly in any comparison |

### 2.3 The Honesty Hierarchy

From most defensible to least:

```
1. "Users improved their practice scores by X% on average"
   → Measured directly from our data ✅

2. "Users who completed ≥ 30 exams saw Y% score improvement"
   → Measured directly, with clear criteria ✅

3. "Z% of users who self-reported their exam result said they passed"
   → Self-reported, disclosed as such ⚠️ (use carefully)

4. "Our users have a W% pass rate"
   → Self-reported + survivorship bias ❌ (don't claim without heavy caveats)

5. "ExamFlow guarantees you'll pass"
   → Unsubstantiated guarantee ❌ (never claim this)
```

---

## 3. Self-Reported Pass Rate Collection

### 3.1 How to Ask

After a user marks an exam date or reports passing their cert, send:

```
Subject: Did you pass? (We'd love to know — either way!)

Hi [Name],

We noticed your [CISSP] exam date was around [date].

If you've taken it, we'd really appreciate knowing how it went — 
pass or fail. Either outcome helps us understand how well ExamFlow 
prepares people.

This is completely optional and confidential. We'll never share your 
individual result.

○ I passed! 🎉
○ I didn't pass this time
○ I haven't taken it yet
○ I'd rather not say

[Submit]

Either way, congrats on putting in the work.
[your name]
```

### 3.2 Critical Rules for Self-Reported Data

| Rule | Reasoning |
|------|-----------|
| Ask **everyone**, not just happy users | If you only ask people you think passed, you get selection bias |
| Accept "fail" gracefully | "Thanks for sharing. Here's what your analytics show for areas to focus on. You'll get it next time." |
| Never shame or out someone who failed | This data is strictly confidential |
| Track response rate | If only 30% respond, the data is heavily biased |
| Always disclose that it's self-reported | "Based on self-reported results from N users" |

### 3.3 Data Schema

```typescript
interface CertExamOutcome {
    uid: string;
    certId: string;                        // "cissp", "cc", "sec_plus"
    examDate: string;                      // approximate
    result: 'passed' | 'failed' | 'not_taken' | 'prefer_not_say';
    attempt: number;                       // 1 = first attempt, 2 = retake
    reportedAt: Timestamp;
    // Context for correlation
    examsTakenOnPlatform: number;
    avgScoreAtReportTime: number;
    studyDurationWeeks: number;
}

// Path: users/{uid}/certOutcomes/{outcomeId}
// Aggregation: Anonymized + aggregated for pass-rate calculation
```

---

## 4. What You CAN Claim (With Evidence)

### 4.1 Tier 1 — Strong Claims (Directly Measurable)

These claims come from your own product data. They're defensible.

| Claim Format | Example | Evidence Required |
|-------------|---------|-------------------|
| "Users improve practice scores by X% over Y weeks" | "Beta users improved practice scores by 18% over 6 weeks" | Avg(lastExamScore - firstExamScore) for users with ≥ 10 exams |
| "Users who completed ≥ N exams scored X% higher" | "Users who completed ≥ 30 exams scored 22% higher than their first attempt" | Cohort analysis, N ≥ 20 |
| "X questions answered by beta users" | "12,000+ practice questions answered" | Sum from exams collection |
| "Average score of X% across all practice exams" | "Average practice exam score: 74%" | Aggregate from exams collection |

**Minimum sample size:** N ≥ 20 users for any average claim. Below that, use individual testimonials instead.

### 4.2 Tier 2 — Cautious Claims (Self-Reported, Disclosed)

| Claim Format | Example | Evidence Required |
|-------------|---------|-------------------|
| "X% of users who reported their result said they passed" | "87% of users who reported their CISSP result passed" | Self-reported data; response rate disclosed; N ≥ 15 respondents |
| "X out of Y users passed on first attempt" | "13 of 15 users who reported results passed CISSP" | Absolute numbers (more honest than percentages for small N) |

**Always include the disclosure:**

```
"Based on self-reported exam results from [N] ExamFlow users. 
Response rate: [X]%. Not all users reported their outcomes. 
ExamFlow does not receive exam results from ISC2."
```

### 4.3 Tier 3 — Never Claim

| Claim | Why Not |
|-------|---------|
| "94% pass rate" (without context) | Misleading without methodology disclosure |
| "Guaranteed to pass" | Unsubstantiated. Possibly illegal (FTC). |
| "Higher pass rate than ISC2 average" | Uncontrolled comparison. Your users self-selected — they may be more motivated. |
| "ExamFlow users pass at 2x the industry rate" | Causal claim with no control group. |
| "Best pass rate of any CISSP prep tool" | Unverifiable comparative claim. |

---

## 5. Statistical Minimums

### 5.1 Sample Size Guidelines

| Claim Type | Minimum N | Confidence Level |
|-----------|-----------|-----------------|
| Average score improvement (practice exams) | N ≥ 20 | Internal data, directly measured |
| Self-reported pass rate (percentage) | N ≥ 30, response rate ≥ 50% | Reasonable to display with disclosure |
| Self-reported pass rate (absolute numbers) | N ≥ 10 | "13 of 15 users who reported..." |
| Comparative claim (vs. baseline) | N ≥ 50 + statistical test | Don't attempt until you have meaningful volume |

### 5.2 When to Use Percentages vs. Absolute Numbers

```
N < 20:  Use absolute numbers. "13 of 15 beta users who reported..."
N = 20-50: Use percentages with N disclosed. "87% (N=15)"
N > 50:  Use percentages with methodology footnote.
```

Small samples + percentages = misleading. "100% of our users passed!" (N=2) is technically true and completely useless.

---

## 6. Score Improvement Measurement

### 6.1 Methodology

```
For each user with ≥ 10 exams in a study:

  baseline = avg(score of first 3 exams)
  final    = avg(score of last 3 exams)
  improvement = final - baseline

  Report: mean(improvement) across all qualifying users
  Also report: median(improvement), standard deviation, N
```

### 6.2 Why First/Last 3, Not First/Last 1

- A single exam score is noisy (question selection varies)
- Averaging 3 smooths out variance
- More honest representation of actual improvement

### 6.3 Controls

| Variable | How We Handle It |
|----------|-----------------|
| Users who only took 1-2 exams | Exclude from improvement claims (min 10 exams) |
| Users who were already scoring >90% | Report separately — they had less room to improve |
| Users who studied with other tools simultaneously | Acknowledge this in methodology: "Users may have used other study materials" |
| Time period | Normalize by weeks, not exam count, when possible |

### 6.4 Example Defensible Claim

```
"ExamFlow beta users who completed ≥ 10 practice exams improved 
their average score from 62% to 78% over 6 weeks (N=24, median 
improvement: 14 percentage points).

Methodology: Score improvement = average of last 3 exam scores 
minus average of first 3 exam scores. Users may have used other 
study materials during this period."
```

---

## 7. Dashboard for Internal Tracking

### 7.1 Pass-Rate Tracking Spreadsheet

```
| User   | Cert  | Exams Taken | First 3 Avg | Last 3 Avg | Δ   | Self-Report | Attempt |
|--------|-------|-------------|-------------|------------|-----|-------------|---------|
| User A | CISSP | 34          | 58%         | 79%        | +21 | Passed      | 1       |
| User B | CISSP | 22          | 65%         | 72%        | +7  | Passed      | 1       |
| User C | CISSP | 15          | 61%         | 68%        | +7  | Failed      | 1       |
| User D | CC    | 28          | 70%         | 88%        | +18 | Passed      | 1       |
| User E | CISSP | 8           | 55%         | 60%        | +5  | No response | —       |
```

### 7.2 Aggregate Metrics to Track

| Metric | Formula | Current Value |
|--------|---------|---------------|
| Avg score improvement (≥ 10 exams) | mean(Δ) for qualifying users | TBD |
| Median score improvement | median(Δ) | TBD |
| Self-reported pass rate | passed / (passed + failed) | TBD |
| Self-report response rate | (passed + failed + not_taken) / total_asked | TBD |
| Users reaching ≥ 80% practice score | count(last 3 avg ≥ 80%) / total | TBD |
| Correlation: exams taken ↔ pass rate | statistical test | TBD |

---

## 8. When to Start Making Public Claims

### 8.1 Phase 1: Beta (N < 30)

**What to say on website:**

```
"Join 40+ cybersecurity professionals practicing for CISSP, CC, 
and Security+. Beta users improved their practice scores by an 
average of X percentage points."
```

**What not to say:**

- No pass-rate claims (sample too small)
- No "X% pass rate" (not enough self-reports)
- No comparison to industry averages

### 8.2 Phase 2: Post-Launch (N = 30-100)

Start reporting absolute numbers:

```
"23 of 27 users who reported their CISSP exam results passed on 
their first attempt.*

* Based on self-reported results. Not all users reported outcomes."
```

### 8.3 Phase 3: Scale (N > 100)

Consider:

- Building an automated outcome tracking system (in-app prompt)
- Running proper before/after analysis with statistical significance
- Publishing a methodology page on the website

```
/results — "How ExamFlow Users Perform"

- Average practice score improvement: +16 points (N=150)
- Self-reported first-attempt pass rate: 84% (N=87, response rate: 58%)
- Methodology: [link to full methodology]
```

---

## 9. Red Lines

| Never Do This | Why |
|---------------|-----|
| Claim a pass rate from < 10 self-reports | Statistically meaningless. One person changes the percentage by 10+%. |
| Compare to ISC2 global pass rates without disclaimers | Your users are self-selected and more motivated — the comparison is unfair. |
| Use the word "guarantee" | You do not control the exam. No one can guarantee a pass. |
| Suppress negative outcomes | If 3 of 15 users failed, report "12 of 15 passed" — don't pretend it was 15/15. |
| Cherry-pick time periods | Don't calculate improvement only for the month where scores looked best. |
| Round up aggressively | 84.2% → "84%" is fine. 84.2% → "nearly 90%" is not. |
| Use practice exam scores as "pass rates" | Practice scores ≠ real exam scores. Never conflate them. |

---

## 10. Competitor Claims to Study

For reference — how competitors market, and what to learn:

| Competitor | Claim | How They Support It | Our Assessment |
|------------|-------|-------------------|----------------|
| Boson | "Highly rated" | User reviews on own site | No pass-rate claim — honest |
| Pocket Prep | "90%+ pass rate (ISC2)" | Self-reported survey | Likely survivorship bias, but at least disclosed |
| CCCure | "Highest pass rate" | No methodology published | Dubious |
| Kaplan | "Thousands of successful candidates" | Vague — no specific numbers | Safe but uninformative |

**Our positioning:** Be the honest one. In a market full of inflated claims, transparency is a competitive advantage with experienced buyers (CISOs, L&D managers) who've been burned by BS metrics before.

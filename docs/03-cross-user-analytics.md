# 03 — Cross-User Analytics

---

## Problem Statement

Every user's performance data is completely siloed. The system doesn't learn from its user base. There is no "85% of users who got this wrong also struggled with Domain 3" insight. No difficulty calibration based on real pass/fail rates. No readiness predictor.

Cross-user analytics is the only data moat that grows with scale and cannot be replicated by a new entrant with zero users. It is the difference between "practice exam tool" and "intelligent certification preparation platform."

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Questions with calibrated difficulty | 80%+ of question bank by Day 60 |
| Readiness predictor accuracy | ±10% of actual exam outcomes within 6 months |
| User engagement with "compare" features | 30%+ of active users view cross-user insights weekly |
| Data points collected | 100,000+ answer events by Day 90 |

---

## MVP Scope (2 weeks)

### 1. Anonymous Aggregation Pipeline

**New Firestore collection:** `analytics/global/questionStats/{questionId}`

```
{
  questionId: string,
  totalAttempts: number,
  totalCorrect: number,
  correctRate: number,           // totalCorrect / totalAttempts
  commonWrongAnswer: string,     // most-selected wrong option label
  avgTimeSeconds: number,        // average time spent on this question
  difficultyCalibrated: 'easy' | 'medium' | 'hard',  // computed from correctRate
  updatedAt: Timestamp
}
```

**Update trigger:** On exam submission (`submitExam`), fire-and-forget update to global question stats. Use Firestore increment operations (no read required).

**Privacy:** No user identifiers stored in global analytics. Only aggregate counts.

### 2. Difficulty Auto-Calibration

| Correct Rate | Calibrated Difficulty |
|-------------|----------------------|
| > 80% | easy |
| 40–80% | medium |
| < 40% | hard |

- Recalibrate after 50+ attempts per question (statistical significance threshold)
- Surface calibrated difficulty alongside author-assigned difficulty in admin view
- Use calibrated difficulty for `real_mix` mode question selection

### 3. "How Others Did" Post-Exam Insight

After exam completion, show:
- "You scored 78%. Average score on this exam configuration: 72%."
- Per-question: "65% of users got this right" (shown in exam review)
- Per-domain: "Your Domain 3 score: 60%. Average: 55%."

### 4. Readiness Score v1

Formula: weighted average of domain mastery scores, calibrated against cross-user pass/fail correlation.

Display: "Exam Readiness: 74% — You're close. Focus on Domain 3 and Domain 5."

Simple version (Day 1): average of per-domain accuracy weighted by domain question count.
Smart version (Phase 2): logistic regression on cross-user data correlating domain scores with self-reported exam outcomes.

---

## Phase 2 Scope (6–8 weeks)

1. **"Users who struggled here also struggled with..."** — Question-pair correlation matrix. When user gets Q wrong, surface related weak questions from correlated topics.
2. **Study plan generator** — Based on cross-user data: "Users who passed CISSP spent an average of 45 hours studying. You've studied 12 hours. Here's your recommended 4-week plan."
3. **Cohort benchmarking** — "You're in the top 25% of CISSP candidates this month." Motivational + social proof.
4. **Pass prediction model** — Collect self-reported exam outcomes ("Did you pass?"). Build logistic regression: predict pass probability from domain scores, time studied, question volume. Requires 200+ self-reported outcomes for statistical validity.
5. **Content effectiveness scoring** — Which questions are most predictive of exam success? Rank questions by correlation with self-reported pass/fail. Prioritize high-predictive questions in study modes.

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Privacy concerns (GDPR, user trust) | 🔴 High | Only aggregate data. No PII in analytics collection. Add privacy policy section explaining anonymized analytics. Allow opt-out. |
| Small sample size produces bad calibration | 🟡 Medium | Minimum 50 attempts before recalibration. Show "Not enough data" for low-volume questions. |
| Readiness score gives false confidence | 🔴 High | Prominent disclaimer: "This is an estimate, not a guarantee." Don't show predictive % until model validated with real outcomes. |
| Firestore cost from high-frequency writes | 🟡 Medium | Batch question stats updates per exam (one write per question in a batch). Consider moving to a daily aggregation job if costs spike. |
| Gaming the system (users answer randomly to skew data) | 🟢 Low | Filter out exams with <30% score and <10 seconds avg per question as likely spam. |

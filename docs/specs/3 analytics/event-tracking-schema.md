# Event Tracking Schema

> Status: DRAFT
> Date: 2026-02-12
> Role: Staff Data Engineer
> Dependency: `cross-user-analytics.md` (architecture), `privacy-anonymization.md` (what gets anonymized)

---

## 1. Design Principles

| Principle | Rationale |
|-----------|-----------|
| **Append-only** | Events are facts that happened. Never mutate or delete (except TTL cleanup). |
| **Denormalized** | Each event carries enough context to be useful without joins. Duplicating `studyId` and `domainId` on every event is cheaper than joining later. |
| **User-dissociated** | Events carry an `anonId` (hashed UID), not raw UID. See `privacy-anonymization.md`. |
| **Batched per exam** | One Firestore document per exam submission (containing an array of answer events), not one doc per question. Reduces write costs by ~25x. |
| **Schema-versioned** | Every event carries `schemaVersion` so old events are parseable after schema changes. |

---

## 2. Event Taxonomy

### 2.1 Categories

| Category | Events | Write Frequency | Privacy Sensitivity |
|----------|--------|-----------------|---------------------|
| **Answer** | `answer.submitted` | Every exam submit (batch) | Medium (performance data) |
| **Exam** | `exam.started`, `exam.completed`, `exam.abandoned` | Every exam lifecycle event | Medium |
| **Study** | `study.created`, `study.imported`, `study.deleted` | Infrequent | Low |
| **Engagement** | `session.started`, `feature.used`, `daily_challenge.completed` | Frequent | Low |
| **Milestone** | `badge.earned`, `streak.achieved`, `readiness.threshold` | Infrequent | Low |
| **Feedback** | `question.reported`, `exam.rated`, `pass_fail.reported` | Infrequent | Medium |

### 2.2 Which Events Drive Which Aggregates

| Aggregate | Required Events |
|-----------|----------------|
| Question difficulty calibration | `answer.submitted` (correct, timeMs, selectedOption) |
| Distractor effectiveness | `answer.submitted` (selectedOption per question) |
| Readiness Score | `exam.completed` (score, domainScores) + `answer.submitted` (for hard-question accuracy) |
| Percentile ranking | `exam.completed` (score) |
| Co-failure matrix | `answer.submitted` (correct per question, within same exam) |
| Weakness Graph | `answer.submitted` (domainId, correct) aggregated per user |
| Study Plan ordering | Co-failure + domain accuracy + question coverage |
| Content health monitoring | `answer.submitted` + `question.reported` |
| Engagement metrics | `session.started`, `feature.used`, `daily_challenge.completed` |
| Pass-rate calibration | `pass_fail.reported` + historical readiness snapshots |

---

## 3. Event Schemas

### 3.1 `exam.answers_batch` — Primary Analytics Event

This is the highest-value event. One document per exam submission, containing all answer data.

```typescript
interface ExamAnswersBatchEvent {
  // Identity
  eventType: 'exam.answers_batch';
  schemaVersion: 2;
  eventId: string;                // auto-generated doc ID
  anonId: string;                 // HMAC-SHA256(uid, secret) — NOT raw uid
  
  // Exam context
  examId: string;                 // obfuscated exam ID (not the Firestore doc path)
  studyId: string;                // cert identifier (e.g., "cissp")
  examMode: ExamMode;             // 'practice' | 'weak_domains' | 'real_mix' | etc.
  configDifficulty: string;       // 'all' | 'easy' | 'medium' | 'hard'
  questionCount: number;
  timeLimitMinutes: number;
  
  // Exam outcome
  score: number;                  // 0–100
  timeSpentSeconds: number;
  completedAt: number;            // epoch ms

  // Per-question answers (the core data)
  answers: ExamAnswerEvent[];

  // Domain-level outcomes
  domainScores: Array<{
    domainId: string;
    correct: number;
    total: number;
  }>;

  // Metadata
  createdAt: number;              // server timestamp (epoch ms)
  platform: 'web';               // future: 'ios' | 'android'
  locale: string;                 // 'en' | 'pt-BR'
}

interface ExamAnswerEvent {
  questionId: string;             // marketplace question ID
  domainId: string;               // primary domain
  difficulty: 'easy' | 'medium' | 'hard';  // author-assigned
  selectedOption: number | null;  // 0-based index or null (skipped)
  isCorrect: boolean;
  timeMs: number;                 // time spent on this question (ms)
  isFirstAttempt: boolean;        // first time user ever saw this question
  // NOTE: correctOptionIndex is NOT included — derivable from question data
}
```

**Firestore path:** `analytics/events/{eventId}`

**Write trigger:** `exam-service.ts → submitExam()` → `analytics-writer.ts`

**Size estimate:** 25-question exam ≈ 3–4 KB per document.

### 3.2 `exam.started`

```typescript
interface ExamStartedEvent {
  eventType: 'exam.started';
  schemaVersion: 1;
  eventId: string;
  anonId: string;
  studyId: string;
  examMode: ExamMode;
  questionCount: number;
  timeLimitMinutes: number;
  configDifficulty: string;
  createdAt: number;
}
```

**Purpose:** Track exam starts to compute abandonment rate (`starts - completes = abandons`). Also useful for understanding which modes are most popular.

### 3.3 `exam.abandoned`

```typescript
interface ExamAbandonedEvent {
  eventType: 'exam.abandoned';
  schemaVersion: 1;
  eventId: string;
  anonId: string;
  studyId: string;
  examMode: ExamMode;
  questionsAnswered: number;     // how far they got
  totalQuestions: number;
  timeSpentSeconds: number;
  createdAt: number;
}
```

**Purpose:** Identify UX problems. If 30% of `real_mix` exams are abandoned after 5 questions, the difficulty calibration may be wrong.

### 3.4 `question.reported`

```typescript
interface QuestionReportedEvent {
  eventType: 'question.reported';
  schemaVersion: 1;
  eventId: string;
  anonId: string;
  questionId: string;
  studyId: string;
  domainId: string;
  reason: 'wrong_answer' | 'ambiguous' | 'outdated' | 'duplicate' | 'offensive' | 'other';
  freeText?: string;             // optional user explanation (max 500 chars, stripped of PII)
  createdAt: number;
}
```

**Purpose:** Crowdsourced quality signal. Any question with ≥ 3 unique reports → auto-flag for review.

### 3.5 `pass_fail.reported`

```typescript
interface PassFailReportedEvent {
  eventType: 'pass_fail.reported';
  schemaVersion: 1;
  eventId: string;
  anonId: string;
  studyId: string;
  passed: boolean;
  examDate: string;              // "2026-02-10" (user-reported, not server-derived)
  readinessAtExamTime: number;   // snapshot of their readiness score when they report
  totalExamsTaken: number;       // snapshot of their exam count
  createdAt: number;
}
```

**Purpose:** Ground truth for readiness model calibration. "User had readiness 78 and passed" → data point for model training.

### 3.6 `daily_challenge.completed`

```typescript
interface DailyChallengeCompletedEvent {
  eventType: 'daily_challenge.completed';
  schemaVersion: 1;
  eventId: string;
  anonId: string;
  studyId: string;
  score: number;                 // 0–100
  questionsAnswered: number;     // should be DAILY_CHALLENGE_COUNT (5)
  createdAt: number;
}
```

### 3.7 `feature.used`

```typescript
interface FeatureUsedEvent {
  eventType: 'feature.used';
  schemaVersion: 1;
  eventId: string;
  anonId: string;
  feature: FeatureName;
  metadata?: Record<string, string | number>;  // feature-specific context
  createdAt: number;
}

type FeatureName =
  | 'exam_review'            // user reviewed exam results
  | 'note_created'           // user created a question note
  | 'analytics_viewed'       // user viewed analytics page
  | 'pomodoro_started'       // user started pomodoro timer
  | 'study_plan_generated'   // user requested study plan (future)
  | 'weakness_graph_viewed'  // user viewed weakness graph (future)
  | 'marketplace_browsed'    // user browsed marketplace
  | 'marketplace_imported'   // user imported a study
  | 'export_used'            // user exported questions
  | 'share_image_created';   // user created share image
```

**Purpose:** Product analytics — which features drive retention, which are dead.

### 3.8 `session.started`

```typescript
interface SessionStartedEvent {
  eventType: 'session.started';
  schemaVersion: 1;
  eventId: string;
  anonId: string;
  platform: 'web';
  locale: string;
  referrer?: string;            // sanitized — domain only, no full URL
  createdAt: number;
}
```

**Purpose:** DAU/MAU tracking, locale distribution, referrer analysis.

---

## 4. Event Properties — Master Reference

### 4.1 Common Properties (All Events)

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `eventType` | string | ✅ | Namespaced event name (`category.action`) |
| `schemaVersion` | number | ✅ | Schema version (increment on breaking changes) |
| `eventId` | string | ✅ | Unique event ID (Firestore auto-ID) |
| `anonId` | string | ✅ | Anonymized user identifier (see privacy spec) |
| `createdAt` | number | ✅ | Server timestamp (epoch ms) |
| `platform` | string | ❌ | `'web'` (future: mobile) |
| `locale` | string | ❌ | User's locale |

### 4.2 Answer Event Properties

| Property | Type | Required | Why Collected |
|----------|------|----------|---------------|
| `questionId` | string | ✅ | Join key to question metadata |
| `domainId` | string | ✅ | Domain-level aggregation without needing question lookup |
| `difficulty` | string | ✅ | Compare author-assigned vs user performance |
| `selectedOption` | number \| null | ✅ | Distractor analysis (which wrong answers attract selections) |
| `isCorrect` | boolean | ✅ | Core metric for p-value and accuracy |
| `timeMs` | number | ✅ | Cognitive load measurement, cheating detection |
| `isFirstAttempt` | boolean | ✅ | First-attempt accuracy is a purer signal than repeat accuracy |

### 4.3 What Is **NOT** Collected

| Not Collected | Why |
|---------------|-----|
| Raw user ID (UID) | Privacy — use `anonId` instead |
| IP address | Not needed for product analytics, privacy risk |
| User agent string | Not needed — we're web-only |
| Exact question text | Already in question metadata, no need to duplicate |
| Free-form study notes | PII risk, not needed for analytics |
| Keystrokes or mouse movements | Excessive, privacy risk, not useful |
| Screen recordings | Far too much data, not useful |
| Chat/support messages | Not an analytics event |

---

## 5. Event Volume & Storage Estimates

### 5.1 Volume Per User Action

| Action | Events Generated | Estimated Size |
|--------|-----------------|----------------|
| Complete 25-question exam | 1 `exam.answers_batch` (3–4 KB) | 4 KB |
| Start exam | 1 `exam.started` (0.3 KB) | 0.3 KB |
| Abandon exam | 1 `exam.abandoned` (0.3 KB) | 0.3 KB |
| Report question | 1 `question.reported` (0.3 KB) | 0.3 KB |
| Complete daily challenge | 1 `daily_challenge.completed` (0.2 KB) | 0.2 KB |
| Use a feature | 1 `feature.used` (0.2 KB) | 0.2 KB |
| Start session | 1 `session.started` (0.2 KB) | 0.2 KB |

### 5.2 Volume Projections (Monthly)

| Users | Exams/Month | Event Docs/Month | Storage/Month |
|-------|------------|-------------------|---------------|
| 100 | 6,000 | ~12,000 | ~50 MB |
| 1,000 | 60,000 | ~120,000 | ~500 MB |
| 10,000 | 600,000 | ~1,200,000 | ~5 GB |

### 5.3 Firestore Cost Implications

| Users | Writes (events) | Writes (aggregates) | Total Writes | Cost/Month |
|-------|----------------|--------------------|--------------|-----------:|
| 100 | 12K | 6K | 18K | $0.00 |
| 1,000 | 120K | 60K | 180K | $0.32 |
| 10,000 | 1.2M | 600K | 1.8M | $3.24 |

Aggregate writes are cheaper because we use `increment()` — no read-before-write. Each exam submission increments ~25 question counters + ~5 domain counters = ~30 writes.

---

## 6. Schema Evolution Rules

### 6.1 Versioning Strategy

- Every event has `schemaVersion: number`
- Breaking changes → increment version, keep old version parseable
- Non-breaking additions → add field as optional, same version

### 6.2 Breaking vs Non-Breaking

| Change | Breaking? | Action |
|--------|-----------|--------|
| Add optional field | No | Add to schema, old events still valid |
| Add required field | Yes | New version. Backfill old events or handle null in readers. |
| Rename field | Yes | New version. Keep old field as alias during transition. |
| Remove field | Yes | New version. Stop writing, keep in old events. |
| Change field type | Yes | New version. |

### 6.3 Migration Example

```
// Schema V1: timeMs was on the batch event
{ schemaVersion: 1, timeSpentSeconds: 120 }

// Schema V2: timeMs moved to per-answer
{ schemaVersion: 2, answers: [{ timeMs: 4800 }, ...] }

// Reader logic:
if (event.schemaVersion === 1) {
  // estimate per-question time: total / questionCount
} else {
  // use per-question timeMs
}
```

---

## 7. Write Path Implementation Notes

### 7.1 Where the Write Happens

```
src/services/exam-service.ts → submitExam()
    │
    └── After all existing writes (exam doc, history, stats, performance),
        fire-and-forget:
        │
        └── analyticsWriter.writeExamAnalytics({
              uid,              // will be hashed to anonId inside the writer
              examId,
              studyId,
              config,
              score,
              domainScores,
              answers,          // Record<string, number | null>
              correctAnswers,   // Record<string, number>
              questionDomains,  // Record<string, string>
              questionDifficulties, // Record<string, string> — need to pass this
              timeSpentSeconds,
              completedAt,
              perQuestionTimeMs // Record<string, number> — NEW: must capture in ExamSession
            })
```

### 7.2 Missing Data: Per-Question Time

The current `ExamSession` component tracks total time but NOT per-question time. Implementation required:

1. In `ExamSession.tsx`: track `questionStartTime` and `questionEndTime` per question navigation
2. On submit, pass `perQuestionTimeMs: Record<string, number>` to the API
3. The API passes it through to the analytics writer
4. Fallback: if per-question time is missing (old clients), estimate as `totalTime / questionCount`

**This is the only client-side change required for Phase 1.**

### 7.3 Fire-and-Forget Pattern

Analytics writes must NEVER block the exam submission response. Use the existing fire-and-forget pattern (same as `recalculateAverageScore` and `recordActivity`):

```typescript
// Inside submitExam, after the main batch commit:
writeExamAnalytics(analyticsPayload).catch(err => {
  logger.error('Analytics write failed', { examId, error: err.message });
  // Swallow the error — analytics failure must not affect user experience
});
```

### 7.4 Idempotency

If `writeExamAnalytics` is called twice for the same exam (retry, duplicate request), it should not double-count.

**Strategy:** Use `examId` as a deduplication key. Before incrementing question counters, check if `analytics/events/{examId}` already exists. If yes, skip.

Alternatively: use Firestore transactions for the increment step. But this adds latency and cost. Simpler: accept minor double-counting (<0.1% of events) and correct in daily batch.

---

## 8. Aggregate Update Path

### 8.1 Real-Time Increments (On Write)

For each question in the exam:

```typescript
// analytics/questions/{questionId}
admin.firestore().doc(`analytics/questions/${questionId}`).set({
  totalAttempts: increment(1),
  correctAttempts: increment(isCorrect ? 1 : 0),
  totalTimeMs: increment(timeMs),
  [`optionSelections.${selectedOption}`]: increment(1),
  lastUpdatedAt: serverTimestamp(),
  sampleSize: increment(1),
  // Static fields (set only on first write)
  studyId,
  domainId,
  authorDifficulty: difficulty,
}, { merge: true });
```

For each domain touched:

```typescript
// analytics/domains/{studyId}_{domainId}
admin.firestore().doc(`analytics/domains/${studyId}_${domainId}`).set({
  totalAttempts: increment(questionsInDomain),
  correctAttempts: increment(correctInDomain),
  lastUpdatedAt: serverTimestamp(),
  // Static fields
  certId: studyId,
  domainId,
}, { merge: true });
```

### 8.2 Daily Batch Recomputation

Fields that can't be incrementally maintained:

| Field | Why Batch | Computation |
|-------|-----------|-------------|
| `pValue` | Division (correct/total) | `correctAttempts / totalAttempts` |
| `calibratedDifficulty` | Derived from pValue | Threshold mapping |
| `medianTimeMs` | Median requires sorted data | Approximate from histogram or scan recent events |
| `healthScore` | Composite formula | See `cross-user-analytics.md` §3.1.3 |
| `rpb` | Requires exam-level correlation | Scan events, correlate per-question outcome with exam score |
| `distractorEffectiveness` | % of options with >5% share | `count(options with share > 0.05) / totalWrongOptions` |
| Percentile tables | Full distribution rebuild | Scan all exam scores, compute percentile breakpoints |

---

## 9. Event Lifecycle

```
Event Created (exam submit)
    │
    ├── Real-time: increment question/domain counters
    │
    ├── Daily batch: read for pValue/health computation
    │
    ├── Weekly batch: read for co-failure/rpb computation
    │
    ├── Day 90+: exported to BigQuery (Firestore extension)
    │
    └── Day 90+ TTL: deleted from Firestore after 90 days
        (BigQuery retains indefinitely)
```

---

## 10. Testing & Validation

### 10.1 Unit Tests for Analytics Writer

| Test | Input | Expected |
|------|-------|----------|
| Happy path: 25-question exam | Full exam result | 1 event doc + 25 question increments + domain increments |
| Skipped questions | `selectedOption: null` | `isCorrect: false`, skip not counted as attempt for distractor analysis |
| Idempotency | Same examId twice | No double-counting |
| Missing perQuestionTimeMs | Old client | Falls back to `totalTime / questionCount` |
| Anonymization | Raw UID passed | `anonId` in event, no raw UID anywhere |

### 10.2 Integration Tests for Aggregates

| Test | Setup | Expected |
|------|-------|----------|
| pValue computation | 100 events: 70 correct, 30 wrong | pValue = 0.70 |
| Difficulty recalibration | Author said "easy", pValue = 0.25 | calibratedDifficulty = "hard", flagged |
| Distractor dead option | Option D selected by 1% of users | Warning: dead distractor |
| Percentile ranking | 100 exam scores inserted | 50th percentile accurate ±2 points |

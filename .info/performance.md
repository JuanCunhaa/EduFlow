# Performance Audit — ISC2 Training Platform

**Auditor Role:** Performance Engineer  
**Date:** 2026-02-11  
**Scope:** Firestore queries, API response sizes, client rendering, bundle, caching, CSS paint

---

## P0 — Critical Performance Issues

### 1. `submitExam` double-reads the same exam document
**Location:** [src/services/exam-service.ts](src/services/exam-service.ts) — `submitExam`  
**Problem:** `getExam(uid, examId)` fetches the exam doc once, then a raw `db.doc(...).get()` fetches the **same document again** to read `questionCorrectAnswers` and `questionDomains`.  
**Impact:** Every exam submission wastes 1 Firestore read. Under load, this doubles billing.  
**Fix:** Return internal fields from the first read or refactor `getExam` to expose raw doc data when called internally.

### 2. `recalculateAverageScore` blocks the submit response
**Location:** [src/services/exam-service.ts](src/services/exam-service.ts) — `submitExam`  
**Problem:** `await recalculateAverageScore(uid)` is awaited in the submit critical path. This function:
- Reads up to 100 docs from `users/{uid}/examHistory`
- Writes a denormalized average to the user doc  

**Impact:** Adds 200–500ms latency to every exam submission.  
**Fix:** Fire-and-forget like `recordActivity` and `awardBadge` already do — append `.catch(() => {})`.

---

## P1 — High-Impact Performance Issues

### 3. `fetchQuestionPool` reads up to 500 full documents without projection
**Location:** [src/services/question-service.ts](src/services/question-service.ts)  
**Problem:** `fetchLimit = Math.min(config.questionCount * 5, 500)` reads full `Question` documents including `text`, `options`, `explanation`, `tags`. Only `id`, `correctOptionIndex`, `domainIds`, `difficulty` are needed by the selection engine.  
**Impact:** Transfers ~500× more data than needed from Firestore. Increases latency + egress cost.  
**Fix:** Use `.select('correctOptionIndex', 'domainIds', 'difficulty')` on the pool query, then fetch full docs only for selected questions.

### 4. `listExams` returns full exam objects including `answers` maps
**Location:** [src/services/exam-service.ts](src/services/exam-service.ts) — `listExams`  
**Problem:** Returns entire `Exam` documents including `answers` (up to 150 key-value pairs per exam), `questionIds`, `domainScores`. A list of 20 exams transfers ~3,000 answer entries to the client.  
**Fix:** Use `.select()` to return only `id`, `studyId`, `status`, `score`, `startedAt`, `completedAt`, `config` for list views.

### 5. ExamSession timer re-renders entire component every second
**Location:** [src/components/exams/ExamSession.tsx](src/components/exams/ExamSession.tsx)  
**Problem:** `setTimeRemaining` fires every 1000ms, causing full re-render of:
- All option buttons (4 per question)
- Navigator dots (150 buttons for a full exam)
- Progress bar, question text, entire layout

**Impact:** 150+ DOM elements re-rendered every second for the entire exam duration. Causes visible jank on low-end devices.  
**Fix:** Extract timer into a separate `<Timer />` component. Memoize navigator dots and question body since they depend only on `currentIndex` and `answers`, not `timeRemaining`.

---

## P2 — Moderate Performance Issues

### 6. Missing Cache-Control headers on key routes
| Route | Current | Should Be |
|-------|---------|-----------|
| `GET /api/stats` | None | `private, max-age=30, stale-while-revalidate=120` |
| `GET /api/exams/[examId]` | None | `private, max-age=10, stale-while-revalidate=60` |

**Impact:** Stats are fetched on every dashboard mount. Without cache headers, browser can't reuse responses during rapid navigation.

### 7. `backdrop-filter: blur(20px)` on sticky exam bars
**Location:** [src/app/globals.css](src/app/globals.css) — `.glass-panel`  
**Problem:** Used on sticky top and bottom bars in ExamSession. `blur(20px)` on sticky elements forces GPU re-composite on every scroll frame.  
**Impact:** Scroll jank during exams, especially on mobile devices.  
**Fix:** Reduce to `blur(12px)` or replace with solid semi-transparent background on sticky elements. Add `will-change: transform` to promote to GPU layer.

### 8. `getAnalytics` re-aggregates data that PerformanceSummary already stores
**Location:** [src/services/exam-service.ts](src/services/exam-service.ts) — `getAnalytics`  
**Problem:** Reads up to 50 completed exams and loops over all exams × domains to aggregate scores. `PerformanceSummary` already maintains this data incrementally.  
**Fix:** Read `PerformanceSummary` directly instead of re-aggregating from raw exams. Falls back to current approach only if summary doesn't exist.

### 9. Questions default limit is 100 with no table virtualization
**Location:** [src/app/api/questions/route.ts](src/app/api/questions/route.ts) — default limit 100  
**Location:** [src/components/questions/QuestionTable.tsx](src/components/questions/QuestionTable.tsx) — renders all rows as `<tr>` elements  
**Impact:** 100–200 DOM rows with hover listeners, icons, and conditional classes. No windowing.  
**Fix:** Default to 25–50 per page. Add virtualization (`tanstack-virtual`) for larger datasets.

---

## P3 — Low-Priority Performance Issues

### 10. Client-side text search breaks pagination
**Location:** [src/services/question-service.ts](src/services/question-service.ts) — `listQuestions`  
**Problem:** Firestore returns `limit + 1` docs, then JavaScript filters by search text. If 101 docs are fetched and only 3 match, `hasMore` is false — but matching docs beyond the 101 exist.  
**Impact:** Search results are silently incomplete.  
**Fix:** Requires Firestore full-text search (Algolia/Typesense) or increased over-fetch ratio.

### 11. Missing composite index for `isQuestionInActiveExam`
**Location:** [src/services/question-service.ts](src/services/question-service.ts)  
**Query:** `status == 'in_progress' + array-contains questionId`  
**Not in:** [firestore.indexes.json](firestore.indexes.json)  
**Fix:** Add composite index. 5-minute fix.

### 12. No `next/dynamic` for conditional dialogs
**Components:** `StudyFormDialog`, `ExamConfigForm`, `ImportDialog`  
**Impact:** All loaded in initial bundle despite only rendering on user action.  
**Fix:** `next/dynamic(() => import('./Dialog'), { ssr: false })`.

### 13. `glow-pulse` infinite paint animation
**Location:** [src/app/globals.css](src/app/globals.css)  
**Problem:** `box-shadow` keyframe runs 60fps indefinitely, triggering paint on every frame.  
**Fix:** Use `opacity` animation instead (compositor-only, no paint).

### 14. `ambient-glow` with `blur(80px)` on 600×600 element
**Location:** [src/app/globals.css](src/app/globals.css)  
**Impact:** Expensive initial paint, especially on mobile. Mitigated by `position: fixed`.  
**Fix:** Reduce to `blur(40px)` or use a pre-blurred PNG.

---

## Firestore Read Cost Summary

| Operation | Reads per Call | Frequency | Monthly Estimate (active user) |
|-----------|---------------|-----------|-------------------------------|
| `submitExam` | 2 (exam) + N (questions via resume) + 100 (recalculate) + 1 (stats) | ~5/day | ~15,000 reads/month |
| `createExam` | 1 (study) + 500 (question pool) + 1 (performance) | ~5/day | ~7,500 reads/month |
| `resumeExam` | 1 + N questions | ~10/day | ~1,500 reads/month |
| `listExams` | up to 20 | ~10/day | ~6,000 reads/month |
| Rate limit check | 1 transaction | ~20/day | ~600 reads/month |

**Estimated total per active user:** ~30,000 reads/month.  
**Firestore free tier:** 50,000 reads/day.  
**Verdict:** Safe for single-user or small cohort. Would hit limits at ~50 concurrent daily users without the P1 optimizations.

---

## Caching Architecture Assessment

| Layer | Status | Notes |
|-------|--------|-------|
| Static assets | ✅ `max-age=31536000, immutable` | Correctly configured in next.config.ts |
| API responses | ⚠️ Partial | 3 of 5 GET routes have `Cache-Control` |
| SWR client | ✅ Well-configured | `revalidateOnFocus: false`, `dedupingInterval` 30–60s |
| Server-side | ❌ None | No in-memory cache for hot data |
| Firestore SDK | ⚠️ Network-only | Admin SDK has no built-in cache |

---

## Performance Optimization Priority Matrix

```
                HIGH IMPACT
                    │
    ┌───────────────┼───────────────┐
    │ P1-QUICK      │ P0-NOW        │
    │ Cache headers  │ Double read   │
    │ .select()     │ Blocking avg  │
    │               │               │
LOW ├───────────────┼───────────────┤ HIGH
EFFORT│ P3-LATER     │ P1-PLAN      │ EFFORT
    │ Dynamic import │ Timer extract │
    │ glow-pulse fix │ Virtualization│
    │               │ Analytics rw  │
    └───────────────┼───────────────┘
                    │
                LOW IMPACT
```

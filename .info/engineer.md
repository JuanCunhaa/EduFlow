# Engineering Maturity Audit — ISC2 Training Platform

**Auditor Role:** Staff Engineer / Code Reviewer  
**Date:** 2026-02-11  
**Scope:** Code quality, patterns, type safety, testing, API design, concurrency  
**Verdict:** Does this look like senior code? **Yes.** Overall Grade: **A-**

---

## Executive Summary

This codebase demonstrates senior-level engineering discipline: clean error hierarchy, structured logging with correlation IDs, Zod validation at every API boundary, zero `any` casts, atomic batch writes for critical operations, and a well-layered architecture. The primary gaps are in test coverage (services layer untested), a few concurrency race conditions, and some DRY violations in the 690-line exam service.

---

## 1. Error Handling — Grade: A

### Strengths
- **Clean error hierarchy** in [src/lib/errors.ts](src/lib/errors.ts): `AppError` → HTTP errors (`NotFoundError`, `ConflictError`) → domain errors (`ExamAlreadyCompletedError`, `QuestionNotInExamError`). Every error carries `statusCode`, `code`, and optional `details`.
- **Centralized catch** in [src/lib/api-middleware.ts](src/lib/api-middleware.ts): `AppError` instances emit structured JSON with correct HTTP status. Unknown errors become 500s with no stack leak.
- **Domain errors are semantic** — map directly to business rules. No magic status codes scattered in route handlers.

### Issues

| Severity | Issue | Location |
|----------|-------|----------|
| P2 | Fire-and-forget `.catch(() => {})` on `recordActivity`/`awardBadge` swallows errors silently. Should log at `warn` level. | [exam-service.ts](src/services/exam-service.ts) — `submitExam` |
| P3 | `validateDomainIds` throws `new Error(...)` instead of a domain-specific error. Inconsistent with the hierarchy. | [study-service.ts](src/services/study-service.ts) |
| P3 | `getUser().catch(() => null)` in share-image swallows transient Firebase auth errors. | [share-image/route.tsx](src/app/api/share-image/route.tsx) |

---

## 2. Logging — Grade: A

### Strengths
- **Structured JSON logger** with correlation IDs, route, userId, duration, and error serialization — production-ready for Cloud Logging / Datadog.
- **Request-scoped loggers** via `createRequestLogger()` with automatic duration measurement.
- **Stack traces stripped in production.** No sensitive data (passwords, tokens, answers) in any log.

### Issues

| Severity | Issue | Location |
|----------|-------|----------|
| P3 | `LOG_LEVEL` cast without validation — typo silently breaks log filtering. | [logger.ts](src/lib/logger.ts) |
| P3 | IP logging may be PII in GDPR jurisdictions — document retention policy. | [scraping-guard.ts](src/lib/scraping-guard.ts) |

---

## 3. Type Safety — Grade: A-

### Strengths
- **Zero `any` casts** across the entire codebase. Exceptional discipline.
- **Zod schemas as source-of-truth** with `z.infer<>` exports — no manual type duplication.
- **Structural answer stripping** via `Omit<Question, 'correctOptionIndex' | 'explanation'>`.
- **Discriminated unions** for `ExamStatus` and `ExamMode`.

### Issues

| Severity | Issue | Location |
|----------|-------|----------|
| P2 | `as unknown as Record<string, unknown>` double cast to delete internal fields — bypasses type safety. | [exam-service.ts](src/services/exam-service.ts) — `getExamForClient` |
| P2 | Raw Firestore data force-cast: `examData.questionCorrectAnswers as Record<string, number>` without runtime validation. | [exam-service.ts](src/services/exam-service.ts) — `submitExam` |
| P3 | `as { seconds: number }` repeated in `formatDate` / `formatTimeAgo` — should be a type guard. | [format.ts](src/lib/format.ts) |

---

## 4. Code Organization — Grade: A-

### Strengths
- **Clean layered architecture:** `app/api/` → `services/` → `lib/` with no reverse dependencies.
- **Thin route handlers** — all business logic in services.
- **Shared middleware** via `withAuth` / `withPublicRoute` — zero boilerplate in routes.
- **Types centralized** in [src/types/index.ts](src/types/index.ts).
- **Path builders:** `examsPath(uid)`, `questionsPath(uid)` — consistent Firestore access.

### Issues

| Severity | Issue | Location |
|----------|-------|----------|
| P2 | Exam service at 690 lines with 12+ exports — analytics, scoring, resume, review, history. Could split `exam-analytics-service.ts`. | [exam-service.ts](src/services/exam-service.ts) |
| P2 | `updatePerformanceSummary` and `buildPerformanceSummaryUpdate` share ~60 lines of duplicated domain accuracy logic. | [performance-service.ts](src/services/performance-service.ts) |
| P3 | `formatTimestamp` in exam-service duplicates `formatDate` from format.ts. | [exam-service.ts](src/services/exam-service.ts) vs [format.ts](src/lib/format.ts) |
| P3 | `FieldValue` dynamically imported in question-service but statically imported in exam-service. Inconsistent. | [question-service.ts](src/services/question-service.ts) |

---

## 5. Naming Conventions — Grade: A

**Consistent**, **descriptive**, **professional.** No Hungarian notation, no abbreviation abuse.

- `camelCase` for functions/variables, `PascalCase` for types/interfaces.
- `UPPER_SNAKE_CASE` for constants: `DECAY_HALF_LIFE_DAYS`, `WEAK_DOMAIN_THRESHOLD`, `GRACE_PERIOD_SECONDS`.
- Path builders: `examsPath`, `statsPath`, `questionsPath`.
- Descriptive names: `getExamForClient`, `sanitizeQuestionsForExam`, `buildPerformanceSummaryUpdate`.

One minor issue: variable `q` in question-service shadows between Firestore query and array callback parameter.

---

## 6. Testing — Grade: B+

### Strengths
- **Statistical tests** in [exam-engine.test.ts](src/lib/__tests__/exam-engine.test.ts): randomized strategies tested 20–50 times asserting probabilistic properties. Correct approach for stochastic code.
- **Comprehensive validator tests** in [validators.test.ts](src/lib/__tests__/validators.test.ts): XSS stripping, boundary values, defaults, optional fields.
- **Full error hierarchy coverage** in [errors.test.ts](src/lib/__tests__/errors.test.ts).
- **Specific assertions** — `.toEqual`, `.toHaveLength`, `.toBeInstanceOf`. No vague `.toBeTruthy()`.

### Critical Coverage Gaps

| Priority | Missing Tests | Impact |
|----------|--------------|--------|
| **P1** | Services layer: `exam-service`, `stats-service`, `performance-service` — zero tests for ~60% of business logic | High — submit flow, scoring, streak logic untested |
| **P1** | API route integration tests — no tests for `withAuth` middleware, CSRF, error responses | High — regression risk on auth changes |
| **P2** | Rate limiting + scraping guard — untested security infrastructure | Medium |
| **P3** | Format utilities, logger, hooks | Low |

---

## 7. API Design — Grade: A

### Strengths
- **Consistent response shape:** `{ data: T }` success, `{ error, code?, details? }` failure.
- **Correct HTTP semantics:** 201 for creation, 200 for reads, 400/401/404/409/429 mapped.
- **Cache-Control** on read endpoints with `stale-while-revalidate`.
- **Scraping guards** on list + review endpoints.
- **CSRF** via Content-Type check on mutations.

### Minor Issues

| Severity | Issue | Location |
|----------|-------|----------|
| P3 | PUT for goals does two separate writes (non-atomic). | [stats/route.ts](src/app/api/stats/route.ts) |
| P3 | `share-image` doesn't use `withAuth` middleware — breaks consistency. | [share-image/route.tsx](src/app/api/share-image/route.tsx) |

---

## 8. Dead Code — Grade: A (very clean)

| Item | Location | Action |
|------|----------|--------|
| `getMissedQuestionIds` — exported but never imported | [exam-engine.ts](src/lib/exam-engine.ts) | Remove |
| Deprecated types: `Certification`, `domain`, `domainNumber` | [types/index.ts](src/types/index.ts) | Remove after migration verification |
| Deprecated `certificationSchema` | [validators.ts](src/lib/validators.ts) | Remove after migration verification |
| Legacy `examHistory` Firestore rule | [firestore.rules](firestore.rules) | Remove after migration verification |

No commented-out code blocks. No unreachable branches.

---

## 9. Defensive Programming — Grade: A-

### Strengths
- **Zod on every API boundary** with `safeParse`.
- **HTML stripping** via `stripHtml` — defense-in-depth against stored XSS.
- **Server-side timer validation** with configurable grace period.
- **Answer reconciliation** — server is source of truth, client answers merged only for valid question IDs.
- **Correct answer stripping** enforced at service level.

### Issues

| Severity | Issue | Location |
|----------|-------|----------|
| P2 | `getExamForClient` uses blacklist (delete internal fields) instead of whitelist (pick safe fields). New internal fields could leak. | [exam-service.ts](src/services/exam-service.ts) |
| P2 | Biased shuffle: `sort(() => Math.random() - 0.5)` violates sort comparator transitivity. Use Fisher-Yates from exam-engine. | [stats-service.ts](src/services/stats-service.ts) |
| P3 | `isQuestionInActiveExam()` defined but never called on single-question GET endpoint. | [question-service.ts](src/services/question-service.ts) |

---

## 10. Concurrency & Race Conditions — Grade: B+

### Strengths
- **Batch writes** in `submitExam` — exam, profile, history, study, performance committed atomically.
- **Transaction-based** rate limiting and performance summary updates.

### Critical Issues

| Severity | Issue | Location |
|----------|-------|----------|
| **P1** | `recordActivity` does read-then-write **without a transaction**. Two concurrent exam submissions corrupt streak/total counters. | [stats-service.ts](src/services/stats-service.ts) |
| P2 | `awardBadge` also read-then-write without transaction. Concurrent calls could add duplicates. | [stats-service.ts](src/services/stats-service.ts) |
| P2 | `submitExam` reads exam twice (status check + internal fields). Narrow race window for double-scoring. | [exam-service.ts](src/services/exam-service.ts) |
| P3 | `createQuestion`/`deleteQuestion` counter updates are non-atomic (unlike `importQuestions` which uses batches). | [question-service.ts](src/services/question-service.ts) |

---

## Per-File Grade Summary

| File | Grade | File | Grade |
|------|-------|------|-------|
| [errors.ts](src/lib/errors.ts) | A | [exam-service.ts](src/services/exam-service.ts) | B+ |
| [logger.ts](src/lib/logger.ts) | A | [performance-service.ts](src/services/performance-service.ts) | A- |
| [api-middleware.ts](src/lib/api-middleware.ts) | A | [stats-service.ts](src/services/stats-service.ts) | B+ |
| [validators.ts](src/lib/validators.ts) | A | [question-service.ts](src/services/question-service.ts) | A- |
| [exam-engine.ts](src/lib/exam-engine.ts) | A- | [study-service.ts](src/services/study-service.ts) | A |
| [fetcher.ts](src/lib/fetcher.ts) | A | [types/index.ts](src/types/index.ts) | A |
| [rate-limit.ts](src/lib/rate-limit.ts) | A | [middleware.ts](src/middleware.ts) | A- |
| [scraping-guard.ts](src/lib/scraping-guard.ts) | A- | All API routes (avg.) | A |

---

## Top 5 Engineering Actions (Priority Order)

1. **Wrap `recordActivity`/`awardBadge` in Firestore transactions** — highest-risk concurrency bug, corrupts streak data on concurrent submissions.
2. **Add service-layer tests** — 60% of business logic has zero coverage. Minimum: exam submit flow, scoring, streak logic.
3. **Whitelist approach in `getExamForClient`** — replace delete-blacklist with explicit field pick to prevent future data leaks.
4. **Atomic counter updates** in `createQuestion`/`deleteQuestion` — use batch writes like `importQuestions` already does.
5. **Replace biased shuffle** in stats-service with Fisher-Yates from exam-engine.

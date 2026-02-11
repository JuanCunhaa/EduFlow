# Security Audit — ISC2 Training Platform

**Auditor Role:** Staff Security Engineer  
**Date:** 2026-02-11  
**Scope:** Full codebase — auth, data isolation, API surface, client exposure, dependencies

---

## Threat Model Snapshot

| Asset | Threat | Current Protection | Risk |
|-------|--------|--------------------|------|
| Correct answers (correctOptionIndex) | Scraping/cheating | Stripped from list + exam endpoints, review rate-limited | Low |
| Explanations (Explanation object) | Bulk extraction | Stripped from list + exam endpoints | Low |
| Session cookies | Hijacking/replay | httpOnly, Secure, SameSite=lax, 7-day expiry | Low |
| User data isolation | Cross-user access | uid-scoped Firestore paths + rules | Very Low |
| Firestore Admin SDK | Privilege escalation | Server-only, never exposed to client | Very Low |
| Rate limits | Bypass via distributed IPs | Firestore-backed (uid-scoped), not IP-based | Medium |
| Question bank | Automated scraping | Multi-layer scraping guard (fingerprinting + burst) | Low |

---

## Attack Scenarios

### Scenario 1 — Answer extraction during active exam
**Vector:** Student opens DevTools, calls `GET /api/questions/[questionId]` for each question in their active exam.  
**Current defense:** Single-question endpoint has scraping guard (20/min, 120/hr, threshold 60).  
**Gap:** No check for `isQuestionInActiveExam(uid, questionId)` on the single-question GET — the service function exists but is never called. The student could peek answers for 20 questions/minute before hitting the rate limit.  
**Severity:** **P1**

### Scenario 2 — Bulk answer extraction via review endpoint
**Vector:** Attacker completes many short exams (10 questions each) and reviews each one to extract all question-answer pairs.  
**Current defense:** Review endpoint has scraping guard (10/min, 60/hr, threshold 60). Exam creation rate-limited (5/min, failClosed).  
**Assessment:** At 5 exams/min × 10 questions = 50 answers/min before creation rate limit. Review rate limit adds a second gate. Combined defenses are adequate for personal SaaS.  
**Severity:** **P3** — Acceptable risk for single-user platform.

### Scenario 3 — Session cookie theft
**Vector:** XSS or man-in-the-middle.  
**Current defense:** httpOnly (no JS access), Secure flag in production, CSP headers, HTML stripping in all validators.  
**Assessment:** Well-defended. The only XSS vector would be if a validator is bypassed, but Zod + stripHtml is applied consistently.  
**Severity:** **P3**

### Scenario 4 — CSRF on mutation endpoints
**Vector:** Malicious site submits form POST to `/api/exams`.  
**Current defense:** `withAuth` checks `Content-Type: application/json` on POST/PUT/PATCH. Browsers won't send JSON Content-Type from a cross-origin `<form>`.  
**Assessment:** Effective CSRF protection without tokens.  
**Severity:** **P3** — Well-handled.

---

## Findings

### P0 — Critical / Production Risk

None found. The codebase has no critical security vulnerabilities.

### P1 — High Impact

**P1-1: Single-question GET does not check active exam membership**  
`GET /api/questions/[questionId]` returns full data including `correctOptionIndex`. The function `isQuestionInActiveExam()` exists in `question-service.ts` but is never called. A student taking an exam could open another tab and fetch answers for each question ID (visible in the exam payload as `questionIds` on the client-side exam object — wait, `getExamForClient` strips `questionIds`... but `createExam` response includes `questions[].id`).  
**Location:** `src/app/api/questions/[questionId]/route.ts` GET handler  
**Fix:** Call `isQuestionInActiveExam(uid, questionId)` and strip `correctOptionIndex` + `explanation` if true.

**P1-2: `checkRevoked: false` on session cookie verification**  
`verifySessionCookie(cookie, false)` in `server-auth.ts` skips revocation check. If a user's account is compromised and tokens revoked, the old session cookie remains valid for up to 7 days.  
**Location:** `src/lib/firebase/server-auth.ts` line where `verifySessionCookie` is called  
**Trade-off:** Documented as performance trade-off. Acceptable for personal SaaS but risky if the platform goes multi-tenant.  
**Mitigation:** Consider `checkRevoked: true` for sensitive operations (delete study, change email) while keeping `false` for reads.

### P2 — Medium

**P2-1: `maxBodySize` option declared but never enforced**  
`WithAuthOptions` type in `api-middleware.ts` declares `maxBodySize?: number` but the middleware never reads or enforces it. A malicious client could send a 100MB JSON body to any POST endpoint.  
**Location:** `src/lib/api-middleware.ts`  
**Risk:** DoS via memory exhaustion on serverless functions (Vercel has a 4.5MB default limit which helps, but explicit enforcement is better).

**P2-2: Firestore TTL policy dependency not documented**  
The rate limiter uses `expireAt` fields expecting Firestore TTL auto-deletion. If the TTL policy is not configured on `_rateLimits`, old rate limit documents accumulate forever.  
**Location:** `src/lib/rate-limit.ts`  
**Fix:** Add a TTL policy setup instruction to the README or deployment checklist.

**P2-3: `Math.random()` for question shuffling**  
Daily challenge and exam question selection use `Math.random()` which is predictable/biased. Not a security issue per se, but if a student discovers the seed pattern, they could predict which questions will appear.  
**Location:** `src/services/stats-service.ts`, `src/lib/exam-engine.ts`  
**Fix:** Use `crypto.getRandomValues()` wrapped in a utility function.

**P2-4: No rate limit on answer save endpoint**  
`PATCH /api/exams/[examId]` (save answer) has no rate limit. An automated client could spam answer saves.  
**Location:** `src/app/api/exams/[examId]/route.ts` PATCH handler  
**Risk:** Low — answers are per-user and idempotent. But adds unnecessary Firestore writes.

### P3 — Low / Nice-to-have

**P3-1: CSP `unsafe-inline` for scripts**  
`script-src 'self' 'unsafe-inline'` is required by Next.js inline scripts but weakens CSP. Consider using nonce-based CSP when Next.js supports it.  
**Location:** `next.config.ts`

**P3-2: No Subresource Integrity (SRI) on external resources**  
Google Fonts and Firebase SDK are loaded from CDN without SRI hashes.  
**Risk:** Supply-chain attack if CDN is compromised. Very unlikely.

**P3-3: Scraping guard `missing_referer` may cause false positives**  
Legitimate browser requests (e.g., bookmarked direct navigation) may not include `Referer`, adding +10 to the anomaly score.  
**Location:** `src/lib/scraping-guard.ts`

---

## Security Checklist

| Check | Status |
|-------|--------|
| Auth required on all non-public API routes | ✅ |
| Firestore rules enforce user isolation | ✅ |
| `correctOptionIndex` never in list responses | ✅ |
| `explanation` never in list/exam responses | ✅ |
| HTML stripping on all user input (XSS) | ✅ |
| CSRF protection on mutation endpoints | ✅ |
| Rate limiting on sensitive operations | ✅ |
| Anti-scraping on answer-bearing endpoints | ✅ |
| Session cookies use httpOnly + Secure | ✅ |
| Open redirect prevention on login | ✅ |
| Server-side timer validation on exams | ✅ |
| Token revocation on logout | ✅ |
| No secrets in client bundle | ✅ |
| CSP headers configured | ✅ (with `unsafe-inline` caveat) |
| HSTS enabled | ✅ |
| X-Frame-Options DENY | ✅ |
| Permissions-Policy restrictive | ✅ |
| `isQuestionInActiveExam` enforced | ❌ (P1-1) |
| Body size limits enforced | ❌ (P2-1) |
| Firestore TTL documented | ❌ (P2-2) |

# Upgrade Matrix — ISC2 Training Platform

**Auditor Role:** Principal Engineer  
**Date:** 2026-02-11  
**Scope:** All runtime and dev dependencies, framework versions, deprecated APIs

---

## Dependency Matrix

| Package | Current | Latest Stable | Risk if Outdated | Priority |
|---------|---------|---------------|------------------|----------|
| `next` | 16.1.6 | 16.1.6 | — | ✅ Current |
| `react` | 19.2.3 | 19.2.3 | — | ✅ Current |
| `react-dom` | 19.2.3 | 19.2.3 | — | ✅ Current |
| `firebase` | ^12.9.0 | 12.x | Low — patch updates only | P3 |
| `firebase-admin` | ^13.6.1 | 13.x | Low — patch updates only | P3 |
| `swr` | ^2.4.0 | 2.x | Low | P3 |
| `zod` | ^4.3.6 | 4.x | Low | P3 |
| `lucide-react` | ^0.563.0 | 0.5xx+ | Low — icon library | P3 |
| `clsx` | ^2.1.1 | 2.x | None | ✅ Current |
| `tailwind-merge` | ^3.4.0 | 3.x | None | ✅ Current |
| `tailwindcss` | ^4 | 4.x | None | ✅ Current |
| `typescript` | ^5 | 5.x | None | ✅ Current |
| `vitest` | ^4.0.18 | 4.x | None | ✅ Current |
| `eslint` | ^9 | 9.x | None | ✅ Current |
| `eslint-config-next` | 16.1.6 | 16.1.6 | — | ✅ Current |
| `shadcn` | ^3.8.4 | 3.x | Dev-only (CLI) | P3 |

**Verdict:** All dependencies are current-generation. No major version gaps, no CVEs detected. The `^` caret ranges allow safe patch updates via `npm update`.

---

## Deprecated APIs / Warnings Detected

### 1. Next.js `middleware` → `proxy` convention (P2)
**Warning:** `⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.`  
**Source:** Next.js 16.1.6 build output  
**Location:** `src/middleware.ts`  
**Impact:** The middleware still works but will be removed in a future Next.js major version. Migration involves renaming to `proxy.ts` and adapting the API to the new proxy convention.  
**Priority:** P2 — Address before upgrading to Next.js 17.

### 2. Deprecated fields in data model (P3)
**Fields:** `certification`, `domain`, `domainNumber`, `targetCertification` on Question/Exam/UserProfile types.  
**Location:** `src/types/index.ts` — marked with `@deprecated` JSDoc  
**Status:** Migration v2 already ran. Fields are preserved for backward compat but never written by new code.  
**Action:** After confirming no legacy documents remain in Firestore, remove deprecated fields from types and Firestore rules (the `examHistory` match rule).  
**Priority:** P3 — Cleanup task, no runtime impact.

### 3. Legacy `examHistory` Firestore collection (P3)
**Location:** `firestore.rules` — `match /examHistory/{examId}` under user scope  
**Status:** Kept for migration backcompat. New exams go to `exams/` subcollection.  
**Action:** Remove rule after migration cleanup.

---

## Tech Debt Assessment

| Area | Current State | Debt Level | Notes |
|------|---------------|------------|-------|
| Auth | Firebase session cookies, full revocation | None | Production-grade |
| Data model | v3 (structured explanation) | Low | Deprecated fields pending cleanup |
| API layer | Consistent `withAuth` + Zod validation | None | Clean patterns |
| UI framework | React 19 + Tailwind 4 | None | Cutting-edge |
| Testing | 100 tests (Vitest) — validators + engine | Medium | No integration/API tests |
| CI/CD | No pipeline in repo | High | No automated test/build/deploy |
| Monitoring | Structured logger, no APM | Medium | No error tracking (Sentry) |
| E2E testing | None | Medium | No Playwright/Cypress |

---

## Recommended Upgrade Order

1. **Migrate `middleware.ts` → `proxy.ts`** (P2) — address the deprecation warning before it becomes a breaking change.
2. **Add CI pipeline** (P1 tech debt) — GitHub Actions with `npm run build && npm test` on PRs.
3. **Add error tracking** (P2 tech debt) — Sentry or similar for production error visibility.
4. **Clean deprecated fields** (P3) — remove `certification`, `domain`, `domainNumber` after Firestore audit confirms no legacy documents.
5. **Add API integration tests** (P2 tech debt) — test service layer with Firestore emulator.

---

## Version Lock Strategy

Current `package.json` uses `^` ranges for all dependencies. This is appropriate:
- **Runtime deps** (`firebase`, `swr`, `zod`): Caret allows safe patch/minor updates.
- **Framework deps** (`next`, `react`): Pinned to exact major.minor — good.
- **Dev deps**: Caret is fine — breaking changes don't affect production.

**Recommendation:** Add `npm audit` to CI pipeline. No lockfile shrinking needed.

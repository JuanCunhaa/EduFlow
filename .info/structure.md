# Structure Audit — ISC2 Training Platform

**Auditor Role:** Architect  
**Date:** 2026-02-11  
**Scope:** Folder layout, domain boundaries, module cohesion, rules for placing new code

---

## Current Architecture

```
ISC2/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout (fonts, theme, auth)
│   │   ├── page.tsx                  # Landing → redirects to /dashboard
│   │   ├── globals.css               # Design tokens, glass-morphism, animations
│   │   ├── error.tsx                 # Global error boundary
│   │   ├── middleware.ts             # Edge: JWT structure check + cookie cleanup
│   │   ├── api/                      # API routes (serverless)
│   │   │   ├── auth/verify/          # Login/logout session management
│   │   │   ├── studies/              # CRUD Studies
│   │   │   ├── questions/            # CRUD Questions + import
│   │   │   ├── exams/                # CRUD Exams + submit/abandon/review/in-progress
│   │   │   ├── stats/                # User stats + goals
│   │   │   ├── analytics/            # Aggregated exam analytics
│   │   │   ├── daily-challenge/      # Daily challenge generation
│   │   │   └── share-image/          # OG image generation (ImageResponse)
│   │   ├── dashboard/                # Dashboard + StudyDetail pages
│   │   ├── exams/                    # Exam list + review pages
│   │   ├── questions/                # Question management page
│   │   ├── study/                    # Active study/exam session
│   │   ├── login/                    # Auth page
│   │   └── analytics/               # Analytics page
│   │
│   ├── components/                   # React components
│   │   ├── layout/                   # Shell, Header, Sidebar
│   │   ├── exams/                    # ExamConfigForm, ExamSession, ExamResults, ErrorBoundary
│   │   ├── questions/                # QuestionTable, QuestionForm, ImportDialog
│   │   ├── studies/                  # StudyFormDialog
│   │   ├── retention/                # BadgeGallery, DailyChallengeModal
│   │   └── ui/                       # ConfirmDialog, Spinner, Skeleton, Toast, ThemeProvider
│   │
│   ├── hooks/                        # SWR hooks + auth hook
│   │   ├── useAuth.tsx               # Firebase auth state
│   │   ├── useStudies.ts             # Studies CRUD
│   │   ├── useExams.ts               # Exams CRUD + submit/abandon
│   │   ├── useQuestions.ts           # Questions CRUD + import
│   │   └── useStats.ts              # Stats + goals
│   │
│   ├── services/                     # Business logic (server-only)
│   │   ├── exam-service.ts           # 690 LOC — exam lifecycle, analytics, scoring
│   │   ├── question-service.ts       # CRUD + active-exam guard + pool fetch
│   │   ├── study-service.ts          # CRUD + cascade delete
│   │   ├── stats-service.ts          # Streaks, badges, daily challenge, goals
│   │   └── performance-service.ts    # Domain accuracy, attempt tracking, decay
│   │
│   ├── lib/                          # Shared utilities
│   │   ├── errors.ts                 # Error hierarchy (AppError → domain errors)
│   │   ├── logger.ts                 # Structured JSON logger
│   │   ├── api-middleware.ts         # withAuth, CSRF, error handling
│   │   ├── validators.ts            # Zod schemas (source-of-truth)
│   │   ├── exam-engine.ts           # Selection strategies (pure functions)
│   │   ├── fetcher.ts               # SWR fetcher with error extraction
│   │   ├── format.ts                # Date formatting, domain stats
│   │   ├── rate-limit.ts            # Firestore-backed rate limiting
│   │   ├── scraping-guard.ts        # Anti-scraping with fingerprinting
│   │   ├── utils.ts                 # cn() utility
│   │   ├── firebase/                # Firebase wrappers
│   │   │   ├── admin.ts             # Admin app singleton
│   │   │   ├── admin-firestore.ts   # Firestore admin instance
│   │   │   ├── auth.ts              # Client auth (Google provider)
│   │   │   ├── config.ts            # Client Firebase config
│   │   │   └── server-auth.ts       # Session cookie verify/create
│   │   └── __tests__/               # Unit tests
│   │       ├── errors.test.ts
│   │       ├── exam-engine.test.ts
│   │       └── validators.test.ts
│   │
│   └── types/
│       └── index.ts                  # All types + interfaces
│
├── scripts/                          # One-off migration scripts
│   ├── migrate-v2.ts
│   └── migrate-v3-explanation.ts
│
├── next.config.ts                    # Security headers, caching, serverless config
├── firestore.rules                   # Per-user data isolation
├── firestore.indexes.json            # Composite indexes
├── vitest.config.ts                  # Test configuration
├── tsconfig.json                     # TypeScript config
├── package.json                      # Dependencies
└── .info/                            # Audit output (this folder)
```

---

## Architecture Assessment

### Domain Boundaries — Grade: A-

The codebase follows a clean **3-layer architecture**:

```
┌─────────────────────────────────────────┐
│  Pages (app/)          — UI + routing   │
├─────────────────────────────────────────┤
│  Components + Hooks    — presentation   │
├─────────────────────────────────────────┤
│  API Routes (app/api/) — HTTP boundary  │
├─────────────────────────────────────────┤
│  Services              — business logic │
├─────────────────────────────────────────┤
│  Lib                   — shared infra   │
├─────────────────────────────────────────┤
│  Firebase              — data access    │
└─────────────────────────────────────────┘
```

**No reverse dependencies.** Components never import services. Services never import route handlers. Clean.

### Cohesion Analysis

| Module | Cohesion | Notes |
|--------|----------|-------|
| `lib/errors.ts` | **High** | Single purpose — error hierarchy |
| `lib/logger.ts` | **High** | Single purpose — structured logging |
| `lib/validators.ts` | **High** | All Zod schemas in one place |
| `lib/exam-engine.ts` | **High** | Pure selection logic, well-isolated |
| `services/exam-service.ts` | **Medium** | 690 LOC, 12+ exports — analytics should be extracted |
| `services/stats-service.ts` | **Medium** | Streaks + badges + daily challenge could be 2 files |
| `lib/format.ts` | **Low** | Mixes date formatting with domain stats computation |

### Coupling Analysis

| Relationship | Coupling | Risk |
|-------------|----------|------|
| `exam-service` → `question-service` | Low | Via `fetchQuestionPool` |
| `exam-service` → `performance-service` | Low | Via `buildPerformanceSummaryUpdate` |
| `stats-service` → `question-service` | **Circular** | Dynamic import to break cycle |
| `components/*` → `hooks/*` | Expected | Standard React pattern |
| `hooks/*` → `lib/fetcher` | Low | Shared HTTP utility |

The **circular dependency** between stats-service and question-service (daily challenge needs questions, questions might need stats) is handled via dynamic `import()`. This works but is a smell — consider extracting the daily challenge question selection into its own module.

---

## What's Missing

### 1. No `constants/` or `config/` directory
App-level constants are embedded in services: `DECAY_HALF_LIFE_DAYS`, `WEAK_DOMAIN_THRESHOLD`, `MAX_EXAM_QUESTIONS`, `GRACE_PERIOD_SECONDS`. These should live in a shared `src/lib/constants.ts` file.

### 2. No dedicated test directory per domain
Tests live only in `src/lib/__tests__/`. Service tests (when added) should go to `src/services/__tests__/` or colocate as `exam-service.test.ts`.

### 3. No `src/lib/firebase/types.ts`
Firestore document shapes are mapped through the general `types/index.ts`. If the data layer diverges from the API layer, separate Firestore DTOs would help.

### 4. No shared response types
API response shape `{ data: T }` is defined inline everywhere. A `src/types/api.ts` file with `ApiResponse<T>`, `ApiError`, `PaginatedResponse<T>` would formalize the contract.

---

## Recommended Target Structure (if growth continues)

```
src/
├── app/                              # No changes — Next.js convention
├── components/
│   ├── layout/
│   ├── exams/
│   ├── questions/
│   ├── studies/
│   ├── retention/
│   └── ui/
├── hooks/                            # No changes
├── services/
│   ├── exam-service.ts
│   ├── exam-analytics-service.ts     # ← Extract from exam-service
│   ├── question-service.ts
│   ├── study-service.ts
│   ├── stats-service.ts
│   ├── badge-service.ts              # ← Extract from stats-service
│   ├── performance-service.ts
│   └── __tests__/                    # ← Add service tests
├── lib/
│   ├── constants.ts                  # ← Centralize magic numbers
│   ├── errors.ts
│   ├── logger.ts
│   ├── api-middleware.ts
│   ├── validators.ts
│   ├── exam-engine.ts
│   ├── fetcher.ts
│   ├── format.ts
│   ├── rate-limit.ts
│   ├── scraping-guard.ts
│   ├── utils.ts
│   ├── firebase/
│   └── __tests__/
└── types/
    ├── index.ts                       # Domain types
    └── api.ts                         # ← API response/request types
```

---

## Rules for Placing New Code

### When adding a new **feature domain** (e.g., "Flashcards"):
1. Create `src/services/flashcard-service.ts`
2. Create `src/app/api/flashcards/route.ts`
3. Create `src/hooks/useFlashcards.ts`
4. Create `src/components/flashcards/` folder
5. Add types to `src/types/index.ts`
6. Add validators to `src/lib/validators.ts`
7. Add page at `src/app/flashcards/page.tsx`

### When adding a new **UI component**:
- If reusable across features → `src/components/ui/`
- If feature-specific → `src/components/{feature}/`
- If layout-related → `src/components/layout/`

### When adding a new **utility**:
- Pure functions → `src/lib/`
- Firebase-specific → `src/lib/firebase/`
- Domain constants → `src/lib/constants.ts` (create if missing)

### When adding a new **API endpoint**:
- Follow Next.js App Router convention: `src/app/api/{resource}/route.ts`
- Always use `withAuth` middleware (exception: public endpoints use `withPublicRoute`)
- Always validate with Zod before processing
- Always set `Cache-Control` on GET responses

### When adding **tests**:
- Unit tests for `lib/` → `src/lib/__tests__/{module}.test.ts`
- Service tests → `src/services/__tests__/{service}.test.ts`
- Keep test files colocated with their target directory

---

## File Size Health Check

| File | Lines | Assessment |
|------|-------|------------|
| [exam-service.ts](src/services/exam-service.ts) | 690 | ⚠️ At threshold — extract analytics |
| [exam-engine.ts](src/lib/exam-engine.ts) | ~500 | OK — pure functions with clear sections |
| [ExamSession.tsx](src/components/exams/ExamSession.tsx) | ~200 | OK |
| [globals.css](src/app/globals.css) | ~200 | OK |
| All other files | <200 | ✅ Healthy |

---

## Anti-Patterns to Avoid

1. **Never import from `services/` in client components** — services use `firebase-admin` which is server-only.
2. **Never bypass `withAuth`** — use `withPublicRoute` for public endpoints, never raw `NextRequest` handlers.
3. **Never add Firestore paths inline** — use the `*Path(uid)` helper functions in each service.
4. **Never return Firestore `doc.data()` directly** — always map through typed interfaces and strip internal fields.
5. **Never use `sort(() => Math.random() - 0.5)`** — use the Fisher-Yates `shuffleArray` from exam-engine.

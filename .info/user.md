# User Experience Audit — ISC2 Training Platform

**Auditor Role:** UX Specialist (simulating student preparing for ISC2 certification)  
**Date:** 2026-02-11  
**Scope:** Complete user journey from first visit to daily study routine  
**Overall Grade:** B+

---

## User Journey Map

```
[First Visit] → [Login] → [Empty Dashboard] → [Create Study] → [Add Questions]
                                                     ↓
                                              [Configuration]
                                                     ↓
[Daily Routine] ← [Review Results] ← [Take Exam] ← [Choose Mode]
      ↓
[Streak · Badges · Daily Challenge · Analytics]
```

---

## Phase 1: Onboarding — Grade: C

### What the student experiences
1. Lands on `/` → instant redirect to `/dashboard` with no explanation of what the platform does.
2. If unauthenticated, redirected to `/login` — clean page with "Sign in with Google" button.
3. After login → empty dashboard. Message: "No studies yet. Create your first study to begin."
4. Must figure out: What is a "Study"? What domains to add? How does ISC2 certification map to this?

### Critical friction
| Issue | Impact | Location |
|-------|--------|----------|
| **No landing page** — zero value proposition before sign-in | New users don't know what they're signing into | [src/app/page.tsx](src/app/page.tsx) |
| **No certification templates** — user must manually type all 8 CISSP domains | Biggest first-time barrier. Takes 5+ minutes of research | [StudyFormDialog.tsx](src/components/studies/StudyFormDialog.tsx) |
| **No onboarding tooltip/wizard** — user must discover every feature independently | Missed features = missed retention |
| **Only Google Sign-In** — blocks users without Google accounts | Accessibility barrier | [login/page.tsx](src/app/login/page.tsx) |

### What works well
- Login is visually clean with ambient glow effect
- Redirect-after-login preserves intended destination
- Loading state during auth resolution prevents flash

### Recommendation
Add a template picker to StudyFormDialog: "Start from template: CISSP / CC / SSCP" that auto-fills abbreviation, name, and all domain names. This alone would cut onboarding time from 5 minutes to 15 seconds.

---

## Phase 2: Study Setup — Grade: B+

### What the student experiences
1. Click "New Study" → modal with abbreviation, name, domains
2. Add domains one by one (max 30), each with ID + name
3. No preset templates — must know ISC2 domain names
4. After creation → study card appears with gradient header
5. Click into study → detail page with stats, domain mastery, quick actions

### What works well
- Auto-uppercase abbreviation field
- Numbered domains with add/remove buttons
- Same dialog for create and edit
- Inline validation with error messages
- Study cards show total questions, average score — useful at a glance
- Study detail has domain mastery bars with color coding (green/amber/red)

### Friction
| Issue | Location |
|-------|----------|
| Domain IDs auto-set to `d1`, `d2` — opaque for import/export | [StudyFormDialog.tsx](src/components/studies/StudyFormDialog.tsx) |
| No drag-to-reorder domains | — |
| No description/notes field on study | — |

---

## Phase 3: Question Management — Grade: B

### What the student experiences
1. Navigate to "Question Bank" in sidebar
2. Select a study from dropdown
3. See table of questions with text preview, domain, difficulty
4. Can create, edit, delete, import (JSON/CSV)

### What works well
- Import supports both JSON and CSV with detailed format guide
- QuestionForm has structured explanation: short explanation + per-option "why wrong"
- Difficulty badges color-coded: Easy (emerald), Medium (amber), Hard (rose)
- Domain filter dropdown

### Friction
| Issue | Impact | Location |
|-------|--------|----------|
| **Domain IDs shown raw** — `d1` instead of "Security and Risk Management" | Confusing — user must mentally map IDs to names | [QuestionTable.tsx](src/components/questions/QuestionTable.tsx) |
| **No bulk actions** — cannot multi-select and delete/move questions | Tedious at 100+ questions | [QuestionTable.tsx](src/components/questions/QuestionTable.tsx) |
| **Client-side text search breaks pagination** — search results may be incomplete | User misses relevant questions | [question-service.ts](src/services/question-service.ts) |
| **Empty state is bare** — just "No questions found" text, no guidance | [QuestionTable.tsx](src/components/questions/QuestionTable.tsx) |
| **Action buttons hover-only** — invisible on touch devices | Mobile users can't edit/delete | [QuestionTable.tsx](src/components/questions/QuestionTable.tsx) |

---

## Phase 4: Taking Exams — Grade: A-

### What the student experiences
1. Navigate to "Practice Exams"
2. ExamConfigForm: choose study, mode, question count, time, difficulty, domains
3. 5 modes: Practice, Weak Domains, Recent Misses, Real Mix, Domain Focus
4. Start exam → full-screen immersive session
5. Timer counts down with color escalation (normal → amber → red pulse)
6. Question navigator dots show answered/unanswered/current
7. On submit → confirmation dialog warns about unanswered questions
8. Results page: pass/fail hero, score, domain breakdown, focus areas
9. Can review each question with explanations

### What works well — Grade: A
- **5 exam modes** — outstanding adaptive learning design
- **State machine** with `useReducer` — clean phase transitions
- **Answer retry queue** with exponential backoff — resilient saves
- **Session persistence** via `sessionStorage` + server recovery — exam never lost
- **Timer escalation** — visual urgency creates real exam pressure
- **Submit confirmation** shows unanswered count — prevents accidental submission
- **Results page** sorts domains weakest-first, highlights focus areas
- **Review page** expands per-question with correct/wrong highlighting + "Why Others Wrong"
- **Auto-submit** on timer expiry — same as real ISC2 exam

### Friction
| Issue | Impact | Location |
|-------|--------|----------|
| **No keyboard shortcuts** (1-4 for options, arrows for nav) | Power users slow down | [ExamSession.tsx](src/components/exams/ExamSession.tsx) |
| **Navigator dots break at 150 questions** — too many to fit cleanly | Visual clutter on long exams | [ExamSession.tsx](src/components/exams/ExamSession.tsx) |
| **No pause/break option** — timer runs continuously | Students can't take breaks | [ExamSession.tsx](src/components/exams/ExamSession.tsx) |
| **Domain IDs shown raw** instead of domain names | Same issue as question table | [ExamSession.tsx](src/components/exams/ExamSession.tsx) |
| **No "untimed practice" option** | Can't do relaxed study | [ExamConfigForm.tsx](src/components/exams/ExamConfigForm.tsx) |

---

## Phase 5: Motivation Loop — Grade: B+

### What the student experiences
- **Streak counter** on dashboard and study detail (flame icon, color-coded)
- **Weekly goal bar** with progress indicator and color escalation
- **Badge gallery** with 7 lockable badges and tooltips
- **Daily challenge** — 5 quick questions from weak domains
- **Share progress** — generates shareable OG image

### What works well
- Streak visualization with fire emoji and days counter creates accountability
- Weekly goal bar with color transitions (red → amber → green) is motivating
- Badge system has meaningful milestones (First Exam, Perfect Score, 7-day streak, etc.)
- Daily challenge targets weak areas — adaptive difficulty

### Critical friction
| Issue | Impact | Location |
|-------|--------|----------|
| **Badges awarded silently** — no toast/animation/confetti | Kills dopamine loop entirely | [BadgeGallery.tsx](src/components/retention/BadgeGallery.tsx) |
| **Streak/goal invisible at 0** — new users never see the system | First impression gap | [dashboard/page.tsx](src/app/dashboard/page.tsx) |
| **Daily challenge shows no correct/wrong feedback** — only marks selection | Learning from mistakes impossible | [DailyChallengeModal.tsx](src/components/retention/DailyChallengeModal.tsx) |
| **Daily challenge results may not count toward streak** | Effort feels wasted | [DailyChallengeModal.tsx](src/components/retention/DailyChallengeModal.tsx) |
| **Weekly goal value appears hardcoded** — no way to customize | Different users, different paces | [dashboard/page.tsx](src/app/dashboard/page.tsx) |

---

## Phase 6: Analytics & Progress — Grade: B

### What the student experiences
- Analytics page shows score trend line, domain performance bars, recent exam history
- Study detail shows domain mastery breakdown, average score, total exams

### What works well
- Score trend with visual chart shows improvement over time
- Domain performance bars help identify weak areas
- Color-coded mastery: green ≥70%, amber ≥50%, red <50%

### Friction
| Issue | Impact | Location |
|-------|--------|----------|
| **Exam history rows aren't clickable** — can't navigate to reviews | Dead end in analytics | [analytics/page.tsx](src/app/analytics/page.tsx) |
| **No export/print functionality** — can't save progress externally | Students tracking over months lose data visibility | — |
| **No study time tracking** — no data on hours invested | Missing key metric for certification prep | — |

---

## Loading & Error States — Grade: A-

### Loading: Comprehensive
Every page has a loading state (mostly `<Spinner>`). Well-handled.

**Missed opportunity:** Skeleton components (`SkeletonCard`, `SkeletonTable`, `SkeletonDashboard`) exist in [Skeleton.tsx](src/components/ui/Skeleton.tsx) but are **never used**. Swapping `<Spinner>` for skeletons would significantly improve perceived performance.

### Errors: Good Coverage
- Global error boundary with retry button
- Exam-specific error boundary
- Toast notifications on mutation failures
- Answer save retry queue with exponential backoff
- Review/study "not found" states with back links

**Gaps:**
- Login failure shows no visible error message — button just re-enables
- Study delete failure swallows silently — no toast

---

## Empty States — Grade: B

| Page | Empty State | Actionable? |
|------|-------------|-------------|
| Dashboard | "No studies yet" + Create button | ✅ Yes |
| Flashcards (no questions) | "No questions found" | ❌ No CTA |
| Question Table | "No questions found" plain text | ❌ No CTA |
| Analytics | "Complete exams to see analytics" | ❌ No CTA |
| Study Detail (no exams) | Section hidden | ⚠️ Implicit |
| Daily Challenge (no questions) | "Add more questions" | ✅ Yes |

**Fix:** Every empty state should include a CTA button linking to the relevant action (Import questions, Start exam, etc.).

---

## Design System Evaluation — Grade: A

### Visual Identity
- **Dark-first** with oklch color tokens — professional, eye-friendly for long study sessions
- **Glass-morphism** via `.glass-panel` (`backdrop-filter: blur(20px)`) — premium aesthetic
- **Ambient glow** background effect — distinctive branding
- **Gradient accents** (indigo → cyan → purple) — consistent identity
- **Color-coded performance** — universal green/amber/red system throughout

### Consistency
- Lucide icons used consistently — no mixed icon libraries
- Button variants: `btn-glass`, `card-premium`, gradients — cohesive
- Typography: Inter for body, JetBrains Mono for scores/timers
- Animation system: `animate-fade-in`, `animate-stagger`, `glow-pulse`

### What students feel
The dark theme with glow accents creates a focused, professional learning environment. It feels like a premium tool, not a homework app. The glass-morphism effects on the sidebar and exam session create visual depth. The color-coded performance indicators (green/amber/red) create instant readability.

---

## Top 10 UX Fixes (Student Impact Priority)

| # | Fix | Student Impact | Effort |
|---|-----|---------------|--------|
| 1 | **Add cert templates** to study creation (CISSP/CC/SSCP) | Eliminates onboarding friction | 2 hr |
| 2 | **Resolve domain IDs to names** in exam session + question table | Critical readability | 1 hr |
| 3 | **Badge unlock celebration** — toast/animation when earned | Motivation multiplier | 2 hr |
| 4 | **Show streak/goal at 0** with encouragement | New user engagement | 30 min |
| 5 | **Use existing Skeleton components** instead of Spinner | Perceived performance | 1 hr |
| 6 | **Daily challenge: show correct answer** after selection | Learning value | 1 hr |
| 7 | **Keyboard shortcuts in exams** (1-4, arrows, Enter) | Power user speed | 3 hr |
| 8 | **Make exam history clickable** → review page | Close dead end | 30 min |
| 9 | **Enrich empty states** with CTAs | Reduce abandonment | 1 hr |
| 10 | **Login error feedback** — show toast on auth failure | Trust/reliability | 15 min |

---

## Patterns Worth Preserving

These are excellent UX decisions that should not change:

1. **5-mode exam system** — adaptive learning at its best
2. **Answer retry queue** — offline resilience without complexity
3. **Session persistence** — exams never lost across tabs/refreshes
4. **Timer color escalation** — creates authentic exam pressure
5. **Results weakest-first sorting** — immediately actionable
6. **ConfirmDialog accessibility** — focus trap, Escape, scroll lock
7. **Card-premium design system** — premium feel drives engagement
8. **Glass-panel sidebar** — beautiful without being distracting

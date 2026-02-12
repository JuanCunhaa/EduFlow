# 10 — Kill Distractions

---

## Problem Statement

Engineering time has been spent on features that don't drive revenue, retention, or acquisition. Every feature maintained is time not spent on monetization, content, or distribution. The codebase includes several features that should be deprioritized, hidden, or removed.

This is not about deleting code permanently. It's about focusing engineering attention on what matters for the next 90 days.

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Features removed/hidden | 3+ within first 2 weeks |
| Engineering hours freed/week | 5+ hours redirected to revenue work |
| Codebase surface area reduction | Fewer components to maintain |
| User confusion reduced | Simpler exam config, fewer choices |

---

## MVP Scope (2 weeks)

### 1. Pomodoro Timer — HIDE

**Current state:** `PomodoroTimer.tsx` — 25-min focus / 5-min break timer with SVG ring. Client-side only, no persistence.

**Problem:** This is a generic productivity tool that has nothing to do with certification prep. Every phone has a timer. It dilutes the product story and adds visual noise to the study dashboard.

**Action:** Remove `PomodoroTimer` from the study detail page render. Keep the component file (don't delete code), just stop rendering it. Feature-flag it behind an env variable for potential future use.

**Time saved:** 0 maintenance hours (it's stable), but removes cognitive load from dashboard UI.

### 2. Activity Heatmap — DEPRIORITIZE

**Current state:** `ActivityHeatmap.tsx` — GitHub-style 180-day contribution grid.

**Problem:** Users studying for CISSP don't care about their contribution graph. They care about "Am I going to pass?" The heatmap is a vanity metric that doesn't drive outcomes or conversion.

**Action:** Move heatmap below the fold on the study detail page. Below analytics, below domain mastery, below readiness score. It's nice-to-have, not need-to-have. Don't remove it — it does show activity — just deprioritize it visually.

### 3. Accent Colors on Studies — REMOVE FROM UI

**Current state:** `accentColor?: string` on Study type. Used for visual differentiation of study cards.

**Problem:** Engineering time spent on cosmetic customization. Color pickers in study forms. Adds complexity to the form without any user value.

**Action:** Remove color picker from `StudyFormDialog.tsx` and `MarketplaceStudyFormDialog.tsx`. Keep the field in the type (backward compat), just stop exposing it. Use a default color palette instead (auto-assign based on index).

### 4. Simplify Exam Mode Selection — REDUCE COGNITIVE LOAD

**Current state:** `ExamConfigForm.tsx` shows all 6 modes as equal options. Users must understand the difference between `weak_domains`, `recent_misses`, `spaced_review`, `real_mix`, `domain_focus`, and `practice`.

**Problem:** This is a cockpit, not a product. New users are overwhelmed. They don't know what "SM-2 spaced repetition" means. They want to click "Start" and trust the system.

**Action:**
- Default mode: `practice` (pre-selected)
- Show 3 modes prominently: **Practice** (balanced), **Simulation** (real_mix, timed), **Smart Review** (spaced_review)
- Hide 3 modes behind "Advanced modes ▸" toggle: weak_domains, recent_misses, domain_focus
- Rename modes to user-friendly labels:
  - `practice` → "Practice"
  - `real_mix` → "Exam Simulation"
  - `spaced_review` → "Smart Review"
  - `weak_domains` → "Weak Areas" (advanced)
  - `recent_misses` → "Recent Mistakes" (advanced)
  - `domain_focus` → "Domain Deep Dive" (advanced)

### 5. Flashcard Mode — EVALUATE USAGE

**Current state:** Flashcard mode exists alongside exam mode.

**Problem:** Two learning paradigms splitting user attention. If flashcard usage is <10% of sessions, it's noise.

**Action:** Track flashcard usage with a simple counter. If <10% of active users use flashcards in 30 days, hide it behind a toggle. Don't remove it — some users may love it — but don't feature it equally with exams.

---

## Phase 2 Scope (6–8 weeks)

1. **Feature usage analytics** — Track which features users actually use. Hide/remove anything with <5% engagement. Data-driven feature pruning.
2. **Onboarding flow simplification** — First-time user sees: pick your cert → start a practice exam → see your results. No configuration screen. No mode selection. One click to value.
3. **Dashboard simplification** — Study detail page has too many widgets. Prioritize: readiness score, domain mastery, quick actions (start exam, review mistakes). Everything else below the fold.
4. **Remove badge gallery from prime real estate** — Badges are gamification for gamification's sake. If badge views < 5% of dashboard views, move to profile page.
5. **Audit every component** — Map: component → user action it drives → revenue impact. Kill anything that doesn't connect to signup, upgrade, retention, or referral.

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Removing features alienates existing beta users | 🟢 Low | Zero users today. Even with beta users: hiding ≠ deleting. Features remain accessible via advanced toggles. |
| Over-simplification loses power users | 🟡 Medium | Advanced toggle preserves all 6 modes. Power users who understand SM-2 can still access everything. |
| Founder emotional attachment to features | 🟡 Medium | Data decides. Track usage. If <5% use it, it doesn't matter how clever the engineering is. |
| Reintroducing hidden features later costs time | 🟢 Low | Code stays in codebase. Feature flags or conditional rendering — minutes to re-enable. |

---

## The Principle

> Every feature you show a user is a decision you're asking them to make. Every decision costs cognitive energy. Every unit of cognitive energy not spent on "start practicing" is waste. Simplify ruthlessly. The best product is the one that gets out of the user's way.

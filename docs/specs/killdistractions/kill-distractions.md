# Kill Distractions — Feature Audit & Elimination Plan

> **Role:** CPO + CTO ruthless feature audit  
> **Date:** 2025-01-XX  
> **Verdict:** Kill 4 features, deprioritize 3, restructure 1. Net result: ~600 lines of dead code removed, 1 API route eliminated, dashboard load cut by ~40%, and product narrative sharpened to one sentence.

---

## 1. Executive Summary

ExamFlow has accumulated retention/gamification features that:

1. **Don't convert** — zero integration with the paywall or upgrade flow
2. **Don't differentiate** — Pomodoro timers exist in 10,000 free apps
3. **Dilute the brand** — make ExamFlow look like "another study app" instead of a precision exam simulator
4. **Cost maintenance** — every feature is a surface to break, translate (en + pt-BR), and test

This document categorises every non-core feature into **KILL**, **DEPRIORITIZE**, or **KEEP WITH CHANGES**, with engineering impact for each.

---

## 2. Decision Framework

A feature earns its seat only if it passes **all three** gates:

| Gate | Question |
|------|----------|
| **Conversion** | Does it move a free user toward Pro? |
| **Retention** | Does it bring a paying user back daily? |
| **Differentiation** | Could a competitor replicate it in a weekend? |

If a feature fails even one gate and has no credible 90-day plan to pass it, it gets killed.

---

## 3. Feature Verdicts

### 3.1 🔴 KILL — PomodoroTimer

| Attribute | Detail |
|-----------|--------|
| **File** | `src/components/retention/PomodoroTimer.tsx` (153 lines) |
| **Used in** | `dashboard/[studyId]/page.tsx` (dynamic import, bottom of page) |
| **Integration** | Zero. No connection to exam engine, no data persistence, no analytics |
| **Conversion** | ❌ Free feature, no upsell hook |
| **Retention** | ❌ No evidence of usage; no telemetry |
| **Differentiation** | ❌ Literally every productivity app has one |

**Why kill:** A generic Pomodoro timer on a cert exam prep platform screams "we don't know what we are." It adds 153 lines of code, needs i18n maintenance for 2 locales, and competes with the user's phone timer. Nobody chooses ExamFlow because of a Pomodoro timer.

**Engineering impact:**
- Delete `src/components/retention/PomodoroTimer.tsx`
- Remove dynamic import + `<PomodoroTimer />` from `dashboard/[studyId]/page.tsx`
- Remove i18n keys in `en.json` / `pt-BR.json`
- **LOC removed:** ~160 (component + i18n)
- **Risk:** Zero. No data to migrate, no API dependency.

---

### 3.2 🔴 KILL — ActivityHeatmap

| Attribute | Detail |
|-----------|--------|
| **Files** | `src/components/retention/ActivityHeatmap.tsx` (151 lines) |
| **Used in** | `dashboard/[studyId]/page.tsx`, `analytics/page.tsx` |
| **Integration** | Reads `recentDays: DailyRecord[]` from `useStats()` |
| **Conversion** | ❌ Free tier gets 30-day view, Pro gets 180 — but nobody upgrades for a bigger heatmap |
| **Retention** | 🟡 Marginal. Visual "don't break the chain" but streak counter already does this |
| **Differentiation** | ❌ GitHub-style heatmap, copied in every habit app |

**Why kill:** The heatmap is a vanity metric display. The streak counter (which we keep) already provides the "don't break the chain" psychology in a single number. The heatmap adds 151 lines, a Free/Pro tiering edge case, and visual clutter at the bottom of an already-busy dashboard. The 30-day vs 180-day gate has never been validated as a conversion lever.

**Engineering impact:**
- Delete `src/components/retention/ActivityHeatmap.tsx`
- Remove from `dashboard/[studyId]/page.tsx` and `analytics/page.tsx`
- Remove `recentDays` from `UserStats` type (cleanup pass — field can remain in Firestore, just stop reading/displaying)
- Remove i18n keys
- **LOC removed:** ~160
- **Risk:** Low. `recentDays` stays in Firestore; we just stop rendering it.

---

### 3.3 🔴 KILL — BadgeGallery

| Attribute | Detail |
|-----------|--------|
| **Files** | `src/components/retention/BadgeGallery.tsx` (66 lines) |
| **Used in** | `dashboard/[studyId]/page.tsx` |
| **Types** | `BadgeId` union type (7 badges), `badges: string[]` in `UserStats` |
| **Integration** | Read-only display of `stats.badges` |
| **Conversion** | ❌ All badges are free-tier. No Pro-exclusive badges |
| **Retention** | 🟡 Weak. 7 static badges (first_exam, streak_3/7/30, perfect_score, centurion, domain_master) with no social sharing, no progression system |
| **Differentiation** | ❌ Generic gamification. No cert-specific badges |

**Why kill:** Badges work when they create social proof (LinkedIn badges, Duolingo leagues) or unlock features. These do neither. They sit in a gallery nobody shares, with no progression beyond 7 static awards. Maintaining the badge-earning logic, the gallery component, and 14 i18n strings (7 badges × 2 locales) for zero conversion is pure waste.

**Engineering impact:**
- Delete `src/components/retention/BadgeGallery.tsx`
- Remove from `dashboard/[studyId]/page.tsx`
- Remove `BadgeId` type, `badges` from `UserStats` (or deprecate — stop writing new badges)
- Remove badge-earning logic in stats service
- Remove i18n keys
- **LOC removed:** ~100 (component + type cleanup + i18n)
- **Risk:** Low. Badge data stays in Firestore; we stop computing/displaying.

---

### 3.4 🟡 DEPRIORITIZE — DailyChallengeModal

| Attribute | Detail |
|-----------|--------|
| **Files** | `src/components/retention/DailyChallengeModal.tsx` (199 lines), `src/app/api/daily-challenge/` API route |
| **Used in** | `dashboard/[studyId]/page.tsx` (button triggers modal) |
| **Integration** | Fetches from dedicated API endpoint, renders quiz in a modal |
| **Conversion** | 🟡 Could be a conversion lever but currently isn't gated |
| **Retention** | ✅ Daily touchpoint is valuable psychology |
| **Differentiation** | 🟡 Common pattern but can be made cert-specific |

**Verdict: Don't kill, but freeze and redesign.** The daily challenge concept is sound — a daily micro-exam is retention gold. But the current implementation is a parallel quiz engine in a modal that cannibalizes regular exam usage. It should be redesigned as a **conversion funnel entry point**, not a standalone mini-game.

**Phase 1 action (now):** Remove the dedicated modal and button from the dashboard. Freeze the API route. This strips ~200 lines and 1 API route from the active surface.

**Phase 2 action (post-monetization):** Reintroduce as "Daily 5" — 5 targeted questions shown as a standalone page (not a modal), with results feeding into the main analytics pipeline, and Pro users getting domain-targeted daily questions.

**Engineering impact (Phase 1):**
- Keep `DailyChallengeModal.tsx` but stop importing it
- Remove daily challenge button from dashboard retention row
- Mark `/api/daily-challenge` as deprecated
- **LOC deactivated:** ~200 (component) + ~50 (API route)
- **Risk:** Low. No persistent user data tied to daily challenge completions.

---

### 3.5 🟡 DEPRIORITIZE — Weekly/Daily Goals

| Attribute | Detail |
|-----------|--------|
| **Location** | `UserStats.dailyGoal`, `UserStats.weeklyGoal`; rendered in dashboard retention row |
| **Integration** | Goal progress bar in dashboard (weekly goal: questions answered vs target) |
| **Conversion** | ❌ Goals are free tier, no upsell |
| **Retention** | 🟡 Goal-setting without accountability (no push notifications, no social pressure) |

**Verdict: Strip from dashboard, keep data.** The weekly goal progress bar takes up a full card in the retention row. Goal-setting without reminders or consequences is theater. Remove the visual; the data fields stay in Firestore for a future notification system.

**Engineering impact:**
- Remove weekly goal card from dashboard retention row grid
- Remove `dailyGoal`, `weeklyGoal` from dashboard rendering
- **LOC removed:** ~30

---

### 3.6 🟡 DEPRIORITIZE — Share Progress / Share Image

| Attribute | Detail |
|-----------|--------|
| **Location** | "Share Progress" button at bottom of `dashboard/[studyId]/page.tsx`; `/api/share-image` route |
| **Integration** | Generates shareable image via API |
| **Conversion** | 🟡 Could drive viral growth but currently buried at page bottom with no CTA optimization |
| **Retention** | ❌ |
| **Differentiation** | 🟡 |

**Verdict: Freeze, don't kill.** Social sharing is a growth lever but currently implemented as an afterthought button at the bottom of a long page. Keep the API route, remove the button from the dashboard. Reintroduce prominently in the exam results page where the user is emotionally primed to share a score.

**Engineering impact:**
- Remove share button from dashboard footer
- **LOC removed:** ~10
- **Risk:** None. API route stays for future use.

---

### 3.7 🔴 KILL — Excess Exam Modes (Restructure)

| Attribute | Detail |
|-----------|--------|
| **Current** | 6 flat modes: practice, weak_domains, recent_misses, real_mix, domain_focus, spaced_review |
| **ExamConfigForm** | All 6 displayed in a flat list with no hierarchy (237 lines) |
| **Exam engine** | 574 lines with 6 mode-specific strategies |
| **Conversion** | ✅ Free: practice + domain_focus; Pro: all 6 |
| **Differentiation** | ✅ Mode variety is a genuine Pro value prop |

**Verdict: Don't kill the modes — kill the decision paralysis.** The 6 modes are genuine intellectual property in the exam engine. But presenting all 6 flat in a list creates choice overload. See `ux-simplification.md` for the restructured flow.

**What changes:**
- Default mode is **Smart Practice** (a renamed `real_mix` that auto-adjusts)
- Advanced modes hidden behind an "Advanced" accordion/toggle
- Free users see only Smart Practice + Domain Focus
- Pro users see Smart Practice as default with Advanced section containing weak_domains, recent_misses, spaced_review

**No engine code deleted** — only the UX presentation changes.

---

## 4. Kill Summary Table

| Feature | Verdict | LOC Impact | Files Affected | Risk |
|---------|---------|------------|----------------|------|
| PomodoroTimer | 🔴 KILL | -160 | 2 files + i18n | Zero |
| ActivityHeatmap | 🔴 KILL | -160 | 3 files + i18n | Low |
| BadgeGallery | 🔴 KILL | -100 | 2 files + types + i18n | Low |
| DailyChallengeModal | 🟡 FREEZE | -250 deactivated | 2 files + 1 API route | Low |
| Weekly/Daily Goals UI | 🟡 STRIP | -30 | 1 file | None |
| Share Progress button | 🟡 STRIP | -10 | 1 file | None |
| Exam mode presentation | 🔄 RESTRUCTURE | Net neutral | 1 file | Low |

**Total LOC eliminated/deactivated:** ~710  
**Files deleted:** 3 components  
**API routes deprecated:** 1 (daily-challenge)  
**Maintenance surface reduced:** 3 fewer components to test, translate, and style across 2 locales

---

## 5. What We Keep & Why

| Feature | Reason |
|---------|--------|
| **Streak counter** | Single number, high retention signal, low maintenance (already implemented as a card) |
| **Domain mastery bars** | Core exam prep value — shows users where they're weak, drives exam mode selection |
| **Exam engine (all 6 modes)** | Intellectual property + Pro conversion lever |
| **Analytics page** | Core value — exam history, score trends, readiness score |
| **Quick stats cards** | Exams taken, avg score, pass rate, readiness — pure signal, no noise |
| **Recent exams table** | Direct path back to review, drives exam retakes |
| **Export CSV** | Utility feature, low maintenance, Pro-gated |
| **Flashcard/Study page** | Separate study mode, complementary to exam engine |

---

## 6. Implementation Order

| Phase | Action | Sprint |
|-------|--------|--------|
| 1 | Delete PomodoroTimer (zero dependencies) | Day 1 |
| 2 | Delete BadgeGallery + deprecate badge computation | Day 1 |
| 3 | Delete ActivityHeatmap from dashboard + analytics | Day 1 |
| 4 | Strip weekly goal card + daily challenge button from dashboard | Day 1 |
| 5 | Strip share button from dashboard footer | Day 1 |
| 6 | Restructure ExamConfigForm (see `ux-simplification.md`) | Day 2-3 |
| 7 | Clean up orphaned i18n keys | Day 3 |
| 8 | Clean up orphaned types (BadgeId, etc.) | Day 3 |

**Estimated total effort:** 2-3 days for a solo developer. Mostly deletion, no new logic.

---

## 7. Post-Kill Dashboard Layout

After kills, the study detail dashboard becomes:

```
┌─────────────────────────────────────────┐
│ ← Back | Study Name | Edit | Delete     │
├─────────────────────────────────────────┤
│ 🔥 Streak: 12 days                     │
├──────────┬──────────┬──────────┬────────┤
│ Exams: 47│ Avg: 72% │ Pass: 68%│Ready:74│
├──────────┴──────────┴──────────┴────────┤
│ [Start Exam]  [Question Bank]  [Study]  │
├─────────────────────────────────────────┤
│ Domain Mastery                          │
│ ████████████████████░░░░ D1 78%         │
│ ██████████░░░░░░░░░░░░░ D2 45%         │
│ ...                                     │
├─────────────────────────────────────────┤
│ Recent Exams (table)                    │
│ ...                                     │
├─────────────────────────────────────────┤
│ [Export CSV]                            │
└─────────────────────────────────────────┘
```

**Removed:** Pomodoro timer, heatmap, badge gallery, weekly goal bar, daily challenge button, share button.  
**Result:** Clean, action-oriented dashboard that says "take exams, track domains, pass your cert."

---

## 8. Revenue Impact Analysis

| Metric | Before | After |
|--------|--------|-------|
| Dashboard cognitive load | High (9+ cards/sections) | Low (5 sections) |
| Time to "Start Exam" CTA | Scrolled past 3 retention widgets | Visible in top 3 actions |
| Free→Pro conversion path | Buried under gamification noise | Clear: "unlock Smart Practice + Advanced Modes" |
| Maintenance cost per sprint | ~2h on retention features | ~0h |
| i18n string count | ~50 retention keys × 2 locales | ~10 (streak only) |

The hypothesis: **removing distractions increases conversion because the Pro value prop (advanced exam modes + unlimited exams) becomes the loudest signal on the dashboard instead of competing with free gamification toys.**

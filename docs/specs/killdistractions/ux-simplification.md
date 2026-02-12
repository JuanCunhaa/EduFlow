# UX Simplification Plan

> **Role:** CPO + CTO  
> **Date:** 2025-01-XX  
> **Goal:** Reduce every screen to its minimum viable decisions. A user should go from login → taking an exam in under 10 seconds. Every extra click is a conversion leak.

---

## 1. Problem Statement

ExamFlow's current UX asks users to make **too many decisions** before they get value:

1. **ExamConfigForm** — 6 sections, 6 flat modes, 5 question counts, a time slider, 4 difficulty options, N domain toggles = **combinatorial explosion** before a single question is answered
2. **Study dashboard** — 9+ cards/sections competing for attention (streak, weekly goal, daily challenge, stats, actions, domains, badges, heatmap, pomodoro)
3. **No smart defaults** — every session starts from scratch with manual configuration

The fix: **opinionated defaults, progressive disclosure, and ruthless section reduction.**

---

## 2. ExamConfigForm Redesign

### 2.1 Current State (237 lines, 6 flat sections)

```
Study Selection     → N cards
Mode Selection      → 6 flat buttons (practice, weak_domains, recent_misses, real_mix, domain_focus, spaced_review)
Question Count      → 5 buttons (10, 25, 50, 100, 150)
Time Limit          → Slider 10-180 min
Difficulty          → 4 buttons (all, easy, medium, hard)
Domains             → N toggle buttons
[Start Exam]
```

**Problems:**
- 6 modes shown equally implies they're equally important — they're not
- New users face analysis paralysis at mode selection
- 15+ clickable elements before the start button
- No "just practice" quick-start path
- Free users see all 6 modes (4 disabled) — frustrating, not motivating

### 2.2 Redesigned Flow

```
Study Selection     → Keep (required)
─────────────────────────────────────
Quick Start         → [🚀 Smart Practice — 25 questions] ← BIG PRIMARY BUTTON
─────────────────────────────────────
▶ Advanced Options  → Collapsed accordion (click to expand)
  ├── Mode         → Dropdown or 3 tiles: Domain Focus, Weak Areas, Spaced Review
  ├── Questions    → 3 options: 10, 25, 50 (cut 100/150 — nobody finishes them)
  ├── Time Limit   → Dropdown: 30 / 60 / 90 min (cut slider, cut extremes)
  ├── Difficulty   → Keep: all / easy / medium / hard
  └── Domains      → Keep: toggle buttons
[Start Exam]       → Only shown when Advanced is expanded
```

### 2.3 Implementation Details

**Smart Practice mode** = renamed `real_mix` with these defaults:
- 25 questions
- 60 minutes
- All difficulties
- All domains
- Engine auto-mixes weak areas + recent misses + random (existing `real_mix` logic)

**Quick Start button** skips all configuration — one click, exam starts.

**Advanced Options** accordion:
- Collapsed by default
- Persists last-used settings in `localStorage`
- Shows mode selection as **3 tiles** (not 6):
  - **Domain Focus** (maps to `domain_focus`) — "Practice specific domains"
  - **Weak Areas** (maps to `weak_domains`) — "Target your lowest-scoring domains"
  - **Spaced Review** (maps to `spaced_review`) — "SM-2 algorithm picks what to review"
- `practice` becomes the hidden default behind "Smart Practice"
- `recent_misses` logic is absorbed into Smart Practice's `real_mix` behavior
- No separate `recent_misses` tile — it's redundant with `weak_domains`

**Free tier sees:**
- Quick Start (Smart Practice) — **this is the conversion unlock moment**
- Domain Focus in Advanced

**Pro tier sees:**
- Quick Start (Smart Practice)
- All 3 Advanced mode tiles + all options

### 2.4 Question Count Reduction

| Current | Proposed | Rationale |
|---------|----------|-----------|
| 10 | 10 | Quick practice |
| 25 | 25 | Default, manageable session |
| 50 | 50 | Serious practice |
| 100 | ❌ Cut | Completion rate likely <30% |
| 150 | ❌ Cut | CISSP real exam is 125-175 adaptive — this is not a simulation of that |

### 2.5 Time Limit Simplification

| Current | Proposed |
|---------|----------|
| Slider 10-180 min | Dropdown: 30 / 60 / 90 min |

A slider is fiddly on mobile. Three clear options cover all reasonable sessions. Default: 60 min.

### 2.6 Code Changes

```typescript
// New mode presentation (not engine changes - engine keeps all modes)
type ModeTile = {
  engineMode: ExamMode;
  label: string;      // i18n key
  desc: string;       // i18n key
  proOnly: boolean;
};

const ADVANCED_MODES: ModeTile[] = [
  { engineMode: 'domain_focus', label: 'domainFocus', desc: 'domainFocusDesc', proOnly: false },
  { engineMode: 'weak_domains', label: 'weakAreas', desc: 'weakAreasDesc', proOnly: true },
  { engineMode: 'spaced_review', label: 'spacedReview', desc: 'spacedReviewDesc', proOnly: true },
];

// Quick Start defaults
const SMART_DEFAULTS = {
  mode: 'real_mix' as ExamMode,
  questionCount: 25,
  timeLimitMinutes: 60,
  difficulty: 'all' as const,
  domainIds: [],  // all domains
};
```

**Estimated LOC change:** Net -50 to -80 lines (removal of flat mode list + slider, addition of accordion + quick start).

---

## 3. Dashboard Simplification

### 3.1 Current Layout (post `kill-distractions.md`)

After killing PomodoroTimer, ActivityHeatmap, BadgeGallery, and stripping goals/daily challenge/share:

```
Header (study name + edit/delete)
Streak card (keep)
Quick stats (4 cards: exams, avg score, pass rate, readiness)
Quick actions (3 cards: Start Exam, Question Bank, Study)
Domain mastery (progress bars)
Recent exams (table)
Export CSV
```

### 3.2 Optimized Layout

```
┌─────────────────────────────────────────────────┐
│ ← Studies  |  CISSP  |  📝 Edit                │
├─────────────────────────────────────────────────┤
│                                                 │
│  [🚀 Start Smart Practice — 25 Questions]       │  ← BIGGEST element on page
│                                                 │
├──────────┬──────────┬──────────┬────────────────┤
│ 🔥 12    │ Avg 72%  │ Pass 68% │ Ready 74%      │
│ streak   │ score    │ rate     │ readiness      │
├──────────┴──────────┴──────────┴────────────────┤
│ Domain Mastery                                  │
│ ████████████████████░░░░ D1 Security... 78%     │
│ ██████████░░░░░░░░░░░░░ D2 Asset...    45%     │
│ ...                                             │
├─────────────────────────────────────────────────┤
│ Recent Exams                 [View Analytics →] │
│ Jan 15  |  25Q  |  84%                          │
│ Jan 14  |  50Q  |  68%                          │
├─────────────────────────────────────────────────┤
│ [Question Bank]  [Study Mode]  [Export CSV]     │
└─────────────────────────────────────────────────┘
```

**Key changes:**
1. **Start Exam is the hero CTA** — huge primary button at the top, not one of three equal cards
2. **Streak folded into stats row** — not a standalone card with a flame icon taking up a full grid column
3. **Secondary actions demoted to footer row** — Question Bank, Study Mode, Export are utility links, not primary calls to action
4. **No scroll to reach exam CTA** — on mobile, the start button is above the fold

### 3.3 Information Hierarchy

| Priority | Element | Visibility |
|----------|---------|------------|
| P0 | Start Exam CTA | Above fold, largest element |
| P1 | Stats row (streak, avg, pass rate, readiness) | Immediately below CTA |
| P2 | Domain mastery | Shows where to focus |
| P3 | Recent exams | Quick access to review |
| P4 | Secondary actions | Footer utility bar |

### 3.4 Mobile-First Considerations

Current dashboard on mobile requires 4-5 scroll gestures to reach the bottom. Post-simplification:
- **0 scrolls** to see CTA + stats
- **1 scroll** to see domains + recent exams
- **2 scrolls** to see secondary actions + export

---

## 4. Exam Results Page — Add Share Here

The share progress button removed from the dashboard (per `kill-distractions.md`) should resurface here:

```
┌─────────────────────────────────────┐
│ Exam Complete!                      │
│                                     │
│        84%                          │
│    21/25 correct                    │
│                                     │
│ [Review Answers] [Share Score 📤]   │
│ [Start New Exam]                    │
└─────────────────────────────────────┘
```

**Why here:** The user just finished an exam and has an emotional response (pride or determination). This is the moment they'll share, not while browsing a dashboard. Single-line change: move the share link to `ExamResults.tsx`.

---

## 5. Navigation Simplification

### 5.1 Current Sidebar Items

Based on the route structure:
- Dashboard (`/dashboard`)
- Exams (`/exams`)
- Questions (`/questions`)
- Study (`/study`)
- Analytics (`/analytics`)
- Marketplace (`/marketplace`)
- Login (`/login`)

### 5.2 Proposed Sidebar

| Item | Keep/Change | Notes |
|------|-------------|-------|
| Dashboard | ✅ KEEP | Home base |
| Practice | ✅ RENAME from "Exams" | "Practice" is less intimidating than "Exams" |
| Questions | 🟡 DEMOTE | Move to dashboard utility row; question management is admin-like, not daily use |
| Study | 🟡 DEMOTE | Move to dashboard utility row; flashcards are secondary |
| Analytics | ✅ KEEP | Core value prop |
| Marketplace | ✅ KEEP | Growth/monetization vector |
| Login | ✅ KEEP | Auth flow |

**Result:** 4 sidebar items (Dashboard, Practice, Analytics, Marketplace) instead of 6+. Less noise, clearer paths.

---

## 6. ExamConfigForm — Detailed Wireframe

### Free User View

```
┌──────────────────────────────────────┐
│ Configure Your Practice              │
│                                      │
│ Study: [CISSP ▼]                     │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ 🚀 Smart Practice               │ │
│ │ 25 questions • All domains •    │ │
│ │ Auto-adapts to your weaknesses  │ │
│ │                                 │ │
│ │ [Start Now]                     │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ▶ Customize (advanced options)       │
│   └─ Mode: Domain Focus             │
│   └─ Questions: 10 / 25 / 50        │
│   └─ Time: 30 / 60 / 90 min         │
│   └─ Difficulty: All / Easy / ...    │
│   └─ Domains: [D1] [D2] [D3] ...    │
│   └─ [Start Custom Exam]            │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ 🔒 Unlock Weak Areas +          │ │
│ │    Spaced Review with Pro       │ │
│ │ [Upgrade to Pro →]              │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

### Pro User View

```
┌──────────────────────────────────────┐
│ Configure Your Practice              │
│                                      │
│ Study: [CISSP ▼]                     │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ 🚀 Smart Practice               │ │
│ │ 25 questions • All domains •    │ │
│ │ Auto-adapts to your weaknesses  │ │
│ │                                 │ │
│ │ [Start Now]                     │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ▶ Customize (advanced options)       │
│   └─ Mode: [Domain Focus]           │
│   │        [Weak Areas]  ★ PRO      │
│   │        [Spaced Review] ★ PRO    │
│   └─ Questions: 10 / 25 / 50        │
│   └─ Time: 30 / 60 / 90 min         │
│   └─ Difficulty: All / Easy / ...    │
│   └─ Domains: [D1] [D2] [D3] ...    │
│   └─ [Start Custom Exam]            │
└──────────────────────────────────────┘
```

---

## 7. Implementation Plan

| Step | Task | Effort | Dependencies |
|------|------|--------|-------------|
| 1 | Refactor ExamConfigForm: add Quick Start + collapse advanced | 4h | `kill-distractions.md` cleanup done |
| 2 | Add `localStorage` persistence for last-used advanced settings | 1h | Step 1 |
| 3 | Restructure dashboard layout: hero CTA + compressed stats | 3h | `kill-distractions.md` cleanup done |
| 4 | Move share button to ExamResults page | 30m | None |
| 5 | Rename "Exams" → "Practice" in sidebar + navigation | 30m | None |
| 6 | Demote Question Bank + Study to dashboard utility row | 1h | Step 3 |
| 7 | Add upgrade CTA card to ExamConfigForm for free users | 1h | Step 1 |
| 8 | Update i18n keys (en + pt-BR) | 1h | All above |

**Total estimated effort:** ~12 hours (1.5 dev days)

---

## 8. Metrics to Track Post-Simplification

| Metric | Measurement | Target |
|--------|-------------|--------|
| Time to first exam | Timestamp: page load → exam start | < 10s for Quick Start |
| ExamConfigForm completion rate | Started config → clicked Start | > 80% (vs current unknown) |
| Quick Start vs Advanced usage | % of exams using Quick Start defaults | > 60% in first month |
| Mobile scroll depth | Avg scroll on dashboard | < 2 scroll gestures |
| Free→Pro upgrade clicks | Clicks on upgrade CTA in config form | Track baseline |

---

## 9. Anti-Patterns to Avoid

1. **Don't hide everything** — Domain mastery and analytics are core value; keep them visible
2. **Don't remove the advanced path** — Power users who configure 50Q domain-specific exams are your most engaged Pro users
3. **Don't auto-start without any choice** — Users still need to select their study/certification
4. **Don't A/B test this** — With a small user base, just ship the simpler version and watch retention

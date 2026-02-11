# Responsiveness Audit — ISC2 Training Platform

**Auditor Role:** Mobile UX Specialist  
**Date:** 2026-02-11  
**Scope:** Phone (320–480px), Tablet (768–1024px), Laptop (1024–1440px), Ultrawide (1440px+)  
**Overall Grade:** B

---

## Breakpoint Architecture

The app uses **Tailwind CSS v4** responsive prefixes:

| Prefix | Width | Used For |
|--------|-------|----------|
| default | 0px+ | Mobile-first base styles |
| `sm:` | 640px+ | Small tablets |
| `md:` | 768px+ | Tablets, sidebar toggle |
| `lg:` | 1024px+ | Desktop layout |
| `xl:` | 1280px+ | Wide desktop |

**Sidebar breakpoint:** `md:` (768px) — below this, hamburger + overlay pattern.

---

## Per-Viewport Assessment

### Phone (320–480px) — Grade: C+

| Component | Status | Issues |
|-----------|--------|--------|
| Login | ✅ Good | Centered card, readable at 320px |
| Dashboard | ✅ Good | Single-column grid, cards stack |
| Sidebar | ✅ Good | Hamburger + overlay, auto-close on nav |
| Header | ✅ Good | Compact, avatar + theme toggle fit |
| StudyFormDialog | ⚠️ OK | Modal fills screen, domains scrollable |
| ExamConfigForm | ⚠️ OK | Sliders work on touch, but labels cramped |
| **ExamSession** | **❌ Poor** | Navigator dots unusable at 100+, timer text small |
| **ExamResults** | **⚠️ OK** | Action buttons overflow horizontally |
| **QuestionTable** | **❌ Poor** | Action buttons invisible (hover-only), no horizontal scroll |
| Daily Challenge | ✅ Good | Modal adapts, options full-width |
| BadgeGallery | ✅ Good | Grid wraps correctly |
| Analytics | ⚠️ OK | Charts readable but domain bars cramped |

### Tablet (768–1024px) — Grade: B+

| Component | Status | Issues |
|-----------|--------|--------|
| Layout | ✅ Good | Sidebar visible, content has room |
| Dashboard | ✅ Good | 2-column grid at `md:grid-cols-2` |
| ExamSession | ⚠️ OK | Navigator dots still dense at 150 |
| QuestionTable | ⚠️ OK | Hover works with mouse, but touch users still affected |
| All modals | ✅ Good | Centered with max-width, backdrop |

### Laptop (1024–1440px) — Grade: A

| Component | Status | Issues |
|-----------|--------|--------|
| All | ✅ Excellent | This is the design target — everything works perfectly |
| Dashboard | ✅ | 3-column grid at `lg:grid-cols-3` |
| ExamSession | ✅ | Navigator dots manageable at `max-w-lg` |
| QuestionTable | ✅ | Full table with hover actions |

### Ultrawide (1440px+) — Grade: B+

| Component | Status | Issues |
|-----------|--------|--------|
| Layout | ⚠️ OK | Content uses `max-w-7xl` via Shell — prevents stretching |
| Dashboard | ⚠️ | Grid goes to 3 columns max — wasted space on ultrawide |
| ExamSession | ✅ | Centered `max-w-3xl` — clean |
| Analytics | ⚠️ | Charts could use the extra width |

---

## Critical Issues (P1–P2)

### 1. QuestionTable action buttons invisible on touch devices (P1)
**Location:** [src/components/questions/QuestionTable.tsx](src/components/questions/QuestionTable.tsx)  
**Problem:** Edit and Delete buttons use `opacity-0 group-hover:opacity-100`. On touch devices, there is no hover state — buttons are permanently invisible.  
**Impact:** Mobile/tablet users cannot edit or delete individual questions.  
**Fix:** Always show action buttons on `md:` screens and below. Use `opacity-100 md:opacity-0 md:group-hover:opacity-100`.

### 2. Exam navigator dots unusable at 100+ questions on mobile (P1)
**Location:** [src/components/exams/ExamSession.tsx](src/components/exams/ExamSession.tsx)  
**Problem:** Navigator uses `flex flex-wrap gap-1` with `w-3 h-3` dots inside `max-w-lg`. At 150 questions, this creates 10+ rows of tiny 12px dots that are impossible to tap accurately.  
**Impact:** Students can't navigate to specific questions during a long exam on mobile.  
**Fix Options:**
- A) Paginated slider: show 20 dots at a time with "<<" ">>" controls
- B) Collapsed groups: show domain-grouped sections that expand
- C) Scrollable single row with snap points and current-question centering

### 3. No `prefers-reduced-motion` support — WCAG 2.1 failure (P1)
**Location:** [src/app/globals.css](src/app/globals.css)  
**Problem:** All animations run unconditionally: `glow-pulse`, `ambient-glow`, `fade-in`, `stagger`, `shimmer`. Users with vestibular disorders or motion sensitivity cannot disable them.  
**Impact:** Accessibility compliance failure (WCAG 2.1 SC 2.3.3).  
**Fix:** Add at the end of globals.css:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 4. Close/action buttons below 44px tap target (P2)
**Location:** Multiple components  
**Problem:** Close buttons (`w-5 h-5`, `w-6 h-6`) and navigator dots (`w-3 h-3`) are well below the iOS/Android recommended 44×44px minimum tap target.  
**Affected:**
- Modal close buttons: ~20px actual touch area
- Navigator dots: 12px
- Theme dropdown options: ~32px height
- Badge gallery badges: touch target adequate for grid but close for tooltip trigger

**Fix:** Add `min-w-[44px] min-h-[44px]` with flex-center on interactive elements, or use padding to expand tap area without changing visual size.

### 5. ExamResults action buttons overflow on narrow screens (P2)
**Location:** [src/components/exams/ExamResults.tsx](src/components/exams/ExamResults.tsx)  
**Problem:** "Review Answers", "New Exam", "Share", "Back" buttons in a horizontal row overflow off-screen at 320px.  
**Fix:** Stack buttons vertically on mobile: `flex-col sm:flex-row`.

### 6. All modals except ConfirmDialog lack focus traps (P2)
**Location:** [StudyFormDialog.tsx](src/components/studies/StudyFormDialog.tsx), [ImportDialog.tsx](src/components/questions/ImportDialog.tsx), [DailyChallengeModal.tsx](src/components/retention/DailyChallengeModal.tsx), [ExamConfigForm.tsx](src/components/exams/ExamConfigForm.tsx)  
**Problem:** `ConfirmDialog` correctly implements focus trap, Escape handling, and body scroll lock. Other modals/dialogs rely on simple backdrop click but don't trap focus.  
**Impact:** Keyboard-only users and screen readers can tab out of modals into background content.  
**Fix:** Extract the focus trap logic from ConfirmDialog into a reusable `<DialogWrapper>` and apply to all modals.

---

## Moderate Issues (P3)

### 7. Form labels not connected via `htmlFor`/`id`
**Location:** [ExamConfigForm.tsx](src/components/exams/ExamConfigForm.tsx), [QuestionForm.tsx](src/components/questions/QuestionForm.tsx), [StudyFormDialog.tsx](src/components/studies/StudyFormDialog.tsx)  
**Problem:** Labels are visual only — not associated with inputs via `htmlFor`/`id` attributes. Screen readers can't associate labels with controls.  
**Fix:** Add matching `id` to inputs and `htmlFor` to labels.

### 8. Theme dropdown lacks keyboard navigation
**Location:** [src/components/layout/Header.tsx](src/components/layout/Header.tsx)  
**Problem:** Theme dropdown opens on click and dismisses on outside-click. No arrow-key navigation, no `role="listbox"`, no `aria-expanded`.  
**Fix:** Add `role="listbox"` / `role="option"`, arrow key handlers, `aria-expanded` attribute.

### 9. Toast can overflow viewport on mobile
**Location:** [src/components/ui/Toast.tsx](src/components/ui/Toast.tsx)  
**Problem:** Toast positioned at `bottom-4 right-4` with `min-w-[320px]`. On a 320px viewport, the toast extends off-screen.  
**Fix:** Use `max-w-[calc(100vw-2rem)]` and center on mobile: `left-4 right-4 sm:left-auto sm:right-4`.

### 10. Sidebar overlay doesn't prevent body scroll on mobile
**Location:** [src/components/layout/Sidebar.tsx](src/components/layout/Sidebar.tsx)  
**Problem:** When sidebar overlay is visible on mobile, the background page can still scroll. ConfirmDialog correctly applies scroll lock but Sidebar doesn't.  
**Fix:** Add `overflow: hidden` to `body` when mobile sidebar is open.

### 11. ExamConfigForm domain checkboxes cramped on mobile
**Location:** [src/components/exams/ExamConfigForm.tsx](src/components/exams/ExamConfigForm.tsx)  
**Problem:** Domain multi-select checkboxes in a `grid grid-cols-2` get cramped on small screens with long domain names. Text truncation or wrapping makes selections unclear.  
**Fix:** Single column on mobile: `grid-cols-1 sm:grid-cols-2`.

### 12. Analytics chart width doesn't adapt
**Location:** [src/app/analytics/page.tsx](src/app/analytics/page.tsx)  
**Problem:** Score trend and domain performance visualizations use fixed-ish widths. On very narrow screens, bar charts may truncate domain labels.  
**Fix:** Use percentage widths and truncate long domain names with `text-ellipsis overflow-hidden`.

### 13. Share image route generates fixed-dimension image
**Location:** [src/app/api/share-image/route.tsx](src/app/api/share-image/route.tsx)  
**Problem:** Generates a 1200×630px image regardless of sharing context. This is correct for OG metadata but not for in-app display on mobile.  
**Impact:** Low — the image is for external sharing. No fix needed.

---

## Accessibility Summary

| Category | Status | Details |
|----------|--------|---------|
| Color contrast | ✅ Good | oklch tokens with intentional contrast ratios |
| Focus indicators | ⚠️ Partial | Some interactive elements lack visible focus ring |
| Focus traps | ⚠️ Partial | Only ConfirmDialog. Other modals vulnerable |
| Keyboard navigation | ⚠️ Partial | Theme dropdown, exam session missing |
| Screen reader labels | ⚠️ Partial | Form labels not connected |
| Reduced motion | ❌ Missing | No `prefers-reduced-motion` media query |
| Touch targets | ❌ Below spec | Multiple elements below 44px |
| Semantic HTML | ✅ Good | Proper heading hierarchy, button vs anchor usage |
| ARIA attributes | ⚠️ Partial | Missing on dropdown, badges, progress bars |

---

## Responsive Pattern Inventory

### Patterns Used Correctly
- `md:hidden` / `md:flex` for sidebar toggle
- `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` for study cards
- `max-w-7xl mx-auto` for content containment
- `flex-col sm:flex-row` for button groups (some components)
- Mobile-first CSS: base styles target smallest screen

### Patterns Missing
- No `container` queries (new CSS feature, Tailwind v4 supports)
- No `clamp()` for fluid typography
- No responsive font sizes — all fixed
- No viewport-aware padding adjustments beyond Tailwind defaults
- No `aspect-ratio` usage for media elements

---

## Priority Action Plan

| Priority | Fix | Viewport | Effort |
|----------|-----|----------|--------|
| **P1** | QuestionTable: always show actions on touch | Phone | 15 min |
| **P1** | Add `prefers-reduced-motion` media query | All | 10 min |
| **P1** | Paginate exam navigator dots at 100+ | Phone/Tablet | 2 hr |
| **P2** | Expand tap targets to 44px minimum | Phone | 1 hr |
| **P2** | Stack ExamResults buttons on mobile | Phone | 10 min |
| **P2** | Focus traps for all modals (reuse ConfirmDialog logic) | All | 2 hr |
| **P3** | Connect form labels via htmlFor/id | All | 30 min |
| **P3** | Theme dropdown keyboard navigation | All | 1 hr |
| **P3** | Toast responsive positioning | Phone | 15 min |
| **P3** | Sidebar body scroll lock on mobile | Phone | 15 min |
| **P3** | Single-column domain checkboxes on mobile | Phone | 5 min |
| **P3** | Analytics chart fluid widths | Phone | 30 min |

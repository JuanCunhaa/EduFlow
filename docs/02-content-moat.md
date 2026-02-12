# 02 — Content Moat

---

## Problem Statement

ExamFlow is a container with no content advantage. The exam engine is sophisticated, but the questions inside it are the product. Currently, only the admin (founder) creates content. There are no third-party contributors, no licensed content, no content partnerships. A competitor with 10,000 quality questions and a mediocre engine will outsell ExamFlow with 500 questions and a brilliant engine.

Content is the moat in ed-tech. Algorithms are replicable. Curated, expert-reviewed question banks are not.

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Total questions (ISC2) | 5,000 by Day 60 |
| Total questions (all certs) | 8,000 by Day 90 |
| Questions per domain balance | No domain <15% of total |
| Question quality score (user ratings) | 4.2+ / 5.0 average |
| Content creators onboarded | 3+ by Day 60, 5+ by Day 90 |

---

## MVP Scope (2 weeks)

### 1. Content Quality Framework

- Add `rating` field to Question type: `{ totalRatings: number, averageRating: number }`
- Post-exam review: "Was this question helpful?" (thumbs up/down per question)
- Flag bad questions: "Report this question" → admin review queue
- Track: questions with <3.0 rating after 10+ ratings get auto-flagged

### 2. AI-Assisted Question Generation Pipeline

- Script: `scripts/generate-questions.ts`
- Input: domain name + key topics + difficulty target
- Output: JSON matching `Question` schema (text, 4 options, correctOptionIndex, explanation with whyOthersWrong)
- Human review step: generated questions go to `marketplace/pending` collection, admin approves/edits/rejects
- Target: 100 questions/day generation rate with 70% approval rate after editing

### 3. Content Gap Analysis

- API endpoint: `GET /api/analytics/content-gaps?studyId=`
- Returns: domains with <100 questions, difficulty imbalances, topics with no coverage
- Dashboard widget for admin: "Content Health" showing gaps per study

### 4. Bulk Import Enhancement

- Current: `bulkCreateMarketplaceQuestions` exists but is admin-only with 498 limit
- Add: CSV/JSON template download for external contributors
- Add: validation report (preview errors before import)
- Add: duplicate detection (fuzzy match on question text, >85% similarity = flag)

---

## Phase 2 Scope (6–8 weeks)

1. **Expert Creator Onboarding** — Recruit 3-5 CISSP/CC/SSCP holders from LinkedIn, r/cissp, ISC2 community. Offer: revenue share (70% creator / 30% platform) on question pack sales, or flat $2/question for bulk creation.
2. **Creator Dashboard** — `/creator` route: upload questions, see ratings, track imports of their packs, revenue reporting.
3. **Question Versioning** — Track edits to questions. If a question is updated, users who previously answered it see the updated version on next encounter.
4. **Content Licensing** — Reach out to ISC2 training providers (Destination Certification, Thor Teaches, Kelly Handerhan). License 1,000+ questions per partnership. Budget: $5,000-$10,000 per content deal.
5. **Domain Coverage Scoring** — Public-facing "coverage score" per study: "CISSP: 95% domain coverage (4,800 questions across all 8 domains)". This becomes a marketing differentiator.
6. **Difficulty Calibration** — Use cross-user performance data to auto-calibrate question difficulty. A question marked "medium" that 95% of users get right should be recalibrated to "easy".

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| AI-generated questions have factual errors | 🔴 High | Mandatory human review. No AI question goes live without expert approval. Flag AI-generated questions in metadata. |
| Copyright claims from ISC2 or competitors | 🔴 High | Never copy questions verbatim. All questions must be original. Add legal disclaimer. Consult IP attorney before licensing deals. |
| Low creator supply (no one wants to write questions) | 🟡 Medium | Start with paid creation ($2/question) before rev-share model. Prove demand first. |
| Quality variance across creators | 🟡 Medium | Mandatory review queue. Rating system surfaces bad content fast. Minimum quality bar: 3.5+ average rating to stay published. |
| Content doesn't match real exam style | 🟡 Medium | Beta users validate: "Does this feel like the real exam?" Survey after every exam. Iterate based on feedback. |

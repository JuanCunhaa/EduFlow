# 09 — Creator Marketplace

---

## Problem Statement

The current "marketplace" is an admin-only CMS. Only the founder can create and publish content. This is not a marketplace — it's a content management system with an import button. A real marketplace has supply-side creators who bring their own audience, create content at scale, and generate network effects.

The marketplace label says "created by the community" but there is no community. The "Free" badge is hardcoded on every item because there's no pricing model for content.

Transforming this into a real creator platform is the path to content scale without the founder writing every question.

---

## Success Metrics

| Metric | Target |
|--------|--------|
| External creators onboarded | 3 by Day 60, 10 by Day 120 |
| Creator-generated questions | 2,000+ by Day 90 |
| Question packs published | 10+ by Day 90 |
| Creator revenue paid out | $1,000+ by Day 120 |
| Marketplace import rate | 100+ imports/month by Day 90 |

---

## MVP Scope (2 weeks)

### 1. Creator Application Flow

- `/creator/apply` — Public form: name, email, certifications held, LinkedIn, sample question (proves competency)
- Applications stored in `creatorApplications/{applicationId}`
- Admin reviews and approves/rejects (manual for now)
- Approved creators get `role: 'creator'` on their profile

### 2. Creator Upload Flow

- Creators use existing bulk import with a new route: `POST /api/marketplace/creator/submit`
- Questions go to `marketplace/pending/{studyId}/questions` (review queue, not live)
- Admin reviews: approve (move to live) / reject (with feedback) / edit
- Creator sees status: submitted → in review → approved / rejected

### 3. Creator Profile

- `/creator/[creatorId]` — public profile page
- Shows: name, certifications, total questions published, average rating, total imports
- Links to their published question packs

### 4. Revenue Share Model (Phase 1: Simple)

For MVP, creators are compensated with:
- **Flat rate:** $2 per approved question (paid monthly via PayPal/Wise)
- Track in `creators/{creatorId}/payouts`
- Manual payout process initially (founder sends payment)

Later (Phase 2): switch to per-import revenue share when marketplace has paid packs.

### 5. Quality Gate

- All creator questions go through admin review queue
- Minimum standards: structured explanation required, `whyOthersWrong` for all options, no typos, factually accurate
- Questions with <3.0 user rating after 20 reviews get auto-unpublished + creator notified

---

## Phase 2 Scope (6–8 weeks)

1. **Paid question packs** — Creators price their packs ($5-$30 per pack). ExamFlow takes 30% commission. Stripe Connect for creator payouts (automated, no manual transfers).
2. **Creator dashboard** — Analytics: questions published, total imports, ratings, revenue earned, pending reviews. Notification for review outcomes.
3. **Creator leaderboard** — Top creators by imports, ratings, questions published. Featured on marketplace homepage. Social proof + competitive motivation.
4. **Study pack bundles** — Multiple creators' questions combined into a "Complete CISSP Prep" bundle at a discount. ExamFlow curates bundles.
5. **Creator tools** — In-app question editor (not just bulk import). Markdown support for explanations. Preview mode. Duplicate checker against existing question bank.
6. **Community rating + reviews** — Users rate entire question packs (not just individual questions). Written reviews shown on pack page. Helps buyers evaluate quality.
7. **Revenue share transition** — Move from flat rate to 70/30 split on paid pack revenue. Creators earn based on their pack's success, not just volume.

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| No one applies to create content | 🔴 High | Active outreach: DM CISSP instructors on LinkedIn, post in certification communities. Offer flat $2/question to seed supply. |
| Creator content quality is poor | 🟡 Medium | Mandatory review queue. Quality guidelines document. Reject ruthlessly — 1 bad question harms the product more than 0 questions. |
| IP disputes (creator submits plagiarized content) | 🔴 High | Creator agreement: all content must be original. Duplicate detection against known question banks. Creator assumes liability in ToS. |
| Review bottleneck (founder can't review fast enough) | 🟡 Medium | Prioritize review speed. Set SLA: 48h review turnaround. Eventually recruit trusted creators as reviewers (peer review). |
| Creators feel underpaid at $2/question | 🟡 Medium | $2/question is competitive for content writing. Frame as: build your reputation, earn more when marketplace goes paid. Increase rate for high-rated creators. |
| Marketplace becomes cluttered with mediocre content | 🟡 Medium | Curated featured section. Quality sorting (highest rated first). Minimum rating to stay listed. |

# Creator Marketplace — Platform Spec

> Status: DRAFT
> Date: 2026-02-12
> Role: Marketplace GM + Product
> Depends on: `monetization-stripe-spec.md`, `pricing-tiers.md`
> Related: `creator-incentives-revenue-share.md`, `moderation-review.md`, `creator-tools.md`, `marketplace-economy.md`

---

## 1. Executive Summary

### Current State

The ExamFlow marketplace is **admin-only**. All marketplace content (`marketplace_studies`, `marketplace_questions`) is created through `withAdmin` routes by platform operators. There is no concept of a creator, no submission workflow, no revenue model, and no quality control pipeline. Content is free to import.

### Target State

A **creator marketplace** where verified cybersecurity professionals publish paid and free question packs. Creators earn revenue share. Content is quality-controlled before publication. Buyers rate and review packs. The marketplace becomes ExamFlow's content moat — a flywheel where better content attracts more users, which attracts more creators, which produces more content.

### Why Now

| Signal | Implication |
|--------|-------------|
| Solo founder can't write 10,000+ questions alone | Need external content supply |
| Competitors (Boson, Kaplan) have proprietary content | Need a structural advantage they can't copy |
| Certified professionals have deep domain knowledge | They can write better questions than any single team |
| Platform already has import infrastructure | Minimal engineering distance to creator model |

---

## 2. Marketplace Participants

| Role | Description | Current | Target |
|------|-------------|---------|--------|
| **Platform** | ExamFlow (operator) | Admin-only CRUD | Rules, moderation, discovery, payouts |
| **Creator** | Certified professional who publishes question packs | Does not exist | Verified creator with dashboard |
| **Buyer** | User who purchases/imports a pack | Free import only | Free + paid acquisition |
| **Reviewer** | User who reviews a purchased pack | Does not exist | Post-purchase ratings & reviews |

---

## 3. Creator Lifecycle

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        CREATOR LIFECYCLE                                 │
│                                                                          │
│  ┌─────────┐    ┌──────────┐    ┌────────┐    ┌──────────┐    ┌───────┐ │
│  │  Apply   │───→│  Verify  │───→│ Draft  │───→│  Review  │───→│  Live │ │
│  │          │    │          │    │        │    │          │    │       │ │
│  └─────────┘    └──────────┘    └────────┘    └──────────┘    └───────┘ │
│       │              │              │              │              │      │
│   Application   Cert proof     Content         Moderation    Published   │
│   form + ToS    + ID verify    creation        queue         & earning   │
│                                                                          │
│  Rejection loops back to Apply (with feedback).                          │
│  Review loops back to Draft (with revision notes).                       │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Creator Onboarding

### 4.1 Application

**Route:** `/marketplace/creators/apply`

**Application form fields:**

| Field | Type | Required | Purpose |
|-------|------|----------|---------|
| Full legal name | text | ✅ | Payout identity |
| Professional email | email | ✅ | Verification contact |
| LinkedIn profile URL | url | ✅ | Professional background check |
| Certifications held | multi-select | ✅ | Which certs they can write for |
| Certification proof | file upload (PDF/image) | ✅ | Cert document, digital badge, or Credly link |
| Years of experience | select (1-3, 3-5, 5-10, 10+) | ✅ | Quality signal |
| Writing sample | textarea | ✅ | 2-3 sample questions in ExamFlow format |
| Bio (public) | textarea | ✅ | Shown on creator profile |
| Payout method preference | select (Stripe Connect, PayPal) | ✅ | Revenue share delivery |
| Agree to Creator Terms of Service | checkbox | ✅ | Legal |

### 4.2 Verification Process

**Goal:** Confirm the applicant holds the certifications they claim and can write quality questions.

| Step | Method | SLA | Who |
|------|--------|-----|-----|
| 1. Auto-screen | Check for completeness, valid email, LinkedIn exists | Instant | System |
| 2. Cert verification | Manual: verify cert doc/badge matches name. Cross-reference Credly public profile if available. | 48h | Platform admin |
| 3. Writing sample review | Evaluate 2-3 sample questions for accuracy, explanation quality, option plausibility | 48h (parallel with #2) | Platform admin or subject-matter reviewer |
| 4. Decision | Approve, reject (with reason), or request more info | Within 72h total | Platform admin |

**Verification outcomes:**

| Decision | Effect |
|----------|--------|
| **Approved** | Creator account activated. Dashboard unlocked. Creator badge displayed. |
| **Rejected** | Email with specific reason. Can reapply after 30 days. Common reasons: unverifiable cert, low-quality writing sample, insufficient experience. |
| **Needs revision** | Email requesting additional info (e.g., clearer cert scan). Application stays open 14 days. |

### 4.3 Creator Badges

Publicly displayed on creator profiles and their packs:

| Badge | Criteria | Display |
|-------|----------|---------|
| **Verified Creator** | Passed verification | ✅ shield icon |
| **CISSP Certified** | Holds active CISSP | Cert-specific badge |
| **CC Certified** | Holds active CC | Cert-specific badge |
| **Top Creator** | ≥500 sales + ≥4.5 avg rating | ⭐ gold badge |
| **Rising Star** | ≥50 sales in first 90 days | 🚀 badge |
| **Quality Author** | 0 content violations, ≥20 packs published | 💎 badge |

### 4.4 Creator Profile

Public page at `/marketplace/creators/{creatorSlug}`

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ┌────┐  Jane Smith, CISSP, CCSP               ✅ Verified      │
│  │ 📷 │  Senior Security Architect · 12 yrs experience          │
│  └────┘                                                          │
│          "I write questions the way the real exam challenges      │
│           you — scenario-based, no memorization tricks."          │
│                                                                  │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌──────────────┐    │
│  │ 8 Packs   │ │ 1,240 Q   │ │ 4.8 ★     │ │ 680 Sales    │    │
│  └───────────┘ └───────────┘ └───────────┘ └──────────────────┘  │
│                                                                  │
│  Published Packs                                                 │
│  ┌────────────────────┐ ┌────────────────────┐                   │
│  │ CISSP Domain 1     │ │ CISSP Full Exam    │                   │
│  │ 75 questions       │ │ 150 questions      │                   │
│  │ ★★★★★ (42)        │ │ ★★★★☆ (28)        │                   │
│  │ $9.99             │ │ $19.99             │                   │
│  └────────────────────┘ └────────────────────┘                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 5. Content Model — Question Packs

### 5.1 What Changes

The current `MarketplaceStudy` becomes a **Question Pack** — a purchasable unit of content created by a creator.

| Concept | Current | Creator Marketplace |
|---------|---------|-------------------|
| Content unit | `MarketplaceStudy` (admin-managed) | **Question Pack** (creator-managed, admin-approved) |
| Pricing | Free (all packs) | Free or paid ($2.99–$49.99) |
| Content creation | Admin API only | Creator dashboard with submission workflow |
| Quality assurance | None (admin trust) | Review queue → approval → periodic audit |
| Attribution | `createdBy` field (uid only) | Full creator profile with badge and bio |

### 5.2 Question Pack Data Model

Extends `MarketplaceStudy` with creator and commerce fields:

```typescript
interface QuestionPack {
    // ── Identity ──
    id: string;
    slug: string;                          // URL-safe, unique (e.g., "cissp-domain1-deep-dive")
    
    // ── Content ──
    certId: string;                        // "cissp", "cc", "sscp", etc.
    title: string;                         // "CISSP Domain 1 Deep Dive"
    description: string;                   // Rich text, max 2000 chars
    domains: MarketplaceDomain[];          
    questionCount: number;                 // denormalized
    domainQuestionCounts: Record<string, number>;
    sampleQuestionIds: string[];           // 3-5 preview questions (always visible)
    difficultyDistribution: {              // % breakdown shown to buyers
        easy: number;
        medium: number;
        hard: number;
    };
    tags: string[];
    
    // ── Creator ──
    creatorId: string;                     // creator's uid
    creatorSlug: string;                   // for profile link
    creatorName: string;                   // denormalized display name
    creatorBadges: string[];               // denormalized badge list
    
    // ── Commerce ──
    pricing: 'free' | 'paid';
    priceUsd: number;                      // 0 for free, 299–4999 cents for paid
    stripePriceId: string | null;          // Stripe price object ID
    stripeProductId: string | null;        // Stripe product object ID
    
    // ── Metrics ──
    salesCount: number;                    // purchases (paid) or imports (free)
    totalRevenue: number;                  // cents, platform gross
    averageRating: number;                 // 1.0–5.0, null if <3 reviews
    reviewCount: number;
    
    // ── Status ──
    status: PackStatus;
    submittedAt: Timestamp | null;         // when creator submitted for review
    publishedAt: Timestamp | null;
    rejectedAt: Timestamp | null;
    rejectionReason: string | null;
    lastAuditAt: Timestamp | null;
    
    // ── System ──
    isActive: boolean;                     // soft delete / suspension
    version: number;                       // content version (for update tracking)
    accentColor?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

type PackStatus = 
    | 'draft'           // creator is working on it
    | 'submitted'       // in review queue
    | 'in_review'       // moderator is actively reviewing
    | 'revision_needed' // moderator sent back with notes
    | 'approved'        // passed review, ready to publish
    | 'published'       // live on marketplace
    | 'suspended'       // taken down (policy violation)
    | 'archived';       // creator archived (still accessible to buyers)
```

### 5.3 Pack Requirements

Minimum requirements to submit for review:

| Requirement | Threshold | Rationale |
|-------------|-----------|-----------|
| Question count | ≥ 15 | Small enough to be achievable, large enough to be useful |
| Domain coverage | ≥ 1 domain | Single-domain packs are fine |
| Every question must have | correct answer + explanation (short + whyOthersWrong) | Core quality bar |
| Sample questions | 3-5 marked as preview | Buyers can try before buying |
| Description | ≥ 100 chars | Meaningful description, not placeholder |
| Title | ≤ 80 chars, no ALL CAPS | Readability |
| Difficulty distribution | At least 2 of 3 levels present | Packs can't be all-easy or all-hard |
| Unique content | Pass plagiarism check | No copied content |

---

## 6. Submission & Review Workflow

### 6.1 Creator Flow

```
Creator Dashboard
────────────────
1. Create Pack (fills metadata: cert, title, domains, pricing)
   → status: draft

2. Add Questions (one-by-one or bulk CSV upload)
   → Pack stays in draft

3. Mark Sample Questions (3-5)
   → These are free previews for all users

4. Submit for Review
   → System validates pack requirements
   → If pass → status: submitted (enters review queue)
   → If fail → error with specific issues to fix

5. Wait for Review (SLA: 72 hours)
   → Creator sees "In Review" badge on pack

6a. Approved → status: approved
    → Creator clicks "Publish" → status: published → live on marketplace

6b. Revision Needed → status: revision_needed
    → Creator receives notes → edits → resubmits
    → Re-enters review queue (faster SLA: 48h)

6c. Rejected → status: rejected (with reason)
    → Creator can appeal or create a new pack
```

### 6.2 Review Queue (Admin/Moderator)

```
Review Dashboard (/marketplace/admin/review)
─────────────────────────────────────────────
Queue (sorted by submittedAt, oldest first):

┌────────────────────────────────────────────────────────────────────┐
│  📦 CISSP Domain 4 — Network Security Essentials                  │
│  By: Jane Smith (✅ Verified, CISSP)  ·  75 questions  ·  $9.99  │
│  Submitted: 2h ago  ·  First submission                           │
│                                                                    │
│  [Start Review]  [Skip (conflict of interest)]                     │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  📦 CC Practice Exam — Full Coverage                               │
│  By: Mark Johnson (✅ Verified, CC)  ·  100 questions  ·  $14.99  │
│  Submitted: 6h ago  ·  Resubmission (1 prior revision)            │
│                                                                    │
│  [Start Review]  [Skip]                                            │
└────────────────────────────────────────────────────────────────────┘
```

### 6.3 Review Checklist

Moderator evaluates each pack against:

| Criterion | Check | Pass/Fail |
|-----------|-------|-----------|
| **Accuracy** | Are correct answers actually correct? (Spot-check 20% of questions) | |
| **Explanation quality** | Are explanations helpful, not just "A is correct"? | |
| **Option plausibility** | Are wrong options plausible? (No obviously absurd distractors) | |
| **Domain alignment** | Do questions match the domains they're tagged under? | |
| **Difficulty spread** | Is the distribution reasonable? | |
| **Originality** | No plagiarism (checked by automated tool + human review) | |
| **Formatting** | Questions are well-written, no typos, consistent style | |
| **Policy compliance** | No offensive content, no exam-dump material, no copyrighted text | |
| **Pricing fairness** | Price is reasonable for quantity and quality | |

### 6.4 Review Outcomes

| Outcome | Moderator Action | Creator Impact |
|---------|-----------------|----------------|
| **Approve** | Click "Approve" | Pack moves to `approved`. Creator can publish. |
| **Revision needed** | Write revision notes (required). Select specific questions with issues. | Pack moves to `revision_needed`. Creator receives email with notes. |
| **Reject** | Write rejection reason (required). | Pack moves to `rejected`. Creator receives email. Can appeal within 14 days. |

---

## 7. Pack Pricing

### 7.1 Pricing Rules

| Rule | Value | Rationale |
|------|-------|-----------|
| Minimum price (paid) | $2.99 | Below this, transaction costs make it unviable |
| Maximum price | $49.99 | Prevents price gouging; cert prep shouldn't cost more than the exam itself |
| Free packs allowed | Yes | Creator can choose free to build reputation |
| Price change after publish | Allowed (with 24h delay) | Buyers who already purchased are unaffected |
| Discount codes | Phase 2 | Creator-specific promo codes |

### 7.2 Recommended Pricing (Guidance to Creators)

| Pack Size | Suggested Price | Per-Question Value |
|-----------|----------------|--------------------|
| 15-30 Q | $2.99–$5.99 | $0.10–0.20/Q |
| 31-75 Q | $5.99–$14.99 | $0.08–0.20/Q |
| 76-150 Q | $14.99–$24.99 | $0.10–0.17/Q |
| 150+ Q | $19.99–$49.99 | $0.07–0.13/Q |

Shown in creator dashboard as a suggestion, not enforced.

---

## 8. Buyer Experience

### 8.1 Pack Detail Page

**Route:** `/marketplace/packs/{slug}`

```
┌──────────────────────────────────────────────────────────────────┐
│  CISSP Domain 1: Security & Risk Management Deep Dive            │
│  By Jane Smith ✅  ·  ★★★★☆ 4.6 (42 reviews)                   │
│                                                                  │
│  75 questions  ·  Domain 1 focus                                 │
│  Difficulty: 20% easy · 50% medium · 30% hard                   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Try a sample question:                                    │  │
│  │                                                            │  │
│  │  Q: Which risk analysis method uses ALE, SLE, and ARO     │  │
│  │  to quantify risk in monetary terms?                       │  │
│  │                                                            │  │
│  │  ○ A) Qualitative risk analysis                            │  │
│  │  ○ B) Quantitative risk analysis                           │  │
│  │  ○ C) Bow-tie analysis                                     │  │
│  │  ○ D) Failure mode and effects analysis                    │  │
│  │                                                            │  │
│  │  [Show Answer]                                             │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────┐                                                │
│  │  $9.99       │   or included with Pro (browse-only promo)     │
│  │  [Buy Now →] │                                                │
│  └──────────────┘                                                │
│                                                                  │
│  What's included:                                                │
│  ✓ 75 expert-written questions with detailed explanations        │
│  ✓ Covers all Domain 1 objectives                                │
│  ✓ Integrates with your ExamFlow dashboard                       │
│  ✓ Lifetime access (even if creator updates the pack)            │
│  ✓ 7-day refund guarantee                                       │
│                                                                  │
│  Reviews (42)                             [Write a Review]       │
│  ────────────────────────────────────────────                    │
│  ★★★★★  "Best D1 questions I've found. Explanations are gold."  │
│  — Mike T. · Verified Purchase · 3 days ago                      │
│                                                                  │
│  ★★★★☆  "Good questions but a few have minor typos."            │
│  — Sarah L. · Verified Purchase · 1 week ago                     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 8.2 Purchase Flow

```
1. User clicks "Buy Now" on pack page
   ↓
2. If not logged in → redirect to login → back to pack page
   ↓
3. If already purchased → show "Already owned — Import to dashboard"
   ↓
4. Stripe Checkout (one-time payment)
   - product: Pack title
   - price: pack price
   - metadata: { packId, buyerUid, creatorId }
   ↓
5. Checkout success → webhook fires
   ↓
6. System creates purchase record:
   - purchases/{purchaseId} (global)
   - users/{uid}/purchases/{packId} (for quick ownership lookup)
   ↓
7. User redirected to pack page → "Import to Dashboard" button now visible
   ↓
8. User clicks Import → same import flow as today (domain selection)
   ↓
9. Content copies to user's personal namespace with _source metadata
```

### 8.3 Purchase Record

```typescript
interface Purchase {
    id: string;                     // auto-generated
    packId: string;
    buyerUid: string;
    creatorId: string;
    priceAtPurchase: number;        // cents (immutable snapshot)
    currency: string;               // "usd"
    stripePaymentIntentId: string;
    stripeChargeId: string;
    status: 'completed' | 'refunded' | 'disputed';
    refundedAt: Timestamp | null;
    refundReason: string | null;
    purchasedAt: Timestamp;
}
```

---

## 9. Discovery & Ranking

### 9.1 Browse & Filter

**Route:** `/marketplace` (updated from current)

| Filter | Options |
|--------|---------|
| Certification | CISSP, CC, SSCP, CCSP, CGRC, Security+ |
| Domain | Dynamic (based on selected cert) |
| Price range | Free, $1-10, $10-25, $25+ |
| Rating | ≥3★, ≥4★, ≥4.5★ |
| Sort | Popular (default), Newest, Highest Rated, Price: Low→High, Price: High→Low |

### 9.2 Ranking Signals

Default sort ("Popular") uses a weighted score:

| Signal | Weight | Rationale |
|--------|--------|-----------|
| Sales count (30d) | 30% | Recent momentum matters most |
| Average rating | 25% | Quality signal |
| Review count | 15% | Social proof volume |
| Question count | 10% | Content depth |
| Creator badge (Top Creator) | 10% | Creator trust |
| Recency (published date) | 10% | New packs get initial boost |

**New pack boost:** Packs published within the last 14 days get a 1.5x multiplier on the recency signal. Prevents cold-start burial.

### 9.3 Search

Current: Firestore client-side substring filter on name/abbreviation/tags.
Target: Same approach for now (Firestore limitation), but add `description` to searchable fields. Phase 2: Algolia or Typesense for full-text search when catalog exceeds 100 packs.

---

## 10. Reviews & Ratings

### 10.1 Review Rules

| Rule | Value |
|------|-------|
| Who can review | Verified purchasers only (have a `Purchase` record for this pack) |
| Reviews per user per pack | 1 (can edit, not duplicate) |
| Minimum content | 20 characters |
| Maximum content | 1000 characters |
| Rating scale | 1–5 stars (required with review) |
| Rating without text | Allowed (star-only rating) |
| Edit window | 90 days from review date |
| Creator can respond | Yes, 1 response per review |

### 10.2 Review Data Model

```typescript
interface PackReview {
    id: string;
    packId: string;
    reviewerUid: string;
    reviewerName: string;           // denormalized
    rating: number;                 // 1-5
    text: string | null;            // null for star-only ratings
    isVerifiedPurchase: boolean;    // always true (enforced)
    creatorResponse: string | null;
    creatorRespondedAt: Timestamp | null;
    reportCount: number;            // flagged as abusive
    isHidden: boolean;              // hidden by moderation
    createdAt: Timestamp;
    updatedAt: Timestamp;
}
```

### 10.3 Fake Review Prevention

See `marketplace-economy.md` Section 6 for full fraud prevention details.

Summary:
- Only verified purchasers can review
- Account age minimum: 7 days
- Must have completed ≥ 1 exam using the pack (prevents buy-review-refund)
- NLP-based similarity detection for templated reviews
- Creator cannot review their own packs

---

## 11. Content Updates

### 11.1 Pack Updates by Creator

Creators can update published packs:

| Update Type | Allowed | Review Required |
|-------------|---------|-----------------|
| Fix typo in question/explanation | Yes | No (auto-approved) |
| Add new questions | Yes | Yes (enters review queue, but only new questions reviewed) |
| Remove questions | Yes | No (but buyers keep their imported copy) |
| Change title/description | Yes | No |
| Change price | Yes (24h delay) | No |
| Change domains | No | Must create new pack |

### 11.2 Update Propagation

**Purchased content does NOT auto-update.** Buyers receive a snapshot at import time. If a creator updates a pack, a notification appears in the buyer's dashboard:

```
📦 "CISSP Domain 1 Deep Dive" has been updated.
   12 new questions added. 2 explanations improved.
   [Import Updates →]  [Dismiss]
```

The buyer can choose to import updates. New questions are added; updated questions replace old versions (matched by `marketplaceQuestionId`).

---

## 12. Firestore Collections — New

| Collection | Scope | Purpose |
|------------|-------|---------|
| `creators/{uid}` | Global | Creator profile, verification status, payout info |
| `creator_applications/{appId}` | Global | Pending/reviewed applications |
| `packs/{packId}` | Global | Published question packs (replaces `marketplace_studies`) |
| `pack_questions/{questionId}` | Global | Questions within packs (replaces `marketplace_questions`) |
| `purchases/{purchaseId}` | Global | All purchases (for revenue tracking) |
| `users/{uid}/purchases/{packId}` | User-scoped | Quick ownership lookup |
| `pack_reviews/{reviewId}` | Global | Reviews on packs |
| `moderation_actions/{actionId}` | Global | Audit trail for all moderation decisions |

### Migration from Current Marketplace

1. Existing `marketplace_studies` → migrate to `packs` with `creatorId = PLATFORM_ADMIN_UID`
2. Existing `marketplace_questions` → migrate to `pack_questions`
3. Existing imports continue to work (source metadata is backward-compatible)
4. Current admin CRUD routes remain functional for platform-published content

---

## 13. Implementation Phases

### Phase 1 — Creator Onboarding + Free Packs (Weeks 1-3)

| Step | What |
|------|------|
| 1.1 | Creator application form + admin review dashboard |
| 1.2 | Creator profile page (public) |
| 1.3 | Creator dashboard (draft/submit/track packs) |
| 1.4 | Review queue for admin (approve/reject/revision) |
| 1.5 | Publish free packs (no payment integration needed) |
| 1.6 | Pack detail page with sample questions |
| 1.7 | Migrate existing marketplace content to new schema |

### Phase 2 — Paid Packs + Revenue Share (Weeks 4-6)

| Step | What |
|------|------|
| 2.1 | Stripe Connect onboarding for creators |
| 2.2 | Pack purchase flow via Stripe Checkout |
| 2.3 | Revenue share calculation + payout |
| 2.4 | Purchase records + ownership check |
| 2.5 | Refund flow |

### Phase 3 — Quality & Trust (Weeks 7-9)

| Step | What |
|------|------|
| 3.1 | Reviews & ratings system |
| 3.2 | Plagiarism detection (automated) |
| 3.3 | Report/flag system for content and reviews |
| 3.4 | Creator analytics dashboard |
| 3.5 | Pack update + update notification flow |

### Phase 4 — Growth & Economy (Weeks 10-12)

| Step | What |
|------|------|
| 4.1 | Ranking algorithm implementation |
| 4.2 | Creator promo tools (discount codes) |
| 4.3 | "Featured" / "Editor's Pick" curation |
| 4.4 | Bundle pricing (multi-pack discounts) |
| 4.5 | Full-text search (Algolia/Typesense) |

---

## 14. Success Metrics

| Metric | Month 3 Target | Month 6 Target | Month 12 Target |
|--------|----------------|----------------|-----------------|
| Verified creators | 10 | 30 | 75 |
| Published packs | 25 | 100 | 300 |
| Total questions in marketplace | 2,500 | 15,000 | 50,000 |
| Monthly pack purchases | 50 | 500 | 2,000 |
| Creator payout / month | $500 | $5,000 | $25,000 |
| Average pack rating | ≥ 4.0 | ≥ 4.2 | ≥ 4.3 |
| Marketplace GMV / month | $700 | $7,000 | $35,000 |

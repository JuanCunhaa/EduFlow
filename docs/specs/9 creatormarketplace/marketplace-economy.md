# Marketplace Economy — Discovery, Trust & Fraud Prevention

> Status: DRAFT
> Date: 2026-02-12
> Role: Trust & Safety + Marketplace GM
> Depends on: `creator-marketplace.md`, `creator-incentives-revenue-share.md`, `moderation-review.md`
> Related: `creator-tools.md`

---

## 1. Marketplace Health Framework

A healthy marketplace has three balanced forces:

```
              Content Quality
                   ▲
                  / \
                 /   \
                /     \
               / HEALTH \
              /    ZONE  \
             /             \
            ▼               ▼
     Supply Liquidity ←→ Demand Trust
     (enough packs)       (buyers confident)
```

| Force | Risk if Missing | ExamFlow Mitigation |
|-------|----------------|---------------------|
| **Content Quality** | Marketplace becomes a dumping ground. Buyers leave. | Pre-publish review + quality audits + strike system |
| **Supply Liquidity** | Not enough packs → buyers can't find what they need → leave | Creator incentives + 70/30 split + onboarding support |
| **Demand Trust** | Buyers don't trust content accuracy → won't pay → creators leave | Reviews, verified badges, refund policy, plagiarism detection |

---

## 2. Discovery & Ranking System

### 2.1 Browse Experience

```
Marketplace                                     [Search...]
─────────────────────────────────────────────────────────────

Certification:
  [All ▼]  [CISSP]  [CC]  [SSCP]  [CCSP]  [CGRC]  [Security+]

Filters:
  Domain: [All ▼]   Price: [All ▼]   Rating: [All ▼]

Sort: [Popular ▼]  [Newest]  [Highest Rated]  [Price ↑]  [Price ↓]

─── Featured Packs ──────────────────────────────────────────

  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
  │ 🏆 Editor's Pick │  │ 🔥 Trending      │  │ 🆕 New & Notable │
  │ CISSP Full Exam  │  │ CC Quick Review   │  │ SSCP Domain 5    │
  │ By Jane S. ✅    │  │ By Mark J. ✅     │  │ By Lisa W. ✅    │
  │ 150Q · ★ 4.9    │  │ 60Q · ★ 4.7      │  │ 40Q · ★ 4.5     │
  │ $19.99           │  │ $7.99            │  │ $5.99            │
  └──────────────────┘  └──────────────────┘  └──────────────────┘

─── All Packs (127) ─────────────────────────────────────────

  ┌──────────────────────────────────────────────────────┐
  │ CISSP Domain 1: Security & Risk Mgmt Deep Dive      │
  │ By Jane Smith ✅  ·  75Q  ·  ★ 4.6 (42)  ·  $9.99 │
  │ "Expert-written questions covering every D1 obj..." │
  └──────────────────────────────────────────────────────┘
  ┌──────────────────────────────────────────────────────┐
  │ CC Complete Practice Exam Pack                       │
  │ By Mark Johnson ✅  ·  100Q  ·  ★ 4.4 (28)  · Free│
  │ "Full coverage of all 5 CC domains with explain..." │
  └──────────────────────────────────────────────────────┘
  ...
```

### 2.2 Ranking Algorithm — Detailed

The default "Popular" sort uses a composite score:

```
PopularityScore = 
    (0.30 × NormalizedRecentSales) +
    (0.25 × NormalizedRating) +
    (0.15 × NormalizedReviewCount) +
    (0.10 × NormalizedQuestionCount) +
    (0.10 × CreatorTrustSignal) +
    (0.10 × RecencyBoost)
```

**Normalization:** Each signal is normalized to 0.0–1.0 relative to all published packs.

| Signal | Calculation | Notes |
|--------|------------|-------|
| **RecentSales** | Sales in last 30 days / max(sales across all packs in 30d) | Momentum-weighted |
| **Rating** | (avg_rating - 1.0) / 4.0 | Scales 1-5 to 0-1. Packs with <3 reviews use global avg. |
| **ReviewCount** | log(review_count + 1) / log(max_reviews + 1) | Log-scaled to prevent mega-packs from dominating |
| **QuestionCount** | log(question_count) / log(max_questions) | Log-scaled |
| **CreatorTrust** | 1.0 if Top Creator badge, 0.7 if Quality Author, 0.5 if Verified, 0.3 if new | Creator reputation |
| **RecencyBoost** | max(0, 1.0 - (days_since_publish / 60)) | Linear decay over 60 days. 0 after 60 days. |

**New pack boost:** Packs published within the last 14 days get RecencyBoost = 1.0 (maximum). This prevents cold-start burial.

### 2.3 Featured & Curated Sections

| Section | Selection Method | Update Frequency |
|---------|-----------------|-----------------|
| **Editor's Pick** | Manual curation by platform admin | Weekly |
| **Trending** | Automated: highest sales velocity in last 7 days | Real-time |
| **New & Notable** | Automated: packs published in last 14 days with rating ≥ 4.0 | Real-time |
| **Best for [Cert]** | Automated: highest-rated per certification | Daily |
| **Free Packs** | Automated: all free packs, sorted by popularity | Real-time |

### 2.4 Search

**Phase 1:** Client-side filtering (current approach extended):
- Search fields: title, description, tags, creator name, certification
- Firestore `array-contains` for tags
- Client-side substring match for text fields

**Phase 2 (>100 packs):** Algolia or Typesense:
- Full-text search with typo tolerance
- Faceted filtering (cert, domain, price range, rating)
- Relevance-ranked results

**Estimated trigger for Phase 2:** When catalog exceeds 100 packs and Firestore client-side filtering becomes noticeably slow.

---

## 3. Trust Signals

### 3.1 Pack Trust Indicators

Visible on every pack card and detail page:

| Indicator | Display | Source |
|-----------|---------|--------|
| **Verified Creator** | ✅ shield next to creator name | Creator verification system |
| **Cert Badge** | "CISSP Certified" on creator avatar | Cert verification |
| **Star Rating** | ★ 4.6 (42 reviews) | Buyer reviews |
| **Sales Count** | "680 sold" | Purchase records |
| **Import Count** | "1,200 imports" (for free packs) | Import records |
| **Refund Rate** | Hidden from public. If > 15%, show ⚠️ "High refund rate" | Internal metric |
| **Last Updated** | "Updated 3 days ago" | Pack metadata |
| **Sample Questions** | 3-5 try-before-you-buy questions | Creator-selected |

### 3.2 Creator Trust Indicators

Visible on creator profile page:

| Indicator | Display | Threshold |
|-----------|---------|-----------|
| **Member since** | "Member since Jan 2026" | Join date |
| **Total sales** | "680 total sales" | Sum across all packs |
| **Average rating** | "★ 4.6 average across 8 packs" | Weighted average |
| **Packs published** | "8 packs" | Count of published packs |
| **Response rate** | "Responds to 90% of reviews" | Creator engagement |
| **Top Creator badge** | ⭐ gold badge | ≥500 sales + ≥4.5 avg rating |
| **Quality Author badge** | 💎 badge | 0 violations + ≥20 packs |
| **Content freshness** | "Last published: 3 days ago" | Most recent pack date |

### 3.3 Verified Purchase Badge on Reviews

Reviews show "✓ Verified Purchase" only if the reviewer has a purchase record for that pack. This is enforced at write time (only purchasers can review), so it's always true — but displaying it still builds buyer confidence.

---

## 4. Review Economy

### 4.1 Review Solicitation

**Timing:** Prompt buyers to review after they've meaningfully used the pack.

| Trigger | When | How |
|---------|------|-----|
| After completion of first exam using pack questions | 1-2 hours after exam | In-app notification: "How was [Pack Name]? Leave a review." |
| After 3 exams using pack questions | Immediately | In-app modal: "You've used [Pack] extensively. Share your experience." |
| 7 days after purchase (if no review yet) | Day 7 | Email reminder (one-time, not nagging) |

**Rules:**
- Never solicit reviews before the buyer has used the content (prevents meaningless 5-star reviews)
- Maximum 2 solicitations per purchase (in-app + email)
- Buyer can dismiss permanently

### 4.2 Review Quality

**Minimum standards (enforced programmatically):**
- Text reviews: ≥ 20 characters
- No URLs in review text (prevents spam)
- No profanity filter (cybersecurity professionals are adults, but report mechanism exists)
- One review per user per pack

**Star-only ratings:**
- Allowed (lowers friction for getting any signal)
- Star-only ratings count toward average but aren't displayed in the review list
- Text reviews are displayed with priority (most helpful first)

### 4.3 Review Sorting

| Sort | Default? | Logic |
|------|----------|-------|
| **Most Helpful** | ✅ | Most upvotes + recency decay |
| **Newest** | | By date |
| **Highest Rated** | | 5★ first |
| **Lowest Rated** | | 1★ first |

**Helpfulness voting:** Buyers can mark a review as "Helpful" (thumbs up). No downvoting (prevents brigading).

---

## 5. Fraud Prevention — Content

### 5.1 Content Scraping Prevention

**Threat:** Someone copies all questions from a paid pack and re-publishes them as their own (or for free elsewhere).

| Layer | Mitigation |
|-------|-----------|
| **Import tracking** | Every imported question carries `_source.marketplaceQuestionId`. If a creator submits questions with high similarity to existing marketplace content, plagiarism check catches it. |
| **Rate limiting** | Question preview API is rate-limited. Full question content requires purchase + authentication. |
| **No bulk export** | Buyers cannot export purchased questions to CSV/JSON from the platform. Questions live in Firestore, accessible only through the exam engine. |
| **Watermarking (Phase 2)** | Each question's explanation includes a subtle per-buyer variant (e.g., synonym swap in one sentence). If leaked, the variant identifies the source buyer. |
| **Legal** | Creator ToS grants non-exclusive license to ExamFlow. Buyer ToS prohibits redistribution. DMCA takedown process for external platforms. |

### 5.2 Duplicate Pack Detection

**Threat:** Creator uploads the same content as multiple packs to game visibility.

| Check | Method |
|-------|--------|
| **Same-creator duplicate** | When creator submits a pack, compare question fingerprints against their other packs. Flag if > 30% overlap. |
| **Cross-creator duplicate** | Plagiarism check compares against all marketplace content. Flag > 80% match on individual questions. |
| **Repackaging** | If a pack is rejected and resubmitted with minimal changes + new title, detect by comparing question set. |

**Action on detection:**
- Auto-flag for human review (not auto-reject — some overlap is legitimate, e.g., a "D1" pack and a "Full Exam" pack from the same creator will share D1 questions)
- Reviewer determines: legitimate overlap vs. gaming

### 5.3 Exam Dump Detection

**Threat:** Creator uploads actual certification exam questions.

| Method | How |
|--------|-----|
| **Database matching** | Maintain a hash database of known exam questions (from exam prep vendor partnerships, crowd-sourced reports). Compare submitted question fingerprints. |
| **Stylistic analysis** | Actual exam questions have distinctive formatting patterns (ISC2 uses a specific question structure). Flag questions that match these patterns too closely. |
| **Community reporting** | Buyers who recognize actual exam content can report via the flag system. |
| **Legal compliance** | ISC2 and CompTIA exam content is copyrighted. Hosting it exposes ExamFlow to legal risk. Zero tolerance. |

**Action:** Immediate pack suspension + Strike 3 (permanent ban). No appeal for confirmed exam dumps.

---

## 6. Fraud Prevention — Reviews

### 6.1 Fake Review Detection

**Threat:** Creator buys their own pack (or has friends buy it) and leaves positive reviews to boost ranking.

| Signal | Detection | Action |
|--------|-----------|--------|
| **Self-purchase** | Buyer UID matches creator UID, or buyer and creator share the same IP/device fingerprint | Auto-block review. Flag for investigation. |
| **Review velocity** | Pack receives > 5 reviews in 24 hours from newly created accounts | Queue for manual review. Temporarily hide new reviews. |
| **Review similarity** | NLP analysis: multiple reviews on same pack use very similar language or structure | Flag for review. Reviewer decides. |
| **Buy-review-refund** | Account purchases pack, immediately reviews 5★, then requests refund | Block review if refund processed. Remove review retroactively. |
| **Coordinated reviews** | Multiple reviewers only ever review one creator's packs | Flag creator and reviewers for investigation. |
| **Account age** | Review from account created < 7 days ago | Require review to be approved by moderation before showing. |

### 6.2 Fake Review Prevention — Programmatic

```typescript
async function canSubmitReview(
    buyerUid: string, 
    packId: string
): Promise<{ allowed: boolean; reason?: string }> {
    
    // 1. Must have purchased the pack
    const purchase = await getUserPurchase(buyerUid, packId);
    if (!purchase) return { allowed: false, reason: 'not_purchased' };
    
    // 2. Must not have been refunded
    if (purchase.status === 'refunded') 
        return { allowed: false, reason: 'refunded' };
    
    // 3. Account must be ≥ 7 days old
    const user = await getUserProfile(buyerUid);
    const accountAge = Date.now() - user.createdAt.toMillis();
    if (accountAge < 7 * 24 * 60 * 60 * 1000) 
        return { allowed: false, reason: 'account_too_new' };
    
    // 4. Must have completed ≥ 1 exam using questions from this pack
    const hasUsedPack = await hasCompletedExamWithPackQuestions(buyerUid, packId);
    if (!hasUsedPack) 
        return { allowed: false, reason: 'not_used' };
    
    // 5. Must not be the pack creator
    const pack = await getPack(packId);
    if (pack.creatorId === buyerUid) 
        return { allowed: false, reason: 'self_review' };
    
    // 6. Must not already have a review for this pack
    const existingReview = await getReviewByUser(buyerUid, packId);
    if (existingReview) 
        return { allowed: false, reason: 'already_reviewed' };
    
    return { allowed: true };
}
```

### 6.3 Review Manipulation by Creator

**Threat:** Creator pressures buyers to leave positive reviews (e.g., "Leave 5★ for a free pack").

| Policy | Enforcement |
|--------|-------------|
| Creators CANNOT offer incentives for reviews | Content policy clause. Report mechanism. |
| Creators CANNOT require reviews for access | Technically impossible (access is grant-on-purchase) |
| Creators CAN ask buyers to review | Politely, via their pack description or response |
| Creators CANNOT contact buyers directly | No direct messaging feature |

### 6.4 Negative Review Bombing

**Threat:** Competitor or malicious user leaves coordinated negative reviews.

| Signal | Detection | Action |
|--------|-----------|--------|
| Multiple 1★ reviews in 24h from accounts that purchased on the same day | Automated alert | Temporarily hide new reviews. Manual investigation. |
| Review text is copy-pasted across multiple packs | NLP similarity detection | Flag + manual review |
| Reviewer has only ever reviewed one creator's packs (all negatively) | Pattern detection | Flag reviewer account |

---

## 7. Fraud Prevention — Financial

### 7.1 Creator Self-Purchase Fraud

**Threat:** Creator uses multiple accounts to buy their own pack, generating fake revenue.

| Signal | Detection |
|--------|-----------|
| Same payment method across buyer and creator | Stripe card fingerprint matching |
| Same IP/device for buyer and creator accounts | Server-side IP logging on purchase |
| Rapid purchase-refund cycles | Monitoring: > 3 refunds from same buyer on same creator's packs |
| Unusually high refund rate from specific buyers | Dashboard alert when buyer refund rate > 50% |

**Action:** Freeze creator payouts. Manual investigation. If confirmed: Strike 3 (permanent ban) + reverse all fraudulent earnings + report to Stripe for terms violation.

### 7.2 Payment Fraud (Stolen Cards)

Primarily handled by Stripe:
- Stripe Radar for fraud detection
- 3D Secure authentication for high-risk charges
- Chargeback handling (see `creator-incentives-revenue-share.md` Section 6)

**ExamFlow additional layer:**
- New accounts: max $50 in purchases within first 24 hours
- Failed payment attempts: max 3 per hour per user
- Geographic mismatch: account country ≠ payment country → require 3DS

### 7.3 Money Laundering (Edge Case)

**Threat:** Bad actor uses marketplace to launder money — buys own packs with dirty funds, receives "legitimate" payouts.

**Mitigation:**
- Stripe Connect KYC handles identity verification
- ExamFlow monitors for patterns: single buyer → single creator, large volumes
- Transaction velocity limits: no creator can earn more than $10,000/month without manual review trigger
- Report suspicious patterns to Stripe for compliance review

---

## 8. Pricing Integrity

### 8.1 Price Manipulation Prevention

| Threat | Mitigation |
|--------|-----------|
| Creator launches at $0.99, gets sales/reviews, raises to $49.99 | 24h delay on price changes. Price history visible on pack page. Buyers who purchased at original price are unaffected. |
| Creator oscillates prices to game "on sale" perception | Minimum 7 days between price changes. No "was/now" display until price stable for 14 days. |
| Creator publishes extremely cheap bulk content to undercut quality packs | Minimum price $2.99 for paid packs. Quality review catches low-effort content regardless of price. |
| Free-to-paid bait-and-switch | Free packs can become paid, but existing importers keep all content. Pack card shows "Was Free" badge for 30 days. |

### 8.2 Bundle Pricing (Phase 2)

Creators can bundle multiple packs at a discount:

```
Bundle: CISSP Complete Prep (by Jane Smith)
─────────────────────────────────────────────────────────────

Includes:
  · CISSP Domain 1 Deep Dive ($9.99)
  · CISSP Domain 2-4 Essentials ($14.99)
  · CISSP Domain 5-8 Advanced ($14.99)
  · CISSP Full Practice Exam ($19.99)

  Individual total: $59.96
  Bundle price: $39.99 (33% off)

  [Buy Bundle →]
```

**Rules:**
- All packs in a bundle must belong to the same creator
- Bundle discount: 15-40% off individual total (enforced range)
- If buyer already owns some packs, the bundle price is adjusted (pay the difference)

---

## 9. Marketplace Moderation Metrics & Monitoring

### 9.1 Real-Time Dashboard (Admin)

```
Marketplace Health — Real-Time
─────────────────────────────────────────────────────────────

Trust Score: 87/100 (Healthy)     ← composite of below metrics

┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────────┐
│ Active    │ │ Avg Rating│ │ Refund %  │ │ Reports       │
│ Packs: 127│ │ ★ 4.3     │ │ 3.2%      │ │ 7 open        │
└───────────┘ └───────────┘ └───────────┘ └───────────────┘

Alerts (requires attention):
  ⚠️ Pack "SSCP Quick Drill" has 22% refund rate (threshold: 15%)
  ⚠️ 4 reviews flagged for similarity in last 24h
  ✅ No overdue review queue items

Revenue Today: $147.50 (platform: $44.25 · creators: $103.25)
```

### 9.2 Weekly Health Report (Automated)

Sent to platform admin every Monday:

| Metric | This Week | Last Week | Trend |
|--------|-----------|-----------|-------|
| New packs published | 8 | 6 | ↑ 33% |
| Packs rejected | 2 | 1 | ↑ (review quality holding) |
| New reviews | 34 | 28 | ↑ 21% |
| Reviews flagged | 3 | 2 | Stable |
| Refund rate | 3.2% | 3.5% | ↓ (improving) |
| New creator applications | 5 | 3 | ↑ |
| Creator strikes issued | 1 | 0 | Monitor |
| GMV | $1,045 | $890 | ↑ 17% |

### 9.3 Alerting Thresholds

| Metric | Yellow Alert | Red Alert | Action |
|--------|-------------|-----------|--------|
| Pack refund rate | > 15% | > 25% | Investigate pack quality |
| Marketplace avg rating | < 4.0 | < 3.5 | Review new pack quality bar |
| Review queue overdue | 1 item | 3+ items | Recruit more reviewers |
| Open reports | > 10 | > 20 | Prioritize moderation |
| Creator complaints | > 3 / week | > 5 / week | Review creator experience |
| New account review burst | 5 reviews in 24h | 10 reviews in 24h | Anti-fraud investigation |

---

## 10. Platform-Level Content Strategy

### 10.1 Seed Content

Before creators arrive, the platform should seed the marketplace:

| Action | What | Purpose |
|--------|------|---------|
| Platform packs | Publish 3-5 packs under platform account for each cert | Avoid empty marketplace |
| Invited creators | Recruit 5-10 creators from beta program | Seed supply + social proof |
| Free starter packs | One free pack per cert (20-30 Q) | Give new users a taste |

### 10.2 Supply-Demand Monitoring

Track which certs / domains are underserved:

```
Content Coverage Matrix
─────────────────────────────────────────────────────────────

Cert    Total Packs   Total Q    Avg Rating   Gap
CISSP      45          5,200       4.4         D3 underserved
CC         22          2,800       4.2         —
SSCP        8            900       4.1         D4, D6 no content
CCSP        5            600       4.3         D3-D6 underserved
CGRC        2            200       3.9         Major gaps all domains
Sec+       12          1,500       4.3         D4 underserved
```

When a gap is identified:
1. Reach out to verified creators holding that certification
2. Offer the "launch incentive" (80/20 split) for the underserved area
3. Feature the pack when published

### 10.3 Content Diversity Goals

| Goal | Target | Why |
|------|--------|-----|
| ≥3 creators per certification | Prevent single-creator monopoly | Buyer choice |
| ≥2 free packs per certification | Lower barrier for new users | Acquisition |
| Mix of difficulty levels | Some easy packs, some hard packs | Serve all learner stages |
| Price range diversity | Free, $3-10, $10-25, $25-50 | Serve all budgets |

---

## 11. Competitive Moat

### 11.1 Why This Marketplace is Defensible

| Moat Element | Explanation |
|-------------|-------------|
| **Network effects** | More creators → more content → more buyers → more revenue for creators → more creators |
| **Creator lock-in** | Creators build reputation, reviews, revenue history. Switching cost is high. |
| **Data advantage** | ExamFlow sees buyer performance data per question. Creators can optimize. Competitors can't offer this. |
| **Quality bar** | Pre-publish review filters out garbage. Buyers trust ExamFlow marketplace. Alternative = buy from unknown vendor. |
| **Verified credentials** | Every creator is cert-verified. Competitors allowing anonymous content can't match this trust level. |
| **Integrated experience** | Content imports into the exam engine with analytics, spaced review, etc. Standalone PDFs can't compete. |

### 11.2 Risks to Monitor

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Top creator leaves for competitor | Medium | High | Progressive revenue share, loyalty program, exclusive features |
| Marketplace flooded with AI-generated junk | High | High | Pre-publish review + AI detection + quality bar |
| Creator cartel (price fixing) | Low | Medium | Monitor pricing patterns, enforce min/max |
| ISC2/CompTIA sends C&D for "too realistic" questions | Low | High | Content policy explicitly forbids exam dumps. Legal review. |
| Low review volume makes trust signals weak | Medium | Medium | Review solicitation + star-only ratings to lower friction |

---

## 12. Implementation Priority

### Phase 1 — MVP Marketplace (Weeks 1-4)

No money changes hands. Free packs only.

| Priority | What | Why First |
|----------|------|-----------|
| 1 | Creator application + verification | Gate to entry |
| 2 | Pack creation (metadata + questions) | Core authoring flow |
| 3 | Pre-publish review queue | Quality gate |
| 4 | Pack detail page + sample questions | Buyer browsing |
| 5 | Free pack import (re-use existing flow) | Buyer acquisition |
| 6 | Basic ranking (popularity sort) | Discovery |

### Phase 2 — Paid Marketplace (Weeks 5-8)

Add commerce.

| Priority | What | Why |
|----------|------|-----|
| 7 | Stripe Connect onboarding | Creator payouts |
| 8 | Purchase flow (Stripe Checkout) | Revenue |
| 9 | Revenue share (destination charges) | Fair creator compensation |
| 10 | Refund flow | Buyer trust |
| 11 | Purchase ownership check (gate import) | Enforce payment |

### Phase 3 — Trust & Quality (Weeks 9-12)

Build trust layer.

| Priority | What | Why |
|----------|------|-----|
| 12 | Reviews & ratings | Social proof |
| 13 | Plagiarism detection (automated) | Quality assurance |
| 14 | Report/flag system | Community moderation |
| 15 | Creator analytics dashboard | Creator retention |
| 16 | Creator strike system | Policy enforcement |

### Phase 4 — Growth (Weeks 13-16)

Scale the marketplace.

| Priority | What | Why |
|----------|------|-----|
| 17 | Featured / curated sections | Discovery quality |
| 18 | Pack updates + buyer notifications | Content freshness |
| 19 | Bundle pricing | Higher AOV |
| 20 | Full-text search (Algolia) | Scale discovery |
| 21 | Progressive revenue share tiers | Creator loyalty |
| 22 | Discount codes (creator-specific) | Creator marketing tools |

---

## 13. Financial Projections

### 13.1 Unit Economics

| Variable | Assumption |
|----------|-----------|
| Average pack price | $9.99 |
| Platform take | 30% = $3.00 |
| Stripe processing | ~2.9% + $0.30 = $0.59 |
| **Net platform revenue per sale** | **$2.41** |
| Creator earning per sale | $6.40 (after Stripe fee on their end) |

### 13.2 Revenue Scenarios

| Scenario | Monthly Sales | GMV | Platform Rev | Creator Payouts |
|----------|--------------|-----|-------------|-----------------|
| Conservative (Month 6) | 200 | $2,000 | $480 | $1,280 |
| Target (Month 6) | 500 | $5,000 | $1,200 | $3,200 |
| Optimistic (Month 6) | 1,000 | $10,000 | $2,400 | $6,400 |
| Target (Month 12) | 2,000 | $20,000 | $4,800 | $12,800 |

### 13.3 Break-Even Analysis

| Cost | Monthly |
|------|---------|
| Moderation labor (part-time) | $500 |
| Stripe Connect fees (platform share) | ~$0.25/txn overhead |
| Infrastructure (Firestore reads for marketplace) | ~$50 |
| **Monthly fixed cost** | **~$550** |

Break-even requires ~228 sales/month ($550 / $2.41 net per sale).
At target pace, break-even occurs around Month 4.

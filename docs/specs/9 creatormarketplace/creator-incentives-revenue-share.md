# Creator Incentives & Revenue Share

> Status: DRAFT
> Date: 2026-02-12
> Role: Marketplace GM + Finance
> Depends on: `creator-marketplace.md`, `monetization-stripe-spec.md`
> Related: `moderation-review.md`, `marketplace-economy.md`

---

## 1. Revenue Share Model

### 1.1 Core Split

| Recipient | Share | Rationale |
|-----------|-------|-----------|
| **Creator** | **70%** | Industry standard (Apple/Google 70/30). Attracts quality creators. |
| **Platform** | **30%** | Covers payment processing (~3%), content moderation, infrastructure, discovery |

**Example:** Pack priced at $9.99 → Creator earns $6.99 → Platform keeps $3.00

### 1.2 Why 70/30

| Alternative | Pros | Cons | Verdict |
|-------------|------|------|---------|
| **80/20** (Gumroad model) | More attractive to creators | Thin margins for moderation + infrastructure | Too expensive at current scale |
| **70/30** (App Store model) | Industry standard. Creators expect it. | Some platforms go higher | **Selected.** Balanced. |
| **60/40** (aggressive take) | More platform revenue | Creators will go to competitors (Udemy, own site) | Too greedy |
| **50/50** | Simple | Uncompetitive. Would repel quality creators. | No. |

### 1.3 Progressive Revenue Share (Phase 2)

Reward high-volume creators with better splits:

| Creator Lifetime Revenue | Creator Share | Platform Share |
|--------------------------|---------------|----------------|
| $0 – $5,000 | 70% | 30% |
| $5,001 – $25,000 | 75% | 25% |
| $25,001 – $100,000 | 80% | 20% |
| $100,000+ | 85% | 15% |

**Implemented as:** Monthly revenue calculation. Tier upgrade applies from the next calendar month. Tier never downgrades (high watermark).

### 1.4 Revenue Share on Free Packs

Free packs generate no direct revenue but serve strategic purposes:

| Purpose | Mechanism |
|---------|-----------|
| Creator onboarding / reputation building | New creators publish free packs to build ratings |
| User acquisition | Free packs attract new signups |
| Upsell pathway | Free pack → user discovers creator → buys paid pack |

No revenue share applies to free packs. Platform does not charge creators for hosting free content.

---

## 2. Payment Processing — Stripe Connect

### 2.1 Architecture

```
Buyer                    ExamFlow (Platform)              Creator
  │                           │                              │
  │  Pays $9.99               │                              │
  │ ─────────────────────→    │                              │
  │                           │  Stripe Checkout             │
  │                           │  (destination charge)        │
  │                           │                              │
  │                           │  Platform receives $9.99     │
  │                           │  Application fee: $3.00      │
  │                           │  (30% platform share)        │
  │                           │                              │
  │                           │  $6.99 transferred to ──────→│
  │                           │  creator's Connected Account │
  │                           │                              │
```

### 2.2 Stripe Connect Setup

**Connect type:** Standard (creator manages their own Stripe Dashboard)

**Why Standard over Express:**
- Creator has full Stripe Dashboard (sees their own earnings, manages payouts)
- Creator handles their own tax forms (1099-K)
- Lower platform liability
- More professional for "expert creator" positioning

### 2.3 Creator Onboarding to Stripe Connect

```
1. Creator is verified (application approved)
   ↓
2. Creator dashboard → "Set Up Payouts" button
   ↓
3. Redirect to Stripe Connect Onboarding
   (stripe.accountLinks.create → type: 'account_onboarding')
   ↓
4. Creator completes Stripe KYC:
   - Business/individual type
   - Legal name, address
   - Bank account or debit card
   - Tax info (SSN/EIN for US, varies by country)
   ↓
5. Redirect back to ExamFlow
   ↓
6. Webhook: account.updated → check capabilities
   ↓
7. If charges_enabled = true → Creator can publish paid packs
   If charges_enabled = false → Show "Payout setup incomplete" banner
```

### 2.4 Connected Account Data

```typescript
interface CreatorPayoutProfile {
    uid: string;
    stripeConnectedAccountId: string;       // acct_...
    chargesEnabled: boolean;                 // can receive funds
    payoutsEnabled: boolean;                 // can withdraw to bank
    onboardingComplete: boolean;
    country: string;                         // "US", "GB", etc.
    defaultCurrency: string;                 // "usd"
    createdAt: Timestamp;
    updatedAt: Timestamp;
}
```

Stored in `creators/{uid}` document, merged with creator profile.

---

## 3. Transaction Flow — Detailed

### 3.1 Purchase

```
POST /api/marketplace/packs/{packId}/checkout
─────────────────────────────────────────────

1. Validate:
   - Pack exists, is published, is active
   - User has not already purchased this pack
   - User is logged in
   - Pack price > 0 (free packs don't go through checkout)

2. Create Stripe Checkout Session:
   stripe.checkout.sessions.create({
       mode: 'payment',
       line_items: [{
           price: pack.stripePriceId,
           quantity: 1,
       }],
       payment_intent_data: {
           application_fee_amount: calculatePlatformFee(pack.priceUsd),
           transfer_data: {
               destination: creator.stripeConnectedAccountId,
           },
           metadata: {
               packId: pack.id,
               buyerUid: user.uid,
               creatorId: pack.creatorId,
           },
       },
       customer_email: user.email,
       success_url: `${APP_URL}/marketplace/packs/${pack.slug}?purchase=success`,
       cancel_url: `${APP_URL}/marketplace/packs/${pack.slug}`,
   });

3. Return { url: session.url } → client redirects
```

### 3.2 Platform Fee Calculation

```typescript
function calculatePlatformFee(priceInCents: number, creatorTier: RevShareTier): number {
    const platformSharePct = {
        'standard': 0.30,    // 30%
        'silver': 0.25,      // 25%  (>$5K lifetime)
        'gold': 0.20,        // 20%  (>$25K lifetime)
        'platinum': 0.15,    // 15%  (>$100K lifetime)
    }[creatorTier];
    
    return Math.round(priceInCents * platformSharePct);
}
```

### 3.3 Webhook — Purchase Completion

```
Event: checkout.session.completed (mode: payment)
─────────────────────────────────────────────────

1. Extract metadata: packId, buyerUid, creatorId
2. Get PaymentIntent from session → extract chargeId

3. Create purchase record:
   purchases/{auto-id} = {
       packId, buyerUid, creatorId,
       priceAtPurchase: session.amount_total,
       currency: session.currency,
       stripePaymentIntentId,
       stripeChargeId,
       platformFee: paymentIntent.application_fee_amount,
       creatorEarning: session.amount_total - platformFee,
       status: 'completed',
       purchasedAt: serverTimestamp(),
   }

4. Create user ownership record:
   users/{buyerUid}/purchases/{packId} = {
       purchasedAt: serverTimestamp(),
       priceAtPurchase: session.amount_total,
   }

5. Increment pack counters:
   packs/{packId}.salesCount += 1
   packs/{packId}.totalRevenue += session.amount_total

6. Update creator earnings tracker:
   creators/{creatorId}.lifetimeRevenue += creatorEarning
   creators/{creatorId}.currentMonthRevenue += creatorEarning
```

---

## 4. Payouts

### 4.1 Payout Schedule

| Method | Timing | Details |
|--------|--------|---------|
| **Automatic** (Stripe default) | Daily or weekly rolling | Stripe pays to creator's bank based on their dashboard settings |
| **ExamFlow processing** | Real-time on purchase | Destination charges send funds immediately to connected account |

With **destination charges**, Stripe handles the split automatically. The creator's connected account receives their share in real-time (minus Stripe's processing fee). No manual payout batching needed.

### 4.2 Payout Timing

```
Purchase happens at T+0
  ↓
Stripe processes charge → funds reach connected account balance
  ↓
Stripe's standard payout schedule (creator-configured):
  - US: T+2 business days (default)
  - Non-US: varies by country (T+7 for some)
  ↓
Creator sees funds in bank account
```

### 4.3 Payout Holds

| Scenario | Hold Duration | Reason |
|----------|--------------|--------|
| New creator (first 14 days) | 14-day hold | Fraud prevention (Stripe default for new accounts) |
| Dispute filed | Until resolved | Funds frozen pending dispute outcome |
| Creator under investigation | Until resolved | Platform-initiated, manual hold |

### 4.4 Minimum Payout

No minimum payout threshold on ExamFlow's side. Stripe Connect handles minimums per country (typically $0.50 USD equivalent).

---

## 5. Refunds

### 5.1 Refund Policy

| Window | Eligibility | Process |
|--------|-------------|---------|
| 0-7 days after purchase | Full refund, no questions asked | Buyer requests via "Request Refund" button |
| 8-30 days after purchase | Refund at platform discretion | Buyer contacts support with reason |
| 30+ days after purchase | No refund | — |

### 5.2 Refund Impact on Revenue Share

| Refund timeline | Creator impact | Platform impact |
|-----------------|---------------|-----------------|
| Within 7 days | Creator's share reversed in full | Platform's share reversed in full |
| 8-30 days (approved) | Creator's share reversed in full | Platform absorbs Stripe refund fee ($0.25) |
| After content removed (policy violation) | Creator's share reversed | Platform absorbs Stripe fee + issues refunds to all buyers |

### 5.3 Refund Flow

```
1. Buyer clicks "Request Refund" on purchase page
   ↓
2. If within 7-day window → auto-approve
   If within 8-30 days → enters support queue
   ↓
3. Platform issues refund via Stripe:
   stripe.refunds.create({
       charge: purchase.stripeChargeId,
       reverse_transfer: true,           // reverses creator's share
       refund_application_fee: true,      // reverses platform's share
   })
   ↓
4. Update purchase record:
   purchases/{id}.status = 'refunded'
   purchases/{id}.refundedAt = serverTimestamp()
   ↓
5. Update pack counters:
   packs/{packId}.salesCount -= 1
   packs/{packId}.totalRevenue -= refundAmount
   ↓
6. Revoke buyer's access:
   Delete users/{buyerUid}/purchases/{packId}
   (Imported questions stay — can't un-import, but no future updates)
   ↓
7. Notify creator:
   "A buyer has refunded [Pack Name]. $X.XX has been reversed."
```

### 5.4 Refund Abuse Prevention

| Signal | Action |
|--------|--------|
| Buyer refunds > 3 packs in 30 days | Flag account. Manual review required for next refund. |
| Buyer refunds > 5 packs lifetime | Disable auto-refund. All refunds require manual approval. |
| Buyer imports all questions then immediately refunds | Flag + manual review. Consider banning from marketplace. |
| Creator's pack has > 25% refund rate | Investigate pack quality. Consider suspension. |

---

## 6. Disputes (Chargebacks)

### 6.1 Dispute Handling

Stripe Connect disputes are handled at the platform level:

```
1. Stripe notifies: charge.dispute.created
   ↓
2. Platform receives dispute notification
   ↓
3. Platform investigates:
   - Was purchase legitimate?
   - Did buyer receive the content?
   - Is this a friendly fraud case?
   ↓
4. Platform submits evidence to Stripe:
   - Purchase receipt
   - Proof of content delivery (import timestamp)
   - Terms of Service acceptance
   - Refund policy shown at purchase
   ↓
5. Stripe/bank resolves dispute (usually 60-90 days)
   ↓
6. If lost: Platform decision on who absorbs the loss
```

### 6.2 Dispute Financial Impact

| Outcome | Creator | Platform |
|---------|---------|----------|
| Platform wins dispute | No impact (creator was never debited) | No impact |
| Platform loses dispute | Creator's share reversed from next payout | Platform absorbs dispute fee ($15) + Stripe processing fee |
| Fraudulent purchase | Creator keeps earnings if content was legitimate | Platform eats the loss |

### 6.3 Dispute Prevention

- Clear refund policy shown at checkout
- "Request Refund" is easier than filing a chargeback (reduce friendly fraud)
- Digital goods delivery is logged (timestamp + content list)
- Creator name + pack name on Stripe receipt (clear statement descriptor)

---

## 7. Creator Tax Compliance

### 7.1 Platform Responsibilities

| Obligation | How |
|------------|-----|
| 1099-K reporting (US creators) | Stripe handles this for Standard Connect accounts — Platform does NOT issue 1099s directly |
| VAT/GST collection on purchases | Not required for B2C digital goods under $100K/year in most jurisdictions (but monitor threshold) |
| Creator tax info collection | Stripe collects during onboarding (part of KYC) |

### 7.2 Creator Responsibilities

Creators are independent contractors, not employees. Their agreement must state:
- Creator is responsible for reporting income and paying taxes
- Stripe issues 1099-K if applicable (US creators with >$600/year as of 2024 threshold)
- Platform does not withhold taxes

---

## 8. Creator Earnings Dashboard

### 8.1 Dashboard Layout

```
Creator Dashboard → Earnings
─────────────────────────────────────────────────────────────

Revenue Overview
┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────────┐
│ This Month│ │ Last Month│ │ Lifetime  │ │ Pending       │
│ $432.50   │ │ $387.00   │ │ $3,215.50 │ │ $89.25        │
│ +12% ↑    │ │           │ │           │ │ (processing)  │
└───────────┘ └───────────┘ └───────────┘ └───────────────┘

Revenue by Pack
┌──────────────────────────────────────────────────────────┐
│  Pack Name                    Sales  Revenue   Avg Rating│
│  ──────────────────────────────────────────────────────  │
│  CISSP Domain 1 Deep Dive      42   $293.58    ★ 4.6    │
│  CISSP Full Practice Exam      18   $251.82    ★ 4.8    │
│  CC Quick Assessment           12    $35.88    ★ 4.2    │
│  CC Domain 1-3 Bundle           8    $63.92    ★ 4.4    │
└──────────────────────────────────────────────────────────┘

Payout History
┌──────────────────────────────────────────────────────────┐
│  Date        Amount    Status   Method                    │
│  ──────────────────────────────────────────────────────   │
│  Feb 10      $156.45   Paid     Bank ****1234             │
│  Feb 3       $203.10   Paid     Bank ****1234             │
│  Jan 27      $178.80   Paid     Bank ****1234             │
└──────────────────────────────────────────────────────────┘

Your Revenue Tier: Standard (70/30)
$3,215 / $5,000 to Silver tier (75/25) ████████████░░░ 64%
```

### 8.2 Data Sources

| Metric | Source |
|--------|--------|
| Revenue by pack | Aggregated from `purchases` collection, filtered by `creatorId` |
| Payout history | Stripe Connect API: `stripe.transfers.list({ destination: acct_... })` |
| Pending balance | Stripe Connect API: `stripe.balance.retrieve({ stripeAccount: acct_... })` |
| Revenue tier | `creators/{uid}.lifetimeRevenue` |

---

## 9. Creator Incentive Programs

### 9.1 Launch Incentives

| Incentive | Details | Duration |
|-----------|---------|----------|
| **First 50 creators: 80/20 split** | First 50 verified creators get 80% revenue share for their first 6 months | Until 50 creator slots filled |
| **$50 welcome bonus** | After first approved pack with ≥25 questions | First 100 creators |
| **Featured listing** | First pack from new creators gets 7-day "New Creator" badge + discovery boost | Ongoing |

### 9.2 Ongoing Incentives

| Incentive | Trigger | Reward |
|-----------|---------|--------|
| **Quality bonus** | Pack maintains ≥ 4.5 rating + ≥ 50 sales + 0 policy violations | Additional 5% revenue share for that pack |
| **Volume milestone** | Cross $1K, $5K, $10K lifetime revenue | Email congratulation + public "milestone" badge on profile |
| **Referral bonus** | Creator refers another verified creator who publishes ≥1 pack | $25 credit to the referrer |
| **Seasonal contest** | Quarterly "best new pack" contest, voted by community | $200 prize + 30-day featured placement |

### 9.3 Creator Retention

| Risk Signal | Response |
|-------------|----------|
| Creator hasn't published in 60 days | "We miss you" email with marketplace stats and inspiration |
| Creator's packs see declining sales | Email with tips: update descriptions, respond to reviews, add questions |
| Creator receives negative reviews | Supportive email with revision guidance (not punitive) |
| Creator reaches revenue tier milestone | Celebration email + public badge |

---

## 10. Edge Cases

### 10.1 Creator Account Closure

| Scenario | Buyer Impact | Financial |
|----------|-------------|-----------|
| Creator voluntarily deactivates | Existing purchased content remains accessible. No new sales. | Pending payouts still process. No new earnings. |
| Creator banned for policy violation | Content suspended. Buyers notified. | Pending payouts frozen. Refunds issued to recent buyers (30 days). |
| Creator dies / incapacitated | Content remains live. Payouts continue to last known bank. | Estate can claim Stripe account via Stripe support. |

### 10.2 Price Changes

| Scenario | Handling |
|----------|---------|
| Creator raises price | Existing buyers unaffected. New purchases at new price. |
| Creator lowers price | Existing buyers do NOT get a refund for the difference. |
| Creator makes paid pack free | Existing buyers already have access. Now anyone can import. |
| Creator makes free pack paid | Existing importers keep content. New users must purchase. |

### 10.3 Multi-Currency

Phase 1: USD only. All prices in USD.
Phase 2: Stripe handles currency conversion. Creator sets price in USD. Buyer pays in local currency (Stripe auto-converts). Creator receives USD.

---

## 11. Legal Framework

### 11.1 Creator Agreement (ToS Highlights)

| Clause | Summary |
|--------|---------|
| License grant | Creator grants ExamFlow a non-exclusive license to distribute the content |
| Ownership | Creator retains copyright. ExamFlow does not claim ownership. |
| Originality | Creator certifies content is original and not copied from exam dumps or copyrighted sources |
| Revenue share | As defined in this spec. Platform may change with 60-day notice. |
| Content removal | Creator can archive packs. ExamFlow can suspend/remove for policy violations. |
| Termination | Either party can terminate with 30-day notice. Earned revenue is paid out. |
| Indemnification | Creator indemnifies platform against copyright infringement claims |
| Dispute resolution | Arbitration (binding, commercial rules) |

### 11.2 Buyer Agreement (ToS Highlights)

| Clause | Summary |
|--------|---------|
| License | Personal use only. No redistribution, resale, or public sharing. |
| Refund policy | 7-day refund for any reason. 8-30 days at discretion. No refund after 30 days. |
| Content accuracy | Platform does not guarantee content accuracy. Creator is responsible. |
| Digital goods | Non-tangible product. No shipping. Immediate delivery. |

# Enterprise Pricing & Packaging

> Status: DRAFT
> Date: 2026-02-12
> Role: Sales Engineer + Enterprise SaaS Architect
> Dependency: `enterprise-tier.md`, `multi-tenancy-rbac.md`, `money/pricing-tiers.md`
> Phase: Phase 1 (Team pricing) + Phase 2 (Enterprise pricing)

---

## 1. Pricing Architecture

### 1.1 Full Matrix

| | Free | Pro | Team | Enterprise |
|--|------|-----|------|------------|
| **Price** | $0 | $29/mo | $49/seat/mo | Custom |
| **Annual price** | — | $199/yr ($16.58/mo) | $39/seat/mo billed annually | Custom |
| **Annual savings** | — | 43% | 20% | Negotiated |
| **Min seats** | — | — | 3 | 25 |
| **Max seats (self-serve)** | — | — | 100 | Unlimited |
| **Billing** | — | Stripe self-serve | Stripe self-serve | Invoice / PO |
| **Contract** | — | Month-to-month | Month or Annual | Annual (MSA) |
| **Phase** | Live | P1 | P1 | P2 |

### 1.2 Revenue Per Tier (Unit Economics)

| Tier | MRR per unit | Gross margin assumption | Notes |
|------|-------------|------------------------|-------|
| Free | $0 | — | Acquisition/SEO layer |
| Pro | $29 | ~90% | Firebase + Vercel costs minimal |
| Team (5 seats annual) | $195/mo ($2,340/yr) | ~88% | Slightly higher: analytics aggregation |
| Team (20 seats annual) | $780/mo ($9,360/yr) | ~88% | Sweet spot for bootcamps |
| Enterprise (100 seats) | ~$2,500-4,000/mo | ~85% | SSO infra, support cost |

### 1.3 Pricing Psychology

| Principle | Application |
|-----------|-------------|
| **Anchor high** | Show Enterprise (custom) first on pricing page, then Team looks affordable |
| **Per-seat transparency** | $49/seat is simple, no calculator needed |
| **Annual discount** | 20% off ($39/seat) — enough to incentivize commitment, not so much it devalues |
| **Volume tiers** | Not for Phase 1 — keep pricing simple. Phase 2: volume discounts at 50+ and 100+ seats |
| **No hidden fees** | Price includes all certifications, all exam modes, all analytics |

---

## 2. What's Included in Each Tier

### 2.1 Team ($49/seat/mo)

Everything in Pro, plus:

| Feature | Included |
|---------|----------|
| Organization workspace | ✅ |
| Admin console | ✅ |
| Member invite & management | ✅ |
| Roles: Admin + Member | ✅ |
| Shared org question bank | ✅ |
| Team analytics (aggregate) | ✅ |
| Team leaderboard | ✅ |
| Per-member analytics (admin view) | ✅ |
| CSV analytics export | ✅ |
| Centralized billing (one invoice) | ✅ |
| Seat management (add/remove) | ✅ |
| All certifications | ✅ (same as Pro) |
| All exam modes | ✅ |
| Priority email support | ✅ (48h response) |
| SSO | ❌ (Enterprise only) |
| SCIM | ❌ (Enterprise only) |
| Audit log | ❌ (Enterprise only) |
| SLA | ❌ (Enterprise only) |
| Custom branding | ❌ (Enterprise only) |

### 2.2 Enterprise (Custom Pricing)

Everything in Team, plus:

| Feature | Included |
|---------|----------|
| SSO (SAML 2.0 + OIDC) | ✅ |
| SCIM user provisioning | ✅ |
| Enforced SSO | ✅ |
| Audit log (3-year retention) | ✅ |
| Fine-grained roles (4 levels) | ✅ |
| Sub-teams within org | ✅ |
| Data export (bulk) | ✅ |
| Custom branding (logo, colors) | ✅ |
| Dedicated support (Slack/Teams) | ✅ (24h response) |
| SLA (99.9% uptime) | ✅ |
| MSA / DPA / custom contracts | ✅ |
| Onboarding call | ✅ (1-hour setup) |
| Volume pricing | ✅ (negotiated) |
| Invoice / PO billing | ✅ |
| API access | ✅ (Phase 2+) |

---

## 3. Enterprise Pricing Framework

### 3.1 Pricing Bands (Guidelines for Founder-Led Sales)

Enterprise pricing is custom, but follows internal bands:

| Seats | Per-seat/mo (annual) | Effective MRR | ACV |
|-------|---------------------|---------------|-----|
| 25-49 | $35-40 | $875-1,960 | $10,500-23,520 |
| 50-99 | $30-35 | $1,500-3,465 | $18,000-41,580 |
| 100-249 | $25-30 | $2,500-7,470 | $30,000-89,640 |
| 250+ | $20-25 | $5,000+ | $60,000+ |

### 3.2 Discount Authority

| Scenario | Max Discount | Approval |
|----------|-------------|----------|
| Annual commit, ≤50 seats | 20% (= Team annual rate) | Self-serve |
| Annual commit, 50-100 seats | 30% | Founder approval |
| Multi-year (2yr), any size | 35% | Founder approval |
| Strategic account (logo value) | 40% | Founder approval |
| Never below | $20/seat/mo | Hard floor |

### 3.3 Pricing Don'ts

- **Never price below $20/seat/mo** — devalues the product and makes unit economics negative at scale
- **Never offer free Enterprise trials >30 days** — creates procurement dependency without commitment
- **Never discount without annual commitment** — monthly Enterprise is at list price
- **Never offer per-exam or per-question pricing** — keeps it simple, avoids usage anxiety

---

## 4. Stripe Product Configuration

### 4.1 Products & Prices

```typescript
// Stripe product setup (via Stripe Dashboard or API)

const STRIPE_PRODUCTS = {
    PRO: {
        name: 'ExamFlow Pro',
        metadata: { tier: 'pro' },
        prices: {
            monthly: { unit_amount: 2900, currency: 'usd', recurring: { interval: 'month' } },
            annual:  { unit_amount: 19900, currency: 'usd', recurring: { interval: 'year' } },
        },
    },
    TEAM: {
        name: 'ExamFlow Team',
        metadata: { tier: 'team' },
        prices: {
            monthly: {
                unit_amount: 4900,                 // $49/seat/mo
                currency: 'usd',
                recurring: { interval: 'month' },
                // quantity = number of seats
            },
            annual: {
                unit_amount: 46800,                // $39/seat/mo × 12 = $468/seat/yr
                currency: 'usd',
                recurring: { interval: 'year' },
            },
        },
    },
    ENTERPRISE: {
        name: 'ExamFlow Enterprise',
        metadata: { tier: 'enterprise' },
        // Prices created per-deal via Stripe Dashboard or API
        // No self-serve checkout
    },
};
```

### 4.2 Seat Management via Stripe

```typescript
// Adding seats to a Team subscription
async function addSeats(orgId: string, additionalSeats: number): Promise<void> {
    const org = await getOrg(orgId);
    const subscription = await stripe.subscriptions.retrieve(org.billing.stripeSubscriptionId);
    const item = subscription.items.data[0];

    await stripe.subscriptions.update(org.billing.stripeSubscriptionId, {
        items: [{
            id: item.id,
            quantity: item.quantity + additionalSeats,
        }],
        proration_behavior: 'create_prorations',  // charge difference immediately
    });

    await db.doc(`orgs/${orgId}`).update({
        seatLimit: FieldValue.increment(additionalSeats),
    });
}

// Removing seats (at next billing cycle)
async function removeSeats(orgId: string, seatsToRemove: number): Promise<void> {
    const org = await getOrg(orgId);
    if (org.seatCount > org.seatLimit - seatsToRemove) {
        throw new AppError('SEATS_IN_USE', 'Remove members before reducing seats');
    }

    const subscription = await stripe.subscriptions.retrieve(org.billing.stripeSubscriptionId);
    const item = subscription.items.data[0];

    // Schedule reduction for next billing cycle
    await stripe.subscriptionSchedules.create({
        from_subscription: subscription.id,
        phases: [{
            items: [{ price: item.price.id, quantity: item.quantity - seatsToRemove }],
            start_date: subscription.current_period_end,
        }],
    });
}
```

---

## 5. Sales Motion

### 5.1 Team Tier — Self-Serve

```
Discovery → Pricing Page → Select Team
  → Choose seats (3-100) + billing cycle
  → Stripe Checkout (card)
  → Org created automatically
  → Admin console unlocked
  → Invite members
  → Time-to-value: <5 minutes
```

No human touch required. Founder focuses on product.

### 5.2 Enterprise Tier — Founder-Led Sales

```
Inbound (website form / email) → Founder qualifies
  → Discovery call (30 min): pain, team size, certs, timeline
  → Proposal (email): custom quote, feature summary, contract terms
  → Security review: answer questionnaire, share DPA
  → Procurement: MSA, PO, net-30 invoicing
  → Onboarding call (60 min): SSO setup, admin training, content import
  → Time-to-value: 2-6 weeks
```

### 5.3 Enterprise Sales Qualification (BANT)

| Criteria | Qualified | Not Qualified |
|----------|-----------|---------------|
| **Budget** | Has training budget or can allocate | "We'll figure it out later" |
| **Authority** | CISO, Training Director, VP Eng | Individual contributor |
| **Need** | Active cert requirement (policy/compliance) | "Nice to have" |
| **Timeline** | Exam dates set, compliance deadline | "Maybe next quarter" |

### 5.4 Enterprise Objection Handling

| Objection | Response |
|-----------|----------|
| "Too expensive" | "One team member's exam retake costs $749. Our platform reduces retake rates by X%. Break-even at Y exams." |
| "We use Kaplan/Boson" | "Those are static question banks. We provide adaptive practice, team analytics, and cert readiness tracking." |
| "No SSO, no deal" | Phase 1: "SSO is on our Q3 roadmap. We can start with email invites and migrate to SSO when ready. Many training tools operate this way initially." Phase 2: "We support SAML 2.0 and OIDC." |
| "We need SOC 2" | "We're pursuing SOC 2 Type I. In the interim, here's our security posture document and DPA." |
| "Can we get a pilot?" | "Yes — 30-day pilot for up to 10 seats at no cost. We'll track cert readiness improvement as success criteria." |

---

## 6. Packaging Add-Ons (Phase 2+)

Future upsell opportunities to increase ARPU:

| Add-On | Price | Available For |
|--------|-------|---------------|
| **Custom question authoring** (org can author private questions with AI assist) | +$10/seat/mo | Team, Enterprise |
| **White-label** (custom domain, full branding) | +$500/mo flat | Enterprise only |
| **API access** (programmatic exam creation, score retrieval) | +$200/mo flat | Enterprise only |
| **Dedicated success manager** | +$500/mo flat | Enterprise 100+ seats |
| **Content development** (custom cert prep content creation) | Project-based ($5K-20K) | Enterprise only |

---

## 7. Competitive Pricing Comparison

| Competitor | Per-user/mo | Team Features | SSO | Notes |
|------------|-------------|---------------|-----|-------|
| **Kaplan IT Training** | ~$79/user/mo | Basic group mgmt | Yes | Expensive, legacy UX |
| **Infosec Institute** | ~$50-70/user/mo | LMS + labs | Yes | Broader content, higher price |
| **Pluralsight Skills** | $33/user/mo (team) | Analytics, paths | Yes | Not cert-focused |
| **CBT Nuggets** | $59/user/mo | Admin dashboard | Yes | Video-focused, not practice exams |
| **Boson** | $99/user (one-time) | No team features | No | Individual only |
| **ExamFlow** | $39-49/user/mo | Full analytics, RBAC, shared bank | P2 | Best value for cert-specific prep |

### 7.1 Positioning Statement

> "ExamFlow is the only cybersecurity cert prep platform purpose-built for teams — with real-time cert readiness tracking, adaptive practice, and team analytics at a fraction of enterprise LMS pricing."

**Key differentiator:** We specialize in certification readiness. Competitors are either generic LMS platforms (broad but shallow) or individual tools (deep but no team features).

---

## 8. Contract Templates

### 8.1 Team Tier

No contract needed. Stripe Terms of Service apply. Month-to-month.

For annual plans: standard Terms of Service + annual commitment clause in Stripe checkout.

### 8.2 Enterprise Tier — Required Documents

| Document | Purpose | Phase |
|----------|---------|-------|
| **Terms of Service** | Standard product terms | P1 (exists) |
| **Privacy Policy** | Data handling, GDPR | P1 (exists) |
| **Data Processing Agreement (DPA)** | Required by GDPR, many US enterprises | P1 |
| **Master Service Agreement (MSA)** | Enterprise contract terms, liability cap, indemnification | P2 |
| **Security Questionnaire Response** | Pre-filled template (SIG Lite / CAIQ) | P2 |
| **BAA** | Only if handling PHI; not applicable for cert prep | N/A |

### 8.3 DPA Summary (Phase 1)

```
Data Processing Agreement — Key Terms

Processor: ExamFlow (your company entity)
Controller: Customer organization

Data Processed:
  - User identifiers (email, name)
  - Exam performance data (scores, answers)
  - Usage data (login times, exam counts)

Data Location: Google Cloud (us-central1) via Firebase
Retention: Per customer agreement (default: term + 90 days)
Sub-processors: Firebase/Google Cloud, Stripe, Vercel, SendGrid/Resend
Deletion: Upon contract termination + written request
Security Measures: Encryption at rest (AES-256), in transit (TLS 1.3),
  access logging, role-based access control
Breach Notification: Within 72 hours of confirmed breach
```

---

## 9. Go-to-Market Timeline

### 9.1 Phase 1: Team Tier Launch

| Week | Milestone |
|------|-----------|
| W1-2 | Org/membership Firestore schema + invite flow |
| W3-4 | Admin console MVP (members, overview, question bank) |
| W5 | Stripe Team subscription + seat management |
| W6 | Team analytics pipeline + CSV export |
| W7 | Pricing page update, marketing copy |
| W8 | Beta: 3 bootcamps (free pilot, 10 seats each) |
| W9-10 | Iterate on feedback |
| W11 | Public launch: Team tier on pricing page |
| W12 | First paying Team customer target |

### 9.2 Phase 2: Enterprise Launch

| Month | Milestone |
|-------|-----------|
| M1 | SSO (SAML + OIDC) implementation |
| M2 | Audit log, fine-grained roles, security questionnaire |
| M3 | Enterprise pricing page, "Contact Sales" flow |
| M4 | First enterprise pilot (30-day, 25 seats) |
| M5 | First enterprise contract |

---

## 10. Success Metrics

### 10.1 Team Tier

| Metric | 90-Day Target | 180-Day Target |
|--------|--------------|----------------|
| Team accounts created (self-serve) | 5 | 20 |
| Total seats sold | 25 | 150 |
| Team MRR | $975 | $5,850 |
| Avg seats per team | 5 | 7.5 |
| Team churn (monthly) | <10% | <8% |
| Team NPS | >40 | >50 |

### 10.2 Enterprise Tier

| Metric | 6-Month Target | 12-Month Target |
|--------|---------------|-----------------|
| Enterprise pipeline (leads) | 10 | 30 |
| Enterprise closed deals | 1 | 5 |
| Enterprise ACV | $10K+ | $15K+ |
| Enterprise seats | 25 | 200 |
| Enterprise MRR | $800 | $6,000 |
| Enterprise NRR (net revenue retention) | — | >110% |

### 10.3 Blended Revenue Target

| Timeframe | Free Users | Pro MRR | Team MRR | Enterprise MRR | Total MRR |
|-----------|-----------|---------|----------|---------------|-----------|
| Launch | 500 | $870 (30 users) | $0 | $0 | $870 |
| +3 months | 1,200 | $2,030 (70) | $975 | $0 | $3,005 |
| +6 months | 2,500 | $4,060 (140) | $5,850 | $800 | $10,710 |
| +12 months | 5,000 | $7,250 (250) | $14,625 | $6,000 | $27,875 |

$27,875 MRR = $334,500 ARR at the 12-month mark.

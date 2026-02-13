# Enterprise Tier — Product Spec

> Status: DRAFT
> Date: 2026-02-12
> Role: Enterprise SaaS Architect + Sales Engineer
> Dependency: `money/pricing-tiers.md`, `money/monetization-stripe-spec.md`

---

## 1. Why Enterprise

### 1.1 Market Signal

| Persona | Need | Willingness to Pay |
|---------|------|--------------------|
| **Cybersecurity bootcamp** (20-100 students) | Structured cohort practice, instructor visibility | $500-2K/month |
| **Corporate L&D team** (50-500 employees) | Track cert readiness pre-reimbursement, prove ROI | $2K-15K/year |
| **MSP / consulting firm** (10-50 consultants) | Staff cert maintenance, client-facing proof | $1K-5K/year |
| **Government / DoD contractor** | 8570 compliance (CISSP/Sec+ mandated), audit trail | $5K-50K/year, procurement |
| **University cyber program** (50-300 students) | Course integration, grade-exportable analytics | $2K-8K/semester |

The common thread: **one buyer, many users, centralized visibility**.

### 1.2 Revenue Leverage

```
Individual Pro:  1 user  × $29/mo  = $29 MRR
Team (20 seats): 1 buyer × 20 × $39/mo = $780 MRR   (27× uplift)
Enterprise (100):1 buyer × custom     = $3K-8K MRR  (100-275× uplift)
```

One enterprise deal = months of individual subscription grind.

### 1.3 Strategic Position

```
Free (Sec+, CC)  →  Pro ($29/mo)  →  Team ($39/seat/mo)  →  Enterprise (custom)
  Acquisition         Individual          Small org             Large org
  Volume play         Revenue base        Expansion revenue     Anchor revenue
```

---

## 2. Phase Model

### Phase 1: "Team" — Sellable (Month 3-5 of monetization)

Ship the minimum set of features that a 10-50 person team would pay for. Target: bootcamps, small L&D teams, MSPs.

**Not procurement-ready.** No SSO, no audit logs, no SLA. Sold via self-serve or founder-led sales.

### Phase 2: "Enterprise" — Procurement-Ready (Month 8-12)

Add the compliance, security, and procurement features that large organizations require before writing a PO. Target: corporate L&D (200+ employees), government, universities.

**Procurement-ready.** SSO, audit logs, data residency statement, SLA, MSA template.

---

## 3. Phase 1 Feature Set — Team Tier

### 3.1 Feature Matrix (Phase 1 MVP)

| Feature | Pro | Team (P1) | Enterprise (P2) |
|---------|-----|-----------|-----------------|
| Everything in Pro | ✅ | ✅ | ✅ |
| Organization (workspace) | ❌ | ✅ | ✅ |
| Invite members via email | ❌ | ✅ | ✅ |
| Roles: Admin / Member | ❌ | ✅ | ✅ |
| Centralized billing (one invoice) | ❌ | ✅ | ✅ |
| Seat management (add/remove) | ❌ | ✅ | ✅ |
| Team analytics dashboard | ❌ | ✅ | ✅ |
| Shared question bank | ❌ | ✅ | ✅ |
| Assign certifications to team | ❌ | ✅ | ✅ |
| Team leaderboard (opt-in) | ❌ | ✅ | ✅ |
| CSV export (team-level) | ❌ | ✅ | ✅ |
| Priority email support | ❌ | ❌ | ✅ |
| SSO (SAML / OIDC) | ❌ | ❌ | ✅ |
| Audit log | ❌ | ❌ | ✅ |
| Custom data retention | ❌ | ❌ | ✅ |
| SLA (99.9%) | ❌ | ❌ | ✅ |
| Dedicated onboarding | ❌ | ❌ | ✅ |
| Custom branding | ❌ | ❌ | ✅ |
| API access | ❌ | ❌ | ✅ |
| MSA / DPA available | ❌ | ❌ | ✅ |

### 3.2 Phase 1 Technical Scope

| Component | Effort | Risk |
|-----------|--------|------|
| Firestore org/membership collections | 2-3 days | Low |
| Invite flow (email + accept link) | 2-3 days | Medium |
| RBAC middleware layer | 2-3 days | Medium |
| Team analytics API + dashboard page | 3-5 days | Medium |
| Stripe per-seat billing | 2-3 days | Low (Stripe has built-in seat model) |
| Seat management UI | 2-3 days | Low |
| Shared question bank (org-scoped read) | 2-3 days | Medium |
| Admin console shell | 1-2 days | Low |
| **Total** | **16-25 days** | — |

### 3.3 What Phase 1 Explicitly Does NOT Include

- SSO (SAML/OIDC) — deferred to Phase 2
- Audit logging — deferred to Phase 2
- SLA commitment — deferred to Phase 2
- Custom branding — deferred to Phase 2
- API access for integrations — deferred to Phase 2
- Multi-org support (one user in multiple orgs) — deferred to Phase 2
- Fine-grained roles (viewer, team admin) — ship with Admin + Member only
- Custom question creation by members (members use org question bank)

---

## 4. Phase 2 Feature Set — Enterprise Tier

### 4.1 Additional Features (Beyond Team)

| Feature | Description | Effort |
|---------|-------------|--------|
| SSO (SAML 2.0 + OIDC) | Org-level identity provider config | 5-8 days |
| SCIM provisioning | Auto-create/deactivate users from IdP | 3-5 days |
| Audit log | Immutable log of admin/security events | 3-4 days |
| Data export (bulk) | Full org data export on demand | 2-3 days |
| Custom data retention policy | Configurable retention windows | 1-2 days |
| SLA (99.9% uptime) | Contractual guarantee + status page | 1-2 days (ops) |
| Custom branding | Logo, accent color on login + dashboard | 1-2 days |
| API access (REST) | Programmatic access to org analytics | 3-5 days |
| MSA + DPA templates | Legal documents for procurement | 2-3 days (legal) |
| Dedicated onboarding | White-glove setup call, import assistance | 0 (operational) |
| Fine-grained roles | Org Admin, Team Admin, Member, Viewer | 2-3 days |
| Teams within org | Sub-groups within an org | 2-3 days |
| **Total** | | **25-40 days** |

### 4.2 Compliance Posture (Phase 2 Minimum)

| Artifact | Status | Purpose |
|----------|--------|---------|
| Privacy Policy | Required (Day 1) | GDPR/CCPA compliance |
| Terms of Service | Required (Day 1) | Platform rules, limitations of liability |
| Acceptable Use Policy | Required (Day 1) | Content/usage guidelines |
| Data Processing Agreement (DPA) | Phase 2 | Required by EU enterprise customers |
| SOC 2 Type I | Phase 2 (Month 12+) | Trust badge for procurement |
| SOC 2 Type II | Post-revenue | Expensive (~$30-80K), only when revenue justifies |
| GDPR compliance statement | Phase 2 | EU data protection |
| Data residency statement | Phase 2 | "Data is stored in GCP us-central1" |
| Penetration test report | Phase 2 (annual) | Security validation |
| Business continuity plan | Phase 2 | Disaster recovery documentation |
| Subprocessor list | Phase 2 | Firebase, Stripe, Vercel, SendGrid |

---

## 5. Buyer Journeys

### 5.1 Team Buyer (Phase 1)

```
Discovery (SEO/referral)
  → Landing page / pricing page
  → "Start 14-day Team trial" (self-serve)
  → Create org, invite 3-5 members
  → Team practices for 1-2 weeks
  → Admin sees team analytics dashboard
  → Convert: enter credit card, pay per seat
  → Expand: add more seats over time
```

**Sales motion:** Self-serve with optional "talk to founder" link. No sales team needed.

### 5.2 Enterprise Buyer (Phase 2)

```
Discovery (referral, LinkedIn, conference)
  → "Contact sales" on pricing page
  → Discovery call with founder (30 min)
  → Send proposal with pricing + compliance docs
  → Procurement reviews MSA/DPA
  → Security review: complete vendor security questionnaire
  → Trial: 30-day POC with 10-20 users
  → Legal signs MSA
  → Annual contract: invoice via Stripe (or wire)
  → Onboarding: white-glove setup, SSO config, bulk user import
  → Quarterly business review
```

**Sales motion:** Founder-led. No AE/SDR until ARR > $500K.

---

## 6. Competitive Enterprise Landscape

| Feature | ExamFlow (planned) | Kaplan IT Training | Infosec Institute | Pluralsight Skills |
|---------|-------------------|-------------------|-------------------|-------------------|
| Per-seat pricing | $39/seat/mo | $149/seat/yr | Custom | $33/seat/mo |
| Adaptive engine | ✅ | ❌ | ❌ | ❌ (video-based) |
| Team analytics | ✅ | Basic | ✅ | ✅ |
| SSO | Phase 2 | ✅ | ✅ | ✅ |
| Cert coverage | 5 ISC2 + Sec+ (growing) | Broad | Broad | Broad but shallow |
| Question quality | Curated + adaptive | Decent | Decent | N/A (video) |
| Free trial | 14 days | Demo only | Demo only | 10 days |
| Min seats | 1 | 25+ | Custom | 1 |

**ExamFlow's wedge:** Lower price, better adaptive technology, no minimum seat count. Perfect for small/mid teams that enterprise vendors ignore.

---

## 7. Success Metrics

### Phase 1 (Team)

| Metric | 6-Month Target |
|--------|---------------|
| Team orgs created | 20-50 |
| Paying Team orgs | 5-15 |
| Avg seats per org | 8-20 |
| Team MRR | $2K-8K |
| Trial → Paid conversion | 15-25% |
| Net seat expansion (monthly) | +10% |

### Phase 2 (Enterprise)

| Metric | 12-Month Target |
|--------|----------------|
| Enterprise contracts signed | 3-10 |
| Avg contract value (ACV) | $8K-30K |
| Enterprise ARR | $50K-200K |
| Time to close | 30-90 days |
| Churn rate (annual) | <10% |

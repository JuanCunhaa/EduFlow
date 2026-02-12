# 06 — Enterprise / Team Tier

---

## Problem Statement

Individual subscriptions cap at ~$29/month ARPU. Enterprise L&D budgets are $1,000-$5,000/employee/year for certification training. Companies with 10-100+ employees studying for cybersecurity certifications will not buy 50 individual subscriptions — they need team billing, admin dashboards, SSO, and compliance reporting.

Enterprise is where ACV jumps from $350/year to $5,000-$50,000/year per account.

Currently: no organization concept, no team management, no multi-tenancy, no SSO, no admin roles beyond a single `admin` flag.

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Enterprise pilot signed | 1 by Day 90 |
| Team tier MRR | $500+ by Day 90 |
| Average team size | 10+ users per org |
| Enterprise ACV | $5,000+/year |
| SSO integration live | 1 (SAML) by Day 90 |

---

## MVP Scope (2 weeks)

### 1. Organization Model

**New Firestore collections:**

```
organizations/{orgId}
  name: string
  adminUids: string[]          // org admins (not platform admin)
  memberUids: string[]
  plan: 'team'
  maxSeats: number
  stripeCustomerId: string
  subscriptionId: string
  createdAt: Timestamp

organizations/{orgId}/invites/{inviteId}
  email: string
  status: 'pending' | 'accepted'
  invitedBy: string
  createdAt: Timestamp
```

**UserProfile addition:** `organizationId: string | null`

### 2. Team Billing

- Stripe subscription with `quantity` = seat count
- Price: $49/user/month (billed monthly) or $39/user/month (billed annually)
- Org admin adds/removes seats → Stripe quantity update
- Invoice sent to org billing contact

### 3. Org Admin Dashboard

Route: `/org/dashboard`

- Member list with last active date and exam count
- Invite members by email
- Remove members (downgrades to free plan)
- Team analytics: aggregate score, completion rate, certification progress
- Billing: link to Stripe Customer Portal

### 4. Role Model

| Role | Capabilities |
|------|-------------|
| `platform_admin` | Everything (existing admin role, renamed) |
| `org_admin` | Manage org members, view team analytics, billing |
| `org_member` | Pro features, visible in team analytics |
| `user` | Free or individual Pro |

Update `withAdmin` middleware to check role hierarchy.

---

## Phase 2 Scope (6–8 weeks)

1. **SSO (SAML 2.0)** — Firebase Auth supports SAML via `SAMLAuthProvider`. Configure per-org SAML provider (Okta, Azure AD, OneLogin). Auto-provision users on first SSO login. Store SAML config in `organizations/{orgId}/sso`.
2. **Compliance reporting** — Exportable CSV/PDF: "Team Certification Readiness Report" showing per-member domain scores, time studied, exams completed. L&D managers need this for budget justification.
3. **Audit log** — Queryable log of org-level actions: member added/removed, exams completed, data exported. Stored in `organizations/{orgId}/auditLog/{logId}`.
4. **Custom question pools** — Orgs can upload proprietary questions visible only to their members. Useful for companies with internal security policies they want to train on.
5. **Manager view** — Org admin sees per-member readiness score and can assign study plans: "Complete Domain 3 by March 15."
6. **SSO-enforced login** — Org admin can require SSO login (disable Google OAuth for org members).
7. **Data isolation** — Org member data queryable only by org admins. Platform admin sees aggregate only.

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Enterprise sales cycle is 3-6 months | 🟡 Medium | Start with self-serve team signup (no sales call needed for <20 seats). Enterprise sales for 20+ seats. |
| SSO implementation complexity | 🟡 Medium | Firebase SAML support is built-in but configuration-heavy. Start with one provider (Okta). Expand after validation. |
| SOC 2 requirement blocks enterprise deals | 🔴 High | Begin SOC 2 Type I preparation at Day 60. Use Vanta or Drata for automated compliance. Target: SOC 2 Type I by Month 6. |
| Multi-tenancy data leakage | 🔴 High | Firestore security rules enforce `organizationId` scoping. All org queries include `where('organizationId', '==', orgId)`. Server-side validation in middleware. |
| Feature scope explosion ("enterprise wants X") | 🟡 Medium | MVP is team billing + admin dashboard + member management. Say no to everything else until 3+ paying enterprise accounts validate demand. |
| Pricing pushback ($49/user is high for small teams) | 🟡 Medium | Offer volume discount: 10-49 seats $39/user, 50+ seats $29/user. Still 2-3x individual Pro pricing. |

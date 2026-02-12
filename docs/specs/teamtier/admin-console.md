# Admin Console — Team & Enterprise Management

> Status: DRAFT
> Date: 2026-02-12
> Role: Enterprise SaaS Architect + Sales Engineer
> Dependency: `enterprise-tier.md`, `multi-tenancy-rbac.md`, `sso-saml-oidc.md`
> Phase: Phase 1 (Team) — core; Phase 2 (Enterprise) — advanced

---

## 1. Overview

The Admin Console is the org admin's control center — where they manage seats, see ROI, and justify renewal. It must answer two questions instantly:

1. **"Is my team actually using this?"** → Analytics
2. **"Is my team getting better?"** → Cert readiness scores

If the admin console fails to answer these, churn follows.

---

## 2. Information Architecture

```
/dashboard/admin                       ← Admin Console root
├── /overview                          ← KPI summary (default view)
├── /members                           ← Member management
│   ├── /invite                        ← Invite flow
│   └── /{uid}                         ← Individual member detail
├── /analytics                         ← Team performance analytics
│   ├── /domains                       ← Domain breakdown
│   └── /trends                        ← Score trends over time
├── /content                           ← Org question bank management
│   ├── /import                        ← Import from marketplace
│   └── /create                        ← Create org questions
├── /billing                           ← Subscription & seats
└── /settings                          ← Org settings
    ├── /general                       ← Name, slug, defaults
    └── /sso                           ← SSO configuration (P2)
```

### 2.1 Route Protection

```typescript
// All /dashboard/admin/* routes require org_admin role
// Implemented via withOrgAuth('org_admin') middleware

// Phase 2: /dashboard/admin/members and /dashboard/admin/analytics
// also accessible to team_admin
```

---

## 3. Overview Dashboard

The landing page for admins. Shows at-a-glance KPIs.

### 3.1 Wireframe

```
┌─────────────────────────────────────────────────────────┐
│  Team Dashboard — {orgName}                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Members  │ │ Active   │ │ Avg      │ │ Exams    │   │
│  │    12    │ │ 7d: 9    │ │ Score    │ │ This Wk  │   │
│  │ /15 seats│ │ 30d: 11  │ │ 74%  ↑3% │ │ 47  ↑12  │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Cert Readiness          CISSP │ CC │ Sec+       │   │
│  │  ─────────────────────────────────────────────   │   │
│  │  Passing (≥80%)          │  3  │  5 │  2         │   │
│  │  Needs Work (60-79%)     │  4  │  2 │  1         │   │
│  │  At Risk (<60%)          │  2  │  0 │  0         │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Domain Performance (CISSP)                      │   │
│  │  ───────────────────────────────────              │   │
│  │  Asset Security              ████████░░  82%     │   │
│  │  Security Operations         ███████░░░  71%     │   │
│  │  Network Security            ███████░░░  69%     │   │
│  │  IAM                         ██████░░░░  63%     │   │
│  │  Risk Management             █████░░░░░  55% ⚠   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Recent Activity                                 │   │
│  │  ─────────────────                               │   │
│  │  Today  │ Jane D. completed CISSP exam (82%)     │   │
│  │         │ 3 new members accepted invites         │   │
│  │  Yest.  │ Team avg score improved +2%            │   │
│  │         │ Admin added 25 questions to bank       │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Data Sources

| KPI | Source | Update Frequency |
|-----|--------|-----------------|
| Members / seats | `org.seatCount` / `org.seatLimit` | Real-time |
| Active members (7d/30d) | `orgs/{orgId}/analytics/summary` | Daily batch |
| Average score | `orgs/{orgId}/analytics/summary.avgScore` | Daily batch |
| Exams this week | `orgs/{orgId}/analytics/daily/{date}` sum | Daily batch |
| Cert readiness | `orgs/{orgId}/analytics/summary.certReadiness` | Daily batch |
| Domain performance | Aggregate from member exam data | Daily batch |
| Recent activity | `orgs/{orgId}/activityFeed` (latest 20) | Real-time |

### 3.3 Analytics Aggregation Pipeline

```typescript
// Scheduled function (Cloud Functions or Vercel Cron)
// Runs daily at 02:00 UTC

async function aggregateOrgAnalytics(orgId: string): Promise<void> {
    const members = await getActiveMembers(orgId);
    const today = formatDate(new Date());

    let totalExams = 0;
    let totalScore = 0;
    let totalQuestions = 0;
    let totalCorrect = 0;
    const domainScores: Record<string, { correct: number; total: number }> = {};

    for (const member of members) {
        const stats = await getUserStats(member.uid);
        const todayExams = await getUserExamsForDate(member.uid, today);

        totalExams += todayExams.length;
        for (const exam of todayExams) {
            totalScore += exam.score;
            totalQuestions += exam.totalQuestions;
            totalCorrect += exam.correctAnswers;
            // Accumulate domain scores...
        }

        // Update per-member analytics
        await updateMemberDailyAnalytics(orgId, member.uid, today, todayExams);
    }

    // Write org daily analytics
    await db.doc(`orgs/${orgId}/analytics/daily/${today}`).set({
        date: today,
        activeMembers: members.filter(m => /* had activity today */).length,
        examsCompleted: totalExams,
        questionsAnswered: totalQuestions,
        correctAnswers: totalCorrect,
        avgScore: totalExams > 0 ? totalScore / totalExams : 0,
        domainScores,
    });

    // Update rolling summary
    await updateOrgSummary(orgId);
}
```

---

## 4. Member Management

### 4.1 Member List View

```
┌─────────────────────────────────────────────────────────┐
│  Members (12 / 15 seats)                [+ Invite]      │
├─────────────────────────────────────────────────────────┤
│  Search: [_______________]    Filter: [All Roles ▾]     │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Name            │ Role    │ Last Active │ Score  │    │
│  │─────────────────┼─────────┼─────────────┼────────│    │
│  │ Jane Doe        │ Admin   │ Today       │ 82%    │    │
│  │ John Smith      │ Member  │ 2 days ago  │ 74%    │    │
│  │ Sara Lee        │ Member  │ Today       │ 91%    │    │
│  │ Mike Chen       │ Member  │ 5 days ago  │ 63% ⚠  │    │
│  │ ⋯               │         │             │        │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  Pending Invites (3)                                    │
│  ┌─────────────────────────────────────────────────┐    │
│  │ alex@acme.com   │ Member │ Sent 2d ago │ [Resend]│    │
│  │ pat@acme.com    │ Member │ Sent 5d ago │ [Resend]│    │
│  │ kim@acme.com    │ Admin  │ Sent 1d ago │ [Revoke]│    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Member Actions

| Action | Phase | Who Can |
|--------|-------|---------|
| Invite member (single) | P1 | org_admin |
| Invite member (bulk CSV) | P1 stretch | org_admin |
| Resend invite | P1 | org_admin |
| Revoke invite | P1 | org_admin |
| Change role | P1 | org_admin |
| Remove member | P1 | org_admin |
| Suspend member | P1 | org_admin |
| View member detail page | P1 | org_admin |

### 4.3 Individual Member Detail

```
┌─────────────────────────────────────────────────────────┐
│  ← Members    Jane Doe                                  │
│  jane@acme.com │ Member since Jan 15, 2026              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                │
│  │ Exams    │ │ Avg Score│ │ Streak   │                │
│  │   34     │ │   78%    │ │ 12 days  │                │
│  └──────────┘ └──────────┘ └──────────┘                │
│                                                         │
│  Score Trend (30d)                                      │
│  100%│          ·                                       │
│   80%│    ·  ·    ·  · ·                                │
│   60%│  ·                                               │
│   40%│·                                                 │
│      └──────────────────────                            │
│        W1    W2    W3    W4                              │
│                                                         │
│  Domain Breakdown (CISSP)                               │
│  ─────────────────────                                  │
│  Asset Security          ████████░░  85%                │
│  IAM                     ██████░░░░  62%                │
│  Risk Management         ████░░░░░░  45% ⚠              │
│                                                         │
│  Actions: [Change Role ▾] [Suspend] [Remove]            │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Team Analytics

### 5.1 Aggregate Performance View

```
┌─────────────────────────────────────────────────────────┐
│  Team Analytics                                         │
│  Date Range: [Last 30 Days ▾]    Cert: [CISSP ▾]       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Team Score Distribution                                │
│  ┌──────────────────────────────────┐                   │
│  │     ▓▓                           │                   │
│  │  ▓▓ ▓▓ ▓▓                        │                   │
│  │  ▓▓ ▓▓ ▓▓ ▓▓                     │                   │
│  │  ▓▓ ▓▓ ▓▓ ▓▓ ▓▓                  │                   │
│  │  ▓▓ ▓▓ ▓▓ ▓▓ ▓▓ ▓▓               │                   │
│  │  50  60  70  80  90  100          │                   │
│  └──────────────────────────────────┘                   │
│                                                         │
│  Team Score Trend (30d)                                 │
│  ┌──────────────────────────────────┐                   │
│  │  80%│         ────────           │                   │
│  │  70%│   ──────                   │                   │
│  │  60%│───                         │                   │
│  │     └────────────────────        │                   │
│  │      W1   W2   W3   W4          │                   │
│  └──────────────────────────────────┘                   │
│                                                         │
│  Weakest Domains (Needs Focus)                          │
│  1. Risk Management        55% avg  (8/12 below 70%)   │
│  2. IAM                    62% avg  (5/12 below 70%)   │
│  3. Software Dev Security  64% avg  (4/12 below 70%)   │
│                                                         │
│  [Export CSV ↓]                                         │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Leaderboard (Optional)

Enabled via org settings (`showLeaderboard: true`). Visible to all members.

```
┌─────────────────────────────────────────────────────────┐
│  Team Leaderboard (CISSP — Last 30 Days)                │
├─────────────────────────────────────────────────────────┤
│  🥇  Sara Lee         91%  │  34 exams  │ 14d streak   │
│  🥈  Jane Doe         82%  │  28 exams  │ 12d streak   │
│  🥉  Alex Kim         79%  │  22 exams  │ 8d streak    │
│  4.  John Smith       74%  │  18 exams  │ 5d streak    │
│  ⋯                                                      │
│  You: #4 (John Smith)                                   │
└─────────────────────────────────────────────────────────┘
```

### 5.3 CSV Export

Admin can export team analytics as CSV for reporting to management.

Export includes:
- Per-member: name, email, exams taken, avg score, domain scores, last active
- Aggregate: team avg, domain averages, cert readiness counts
- Time period: configurable (7d, 30d, 90d, all-time)

```typescript
// API: GET /api/orgs/{orgId}/analytics/export?period=30d&format=csv
// Auth: org_admin only

interface AnalyticsExportRow {
    name: string;
    email: string;
    role: string;
    examsTaken: number;
    avgScore: number;
    lastActive: string;
    // One column per domain
    [domainName: string]: string | number;
}
```

---

## 6. Content Management

### 6.1 Org Question Bank

```
┌─────────────────────────────────────────────────────────┐
│  Org Question Bank        [+ Create] [↑ Import]         │
│  234 questions across 3 certifications                  │
├─────────────────────────────────────────────────────────┤
│  Filter: [CISSP ▾] [Domain: All ▾] [Difficulty: All ▾] │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ ✓ │ Domain 1: Security & Risk │ Q: Which of the │   │
│  │   │ Management               │ following...     │   │
│  │───┼──────────────────────────┼──────────────────│   │
│  │ ✓ │ Domain 2: Asset Security │ Q: Data classif- │   │
│  │   │                          │ ication is...    │   │
│  │───┼──────────────────────────┼──────────────────│   │
│  │   │ ⋯                        │                  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  Selected: 2   [Edit] [Delete] [Move to Domain ▾]       │
└─────────────────────────────────────────────────────────┘
```

### 6.2 Import from Marketplace

Org admins can import published marketplace question sets directly into the org bank.

```
Admin → Org Question Bank → "Import"
  → Browse marketplace studies
  → Select study → Preview questions
  → [Import to Org Bank]
  → Questions copied to orgs/{orgId}/questions/
  → Source tracked via SourceMetadata (lineage)
```

---

## 7. Billing Management

### 7.1 Billing Dashboard

```
┌─────────────────────────────────────────────────────────┐
│  Billing                                                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Current Plan: Team (Annual)                            │
│  $39/seat/month × 15 seats = $585/month ($7,020/year)   │
│  Next billing date: March 1, 2026                       │
│  Payment method: Visa ****4242                          │
│                                                         │
│  Seat Usage: 12 / 15 seats used                         │
│  ████████████░░░  80%                                   │
│                                                         │
│  [Add Seats] [Manage Payment Method] [View Invoices]    │
│                                                         │
│  ── Invoices ──                                         │
│  Feb 2026  │ $585.00  │ Paid     │ [↓ Download]         │
│  Jan 2026  │ $585.00  │ Paid     │ [↓ Download]         │
│  Dec 2025  │ $585.00  │ Paid     │ [↓ Download]         │
│                                                         │
│  [Contact Sales for Enterprise pricing]                 │
└─────────────────────────────────────────────────────────┘
```

### 7.2 Seat Management

```
[Add Seats] → Modal:
  Current: 15 seats ($585/mo)
  Add:     [5] seats
  New total: 20 seats ($780/mo)
  Prorated charge for remaining period: $97.50
  [Confirm]

[Remove Seats] → Only possible when seats > active members
  Remove at next billing cycle (no mid-cycle reduction)
```

### 7.3 Stripe Portal Integration

For advanced billing actions, redirect to Stripe Customer Portal:

```typescript
// API: POST /api/orgs/{orgId}/billing/portal
// Creates a Stripe portal session and returns the URL

const session = await stripe.billingPortal.sessions.create({
    customer: org.billing.stripeCustomerId,
    return_url: `https://examflow.pro/dashboard/admin/billing`,
});
return { url: session.url };
```

---

## 8. Org Settings

### 8.1 General Settings

```
┌─────────────────────────────────────────────────────────┐
│  Organization Settings                                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Organization Name:  [Acme Cybersecurity              ] │
│  URL Slug:           [acme-cyber                      ] │
│  Billing Email:      [billing@acme.com                ] │
│                                                         │
│  ── Study Settings ──                                   │
│  Allow personal studies:    [✓]                         │
│  Default study for new members: [CISSP ▾]               │
│  Weekly exam target:        [3] exams/week              │
│                                                         │
│  ── Visibility ──                                       │
│  Show leaderboard:          [✓]                         │
│  Show individual scores to admin: [✓]                   │
│                                                         │
│  [Save Changes]                                         │
└─────────────────────────────────────────────────────────┘
```

### 8.2 SSO Settings (Phase 2)

```
┌─────────────────────────────────────────────────────────┐
│  Single Sign-On (SSO)                    [Enterprise]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Status: ● Active (SAML 2.0 — Okta)                    │
│                                                         │
│  IdP Entity ID:     https://okta.acme.com/...           │
│  SSO URL:           https://okta.acme.com/sso/saml      │
│  Certificate:       ****...expires Dec 2026             │
│                                                         │
│  Email Domains:     acme.com, acme.co.uk                │
│  Enforcement:       [● Enforced / ○ Optional]           │
│  JIT Provisioning:  [✓] Auto-create accounts on SSO     │
│  Default Role:      [Member ▾]                          │
│                                                         │
│  ExamFlow SP Metadata:                                  │
│  ACS URL:    https://examflow.pro/__/auth/handler       │
│  Entity ID:  examflow-org-abc123                        │
│  [Download SP Metadata XML]                             │
│                                                         │
│  [Test Connection] [Save] [Disable SSO]                 │
└─────────────────────────────────────────────────────────┘
```

---

## 9. API Routes

### 9.1 Phase 1 Routes

```
// Org CRUD
POST   /api/orgs                          → Create org (+ Stripe sub)
GET    /api/orgs/{orgId}                  → Get org details
PATCH  /api/orgs/{orgId}                  → Update org settings
DELETE /api/orgs/{orgId}                  → Delete org (danger zone)

// Members
GET    /api/orgs/{orgId}/members          → List members
GET    /api/orgs/{orgId}/members/{uid}    → Get member details
PATCH  /api/orgs/{orgId}/members/{uid}    → Update role, suspend
DELETE /api/orgs/{orgId}/members/{uid}    → Remove member

// Invites
POST   /api/orgs/{orgId}/invites          → Send invite
GET    /api/orgs/{orgId}/invites          → List invites
DELETE /api/orgs/{orgId}/invites/{id}     → Revoke invite
POST   /api/join                          → Accept invite (public, token-auth)

// Org Questions
GET    /api/orgs/{orgId}/questions        → List org questions
POST   /api/orgs/{orgId}/questions        → Add question
PATCH  /api/orgs/{orgId}/questions/{qId}  → Edit question
DELETE /api/orgs/{orgId}/questions/{qId}  → Delete question
POST   /api/orgs/{orgId}/questions/import → Import from marketplace

// Analytics
GET    /api/orgs/{orgId}/analytics/summary     → Org summary
GET    /api/orgs/{orgId}/analytics/daily       → Daily data
GET    /api/orgs/{orgId}/analytics/members/{uid} → Per-member
GET    /api/orgs/{orgId}/analytics/export      → CSV export

// Billing
POST   /api/orgs/{orgId}/billing/portal        → Stripe portal URL
PATCH  /api/orgs/{orgId}/billing/seats         → Add/remove seats
```

### 9.2 Phase 2 Additions

```
// SSO
POST   /api/orgs/{orgId}/sso              → Configure SSO
PUT    /api/orgs/{orgId}/sso              → Update SSO config
DELETE /api/orgs/{orgId}/sso              → Disable SSO
POST   /api/orgs/{orgId}/sso/test         → Test SSO connection

// SCIM
GET    /api/scim/v2/{orgId}/Users         → List users
POST   /api/scim/v2/{orgId}/Users         → Create user
...

// Audit Log
GET    /api/orgs/{orgId}/audit            → List audit events
GET    /api/orgs/{orgId}/audit/export     → Export audit CSV
```

---

## 10. Component Architecture

### 10.1 New Components (Phase 1)

```
src/components/admin/
├── AdminLayout.tsx              ← Shell with admin sidebar nav
├── AdminOverview.tsx            ← KPI cards + cert readiness + activity feed
├── MemberList.tsx               ← Member table with search/filter
├── MemberDetail.tsx             ← Individual member analytics
├── InviteDialog.tsx             ← Single invite modal
├── BulkInviteDialog.tsx         ← CSV bulk invite modal
├── OrgQuestionBank.tsx          ← Org question list + CRUD
├── TeamAnalytics.tsx            ← Aggregate analytics charts
├── DomainBreakdown.tsx          ← Domain-level performance bars
├── Leaderboard.tsx              ← Team leaderboard
├── BillingDashboard.tsx         ← Plan, seats, invoices
├── OrgSettings.tsx              ← General org settings form
└── SeatUsageBar.tsx             ← Visual seat utilization
```

### 10.2 New Hooks

```typescript
// src/hooks/useOrg.ts
function useOrg(): {
    org: Organization | null;
    loading: boolean;
    isAdmin: boolean;
    isMember: boolean;
    membership: OrgMembership | null;
}

// src/hooks/useOrgMembers.ts
function useOrgMembers(orgId: string): {
    members: OrgMembership[];
    invites: OrgInvite[];
    loading: boolean;
    invite: (email: string, role: OrgRole) => Promise<void>;
    remove: (uid: string) => Promise<void>;
    changeRole: (uid: string, role: OrgRole) => Promise<void>;
}

// src/hooks/useOrgAnalytics.ts
function useOrgAnalytics(orgId: string, period: '7d' | '30d' | '90d'): {
    summary: OrgAnalyticsSummary | null;
    daily: OrgDailyAnalytics[];
    loading: boolean;
}
```

---

## 11. Audit Log (Phase 2)

### 11.1 Event Types

```typescript
type AuditEventType =
    // Members
    | 'member.invited'
    | 'member.joined'
    | 'member.removed'
    | 'member.suspended'
    | 'member.role_changed'
    // Content
    | 'question.created'
    | 'question.updated'
    | 'question.deleted'
    | 'question.imported'
    // Settings
    | 'org.settings_updated'
    | 'org.sso_configured'
    | 'org.sso_disabled'
    // Billing
    | 'billing.seats_added'
    | 'billing.seats_removed'
    | 'billing.plan_changed'
    | 'billing.payment_failed';

interface AuditEvent {
    id: string;
    type: AuditEventType;
    actorId: string;          // uid of who performed action
    actorEmail: string;
    targetId: string | null;  // uid of target user, or question ID
    targetEmail: string | null;
    metadata: Record<string, unknown>;  // e.g. { oldRole: 'member', newRole: 'admin' }
    ipAddress: string;
    userAgent: string;
    timestamp: Timestamp;
}
```

### 11.2 Storage

```
Path: orgs/{orgId}/auditLog/{eventId}
Retention: 1 year (for Team), 3 years (for Enterprise)
Index: timestamp DESC
```

### 11.3 Audit Log UI

```
┌─────────────────────────────────────────────────────────┐
│  Audit Log                     [Export CSV ↓]           │
│  Filter: [All Events ▾] [All Users ▾] [Date Range ▾]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Feb 12, 14:32 │ jane@acme.com │ member.invited        │
│                │ → alex@acme.com as Member              │
│                                                         │
│  Feb 12, 11:15 │ jane@acme.com │ question.imported     │
│                │ → 25 questions from "CISSP Domain 1"   │
│                                                         │
│  Feb 11, 09:44 │ jane@acme.com │ org.settings_updated  │
│                │ → leaderboard enabled                  │
│                                                         │
│  ⋯ [Load More]                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 12. Implementation Estimate

| Component | Phase | Effort | Priority |
|-----------|-------|--------|----------|
| Admin layout + routing | P1 | 2 days | 1 |
| Overview dashboard (KPIs) | P1 | 3 days | 1 |
| Member list + invite | P1 | 3 days | 1 |
| Member detail page | P1 | 2 days | 2 |
| Org question bank CRUD | P1 | 3 days | 1 |
| Team analytics (aggregate) | P1 | 3 days | 1 |
| Leaderboard | P1 | 1 day | 3 |
| Billing dashboard | P1 | 2 days | 1 |
| Org settings page | P1 | 1 day | 2 |
| CSV export | P1 | 1 day | 2 |
| Analytics aggregation pipeline | P1 | 3 days | 1 |
| Bulk invite | P1 stretch | 2 days | 3 |
| SSO settings page | P2 | 3 days | 1 |
| Audit log UI | P2 | 2 days | 2 |
| **Total Phase 1** | | **~24 days** | |
| **Total Phase 2 additions** | | **~5 days** | |

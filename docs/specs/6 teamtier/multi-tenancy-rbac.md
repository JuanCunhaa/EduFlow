# Multi-Tenancy & RBAC

> Status: DRAFT
> Date: 2026-02-12
> Role: Enterprise SaaS Architect
> Dependency: `enterprise-tier.md`, `money/monetization-stripe-spec.md`
> Stack: Firebase Auth + Firestore + Next.js middleware

---

## 1. Tenancy Model

### 1.1 Current State

```
Firestore
└── users/{uid}/
    ├── profile              ← UserProfile doc
    ├── studies/{studyId}    ← User's studies
    ├── questions/{qId}      ← User's questions
    ├── exams/{examId}       ← User's exams
    ├── performanceSummary/{studyId}
    ├── stats                ← UserStats doc
    └── notes/{qId}
```

Every piece of data is user-scoped. There is no concept of organization, team, or shared data.

### 1.2 Target State (Phase 1)

```
Firestore
├── orgs/{orgId}/
│   ├── (org doc)            ← Organization profile + settings
│   ├── members/{uid}        ← Membership + role
│   ├── invites/{inviteId}   ← Pending invitations
│   ├── studies/{studyId}    ← Org-shared question bank
│   ├── questions/{qId}      ← Org-shared questions
│   └── analytics/           ← Aggregated team analytics
│
└── users/{uid}/
    ├── profile              ← UserProfile + orgId + orgRole
    ├── studies/...           ← Personal studies (still exist)
    ├── questions/...         ← Personal questions (still exist)
    ├── exams/...             ← Personal exams (always user-scoped)
    ├── performanceSummary/...
    ├── stats
    └── notes/...
```

### 1.3 Key Design Decisions

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Tenant boundary | Organization (`orgId`) | Standard B2B SaaS model |
| User-org relationship (P1) | 1:1 (user belongs to max 1 org) | Simpler billing, simpler RBAC |
| User-org relationship (P2) | 1:N (user can be in multiple orgs) | Consultants, instructors teaching multiple bootcamps |
| Data isolation | Org data in `orgs/{orgId}/`, user data in `users/{uid}/` | Clean separation; user retains personal data if they leave org |
| Shared vs personal questions | Org questions are read-only for members; personal questions are private | Prevents org data leaking; org admin controls the bank |
| Exams | Always user-scoped | Exam performance is personal; org sees aggregates only |
| Analytics | Aggregated (no individual answer visibility by default) | Privacy; configurable by org admin |

---

## 2. Firestore Schema

### 2.1 Organization Document

```
Path: orgs/{orgId}
```

```typescript
interface Organization {
    id: string;
    name: string;                          // "Acme Cybersecurity Bootcamp"
    slug: string;                          // "acme-cyber" — unique, URL-safe
    ownerId: string;                       // uid of org creator
    plan: 'team' | 'enterprise';
    settings: OrgSettings;
    billing: OrgBilling;
    seatCount: number;                     // denormalized: active members
    seatLimit: number;                     // max seats per subscription
    certIds: string[];                     // assigned cert studyIds (e.g., ["cissp", "sec_plus"])
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

interface OrgSettings {
    allowPersonalStudies: boolean;         // can members create personal studies? (default: true)
    showLeaderboard: boolean;              // team leaderboard visible? (default: true)
    showIndividualScores: boolean;         // admin sees per-user scores? (default: true, enterprise toggle)
    defaultStudyId: string | null;         // auto-set active study for new members
    requiredExamsPerWeek: number | null;   // optional weekly target for members
    sso: SsoConfig | null;                 // Phase 2 — null until SSO configured
}

interface OrgBilling {
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    stripeSubscriptionStatus: StripeSubStatus;
    planPeriodEnd: number;                 // epoch ms
    billingEmail: string;
    billingInterval: 'month' | 'year';
}
```

### 2.2 Membership Document

```
Path: orgs/{orgId}/members/{uid}
```

```typescript
interface OrgMembership {
    uid: string;
    email: string;
    displayName: string;
    role: OrgRole;
    status: 'active' | 'suspended' | 'pending';
    joinedAt: Timestamp;
    invitedBy: string;                     // uid of inviter
    lastActiveAt: Timestamp;
    // Denormalized stats for admin dashboard
    examsTaken: number;
    averageScore: number;
    lastExamAt: Timestamp | null;
}

type OrgRole = 'org_admin' | 'team_admin' | 'member' | 'viewer';
```

### 2.3 Invite Document

```
Path: orgs/{orgId}/invites/{inviteId}
```

```typescript
interface OrgInvite {
    id: string;
    email: string;
    role: OrgRole;
    status: 'pending' | 'accepted' | 'expired' | 'revoked';
    invitedBy: string;                     // uid
    token: string;                         // secure random token for accept URL
    expiresAt: Timestamp;                  // 7 days from creation
    acceptedAt: Timestamp | null;
    createdAt: Timestamp;
}
```

### 2.4 UserProfile Extension

```typescript
interface UserProfile {
    // ... existing fields ...

    // ── Org membership (Phase 1: single org) ──
    orgId: string | null;                  // null = individual user
    orgRole: OrgRole | null;               // denormalized from membership doc
}
```

### 2.5 Org Analytics Collection

```
Path: orgs/{orgId}/analytics/
├── daily/{date}          ← Daily aggregate for the whole org
├── members/{uid}/daily/{date}  ← Per-member daily (for admin drill-down)
└── summary               ← Rolling 30-day summary doc
```

```typescript
interface OrgDailyAnalytics {
    date: string;                          // "2026-02-12"
    activeMembers: number;
    examsCompleted: number;
    questionsAnswered: number;
    correctAnswers: number;
    avgScore: number;
    domainScores: Record<string, { correct: number; total: number }>;
}

interface OrgAnalyticsSummary {
    totalMembers: number;
    activeMembers30d: number;
    totalExamsCompleted: number;
    avgScore: number;
    avgExamsPerMember: number;
    certReadiness: Record<string, {       // per assigned cert
        avgScore: number;
        membersAbove80: number;
        membersBelow60: number;
    }>;
    topDomains: Array<{ domain: string; avgScore: number }>;
    weakDomains: Array<{ domain: string; avgScore: number }>;
    updatedAt: Timestamp;
}
```

---

## 3. RBAC — Role-Based Access Control

### 3.1 Role Hierarchy

```
org_admin
  └── team_admin (Phase 2)
       └── member
            └── viewer
```

### 3.2 Permission Matrix

| Permission | org_admin | team_admin | member | viewer |
|------------|-----------|------------|--------|--------|
| **Org settings** | | | | |
| View org settings | ✅ | ✅ | ❌ | ❌ |
| Edit org settings | ✅ | ❌ | ❌ | ❌ |
| Manage billing | ✅ | ❌ | ❌ | ❌ |
| Configure SSO (P2) | ✅ | ❌ | ❌ | ❌ |
| **Members** | | | | |
| View member list | ✅ | ✅ | ✅ (names only) | ✅ (names only) |
| Invite members | ✅ | ✅ | ❌ | ❌ |
| Remove members | ✅ | ✅ (own team, P2) | ❌ | ❌ |
| Change member roles | ✅ | ❌ | ❌ | ❌ |
| Suspend members | ✅ | ❌ | ❌ | ❌ |
| **Content** | | | | |
| View org question bank | ✅ | ✅ | ✅ | ✅ |
| Add questions to org bank | ✅ | ✅ | ❌ | ❌ |
| Edit org questions | ✅ | ✅ | ❌ | ❌ |
| Delete org questions | ✅ | ❌ | ❌ | ❌ |
| Import from marketplace to org | ✅ | ✅ | ❌ | ❌ |
| Assign cert studies to org | ✅ | ❌ | ❌ | ❌ |
| **Exams & Practice** | | | | |
| Take practice exams (org bank) | ✅ | ✅ | ✅ | ❌ |
| Take practice exams (personal bank) | ✅ | ✅ | ✅ | ❌ |
| View own analytics | ✅ | ✅ | ✅ | ✅ |
| **Analytics** | | | | |
| View team analytics (aggregate) | ✅ | ✅ | ❌ | ❌ |
| View individual member scores | ✅ | Configurable | ❌ | ❌ |
| Export team analytics CSV | ✅ | ✅ | ❌ | ❌ |
| View leaderboard | ✅ | ✅ | If enabled | If enabled |
| **Audit (P2)** | | | | |
| View audit log | ✅ | ❌ | ❌ | ❌ |
| Export audit log | ✅ | ❌ | ❌ | ❌ |

### 3.3 Phase 1 Simplification

Phase 1 ships with **two roles only**: `org_admin` and `member`.

- `team_admin` deferred to Phase 2 (requires sub-team model)
- `viewer` deferred to Phase 2 (low demand signal)
- This reduces RBAC complexity by ~60%

### 3.4 RBAC Enforcement Architecture

```
Client Request
  → Next.js middleware (proxy.ts): verify auth cookie
  → API route handler: extract uid from session
  → withOrgAuth() middleware: load org membership, verify role
  → Service function: execute with org context
```

```typescript
// src/lib/org-middleware.ts

interface OrgContext {
    orgId: string;
    role: OrgRole;
    membership: OrgMembership;
    org: Organization;
}

/**
 * Higher-order middleware that injects org context and enforces role requirements.
 * Use in org-scoped API routes.
 */
function withOrgAuth(
    handler: (req: NextRequest, user: AuthUser, orgCtx: OrgContext) => Promise<Response>,
    requiredRole: OrgRole = 'member'
): (req: NextRequest) => Promise<Response> {
    return async (req) => {
        const user = await getAuthUser(req);        // existing auth check
        if (!user.orgId) return json({ error: 'Not a member of any organization' }, 403);

        const membership = await getOrgMembership(user.orgId, user.uid);
        if (!membership || membership.status !== 'active') return json({ error: 'Membership inactive' }, 403);

        if (!hasRole(membership.role, requiredRole)) return json({ error: 'Insufficient permissions' }, 403);

        const org = await getOrg(user.orgId);
        return handler(req, user, { orgId: user.orgId, role: membership.role, membership, org });
    };
}

/** Role hierarchy check: does `actual` role have at least `required` level? */
function hasRole(actual: OrgRole, required: OrgRole): boolean {
    const hierarchy: Record<OrgRole, number> = {
        org_admin: 100,
        team_admin: 50,
        member: 20,
        viewer: 10,
    };
    return hierarchy[actual] >= hierarchy[required];
}
```

### 3.5 Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Org document: readable by members, writable by org_admin
    match /orgs/{orgId} {
      allow read: if isOrgMember(orgId);
      allow write: if isOrgAdmin(orgId);

      // Membership: readable by org members, writable by org_admin
      match /members/{uid} {
        allow read: if isOrgMember(orgId);
        allow write: if isOrgAdmin(orgId);
      }

      // Invites: readable/writable by org_admin
      match /invites/{inviteId} {
        allow read, write: if isOrgAdmin(orgId);
      }

      // Org questions: readable by members, writable by org_admin/team_admin
      match /questions/{qId} {
        allow read: if isOrgMember(orgId);
        allow write: if isOrgAdminOrTeamAdmin(orgId);
      }

      // Analytics: readable by org_admin/team_admin
      match /analytics/{doc=**} {
        allow read: if isOrgAdminOrTeamAdmin(orgId);
      }
    }

    // User data: unchanged — user-scoped
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth.uid == uid;
    }
  }
}
```

---

## 4. Invite Flow

### 4.1 Happy Path

```
Org Admin → Admin Console → "Invite Member"
  → Enter email + role
  → System creates invite doc in Firestore
  → System sends invite email (SendGrid/Resend)
  → Recipient clicks link: /join?token={token}&org={orgId}
  → If logged in: accept invite → create membership doc
  → If not logged in: redirect to login → then accept
  → Member added, seat count incremented
  → If seat limit reached: next invite fails
```

### 4.2 Invite Email Template

```
Subject: You've been invited to {orgName} on ExamFlow

Hi,

{inviterName} has invited you to join {orgName} on ExamFlow as a {role}.

ExamFlow is a practice exam platform for cybersecurity certifications 
(CISSP, Security+, and more).

[Accept Invitation →]

This invitation expires in 7 days.

If you didn't expect this email, you can safely ignore it.
— ExamFlow
```

### 4.3 Edge Cases

| Case | Behavior |
|------|----------|
| Email already has an account | Link to existing account, create membership |
| Email doesn't have an account | Sign up via link → auto-accept invite |
| Email already in this org | Error: "This person is already a member" |
| Email in a different org | Error: "This person is already in another organization" (Phase 1: 1 org max) |
| Invite expired | Show expiration message, prompt admin to re-invite |
| Seat limit reached | Block invite creation, show "Upgrade for more seats" |
| Admin removes member | Membership set to `suspended`, user's `orgId` cleared |
| User leaves org voluntarily | Same as removal; personal data retained |

### 4.4 Bulk Invite (Phase 1 stretch)

For bootcamps with 30+ students:

```
Admin → "Bulk Invite" → Paste CSV of emails
  → System validates emails, deduplicates
  → Creates invite docs in batch
  → Sends all emails
  → Shows status: sent, already member, invalid
```

---

## 5. Shared Question Bank

### 5.1 How Org Questions Work

```
┌──────────────────────────────────────────────┐
│  Organization Question Bank                  │
│  Path: orgs/{orgId}/questions/{qId}          │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  Imported from Marketplace by Admin    │  │
│  │  OR created directly by Admin          │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  Visible to all org members (read-only)      │
│  Used in exam engine alongside personal Qs   │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│  Personal Question Bank                      │
│  Path: users/{uid}/questions/{qId}           │
│                                              │
│  Private to individual user                  │
│  Not visible to org admin                    │
│  Unaffected by org membership                │
└──────────────────────────────────────────────┘
```

### 5.2 Exam Engine Integration

When a member starts an exam:

```typescript
// Modified question pool selection for org members
function getQuestionPool(uid: string, orgId: string | null, studyId: string): Question[] {
    const personal = loadQuestions(`users/${uid}/questions`, studyId);
    const org = orgId ? loadQuestions(`orgs/${orgId}/questions`, studyId) : [];

    // Merge: org questions + personal questions, deduplicate by marketplace lineage
    return mergeQuestionPools(personal, org);
}
```

Members benefit from the org's curated question bank (larger pool) without admin needing to share individual accounts.

---

## 6. Data Lifecycle

### 6.1 Member Joins Org

```
1. Create membership doc: orgs/{orgId}/members/{uid}
2. Update user profile: orgId = orgId, orgRole = role
3. Increment org.seatCount
4. User gains access to org question bank
5. User's exam data starts contributing to org analytics
```

### 6.2 Member Leaves / Removed from Org

```
1. Set membership.status = 'suspended'
2. Clear user profile: orgId = null, orgRole = null
3. Decrement org.seatCount
4. User loses access to org question bank
5. User retains all personal data (studies, questions, exams, stats)
6. User reverts to individual plan (free or pro)
7. Org analytics stop including user's new activity
8. Historical analytics data retained (anonymized: "Former Member")
```

### 6.3 Org Deleted

```
1. All memberships cleared
2. All users' orgId/orgRole cleared
3. Org questions/analytics deleted (schedule: 30-day grace period)
4. Stripe subscription canceled
5. Users revert to individual plans
```

---

## 7. Firestore Indexes Required

```json
[
  {
    "collectionGroup": "members",
    "fields": [
      { "fieldPath": "status", "order": "ASCENDING" },
      { "fieldPath": "role", "order": "ASCENDING" }
    ]
  },
  {
    "collectionGroup": "invites",
    "fields": [
      { "fieldPath": "email", "order": "ASCENDING" },
      { "fieldPath": "status", "order": "ASCENDING" }
    ]
  },
  {
    "collectionGroup": "invites",
    "fields": [
      { "fieldPath": "token", "order": "ASCENDING" },
      { "fieldPath": "status", "order": "ASCENDING" }
    ]
  }
]
```

---

## 8. Migration Strategy

### 8.1 Backward Compatibility

All changes are **additive**:
- `UserProfile.orgId` defaults to `null` → no migration needed
- Existing users continue operating as individuals
- Org collections are new — no conflict with existing data
- Exam engine falls back to personal bank when `orgId` is null

### 8.2 Feature Flags

```typescript
const FEATURE_FLAGS = {
    TEAMS_ENABLED: process.env.NEXT_PUBLIC_TEAMS_ENABLED === 'true',
    ENTERPRISE_ENABLED: process.env.NEXT_PUBLIC_ENTERPRISE_ENABLED === 'true',
};
```

Roll out Team features behind a flag. Enable per-org or globally.

# SSO — SAML 2.0 & OIDC Integration

> Status: DRAFT
> Date: 2026-02-12
> Role: Enterprise SaaS Architect + CISO
> Dependency: `enterprise-tier.md`, `multi-tenancy-rbac.md`
> Phase: Phase 2 (Enterprise tier only)
> Stack: Firebase Auth + Next.js + Firestore

---

## 1. Overview

SSO is the #1 enterprise procurement gate. Without it, most companies with 100+ employees cannot purchase. This spec defines how ExamFlow integrates SAML 2.0 and OIDC for org-level SSO, layered on top of Firebase Auth.

### 1.1 Why Both SAML and OIDC?

| Protocol | Where It Dominates | ExamFlow Priority |
|----------|-------------------|-------------------|
| SAML 2.0 | Large enterprise (Okta, Azure AD, OneLogin, PingIdentity) | Must-have — 70-80% of enterprise IdPs |
| OIDC | Modern orgs, Google Workspace, Auth0, smaller IdPs | Must-have — growing adoption, easier to implement |

**Decision: Support both.** Firebase Auth natively supports SAML and OIDC providers — the implementation cost delta is small.

---

## 2. Architecture

### 2.1 Authentication Flow

```
┌─────────────┐      ┌──────────────┐      ┌──────────────┐
│  User        │      │  ExamFlow    │      │  Customer IdP │
│  (Browser)   │      │  (Firebase)  │      │  (Okta/Azure) │
└──────┬───────┘      └──────┬───────┘      └──────┬───────┘
       │  1. Visit /login           │                │
       │──────────────────>│                │
       │                   │                │
       │  2. Detect org    │                │
       │  (email domain    │                │
       │   or direct SSO   │                │
       │   link)           │                │
       │──────────────────>│                │
       │                   │                │
       │  3. Redirect to IdP        │                │
       │<──────────────────│                │
       │──────────────────────────────────>│
       │                   │                │
       │  4. User authenticates at IdP      │
       │<──────────────────────────────────│
       │                   │                │
       │  5. IdP sends assertion/token      │
       │──────────────────>│                │
       │                   │  6. Firebase   │
       │                   │  validates     │
       │                   │  assertion     │
       │                   │                │
       │  7. Session created │               │
       │  8. Redirect to   │                │
       │     dashboard     │                │
       │<──────────────────│                │
```

### 2.2 Domain-Based SSO Detection

When a user enters their email at `/login`:

```typescript
async function detectSsoProvider(email: string): Promise<SsoConfig | null> {
    const domain = email.split('@')[1];
    // Query Firestore for orgs with this email domain configured for SSO
    const orgsWithDomain = await db.collection('orgs')
        .where('settings.sso.emailDomains', 'array-contains', domain)
        .where('settings.sso.enforced', '==', true)
        .limit(1)
        .get();

    if (orgsWithDomain.empty) return null;
    return orgsWithDomain.docs[0].data().settings.sso as SsoConfig;
}
```

### 2.3 Direct SSO URL

Each org gets a branded SSO entry point:

```
https://examflow.pro/sso/{org-slug}
```

This bypasses email entry and redirects straight to the org's IdP.

---

## 3. Firebase Auth Configuration

### 3.1 SAML Provider (per org)

Each enterprise org gets a dedicated SAML provider registered in Firebase Auth.

```typescript
// Called when org admin enables SSO (admin console or API)
async function createSamlProvider(orgId: string, config: SamlSetupInput) {
    const providerId = `saml.org-${orgId}`;

    await admin.auth().createProviderConfig({
        providerId,
        displayName: config.displayName,
        enabled: true,
        idpEntityId: config.idpEntityId,           // e.g. "https://sts.windows.net/{tenant}/"
        ssoURL: config.ssoUrl,                     // IdP SSO URL
        x509Certificates: [config.idpCertificate], // IdP signing certificate
        rpEntityId: `examflow-${orgId}`,            // Our entity ID
        callbackURL: `https://examflow.pro/__/auth/handler`, // Firebase callback
    });

    // Store reference in org doc
    await db.doc(`orgs/${orgId}`).update({
        'settings.sso': {
            type: 'saml',
            providerId,
            emailDomains: config.emailDomains,
            enforced: config.enforced ?? false,
            jitProvisioning: config.jitProvisioning ?? true,
            createdAt: FieldValue.serverTimestamp(),
        } satisfies SsoConfig,
    });
}
```

### 3.2 OIDC Provider (per org)

```typescript
async function createOidcProvider(orgId: string, config: OidcSetupInput) {
    const providerId = `oidc.org-${orgId}`;

    await admin.auth().createProviderConfig({
        providerId,
        displayName: config.displayName,
        enabled: true,
        clientId: config.clientId,
        issuer: config.issuer,                    // e.g. "https://login.microsoftonline.com/{tenant}/v2.0"
        clientSecret: config.clientSecret,        // stored encrypted
        responseType: { code: true },             // authorization code flow
    });

    await db.doc(`orgs/${orgId}`).update({
        'settings.sso': {
            type: 'oidc',
            providerId,
            emailDomains: config.emailDomains,
            enforced: config.enforced ?? false,
            jitProvisioning: config.jitProvisioning ?? true,
            createdAt: FieldValue.serverTimestamp(),
        } satisfies SsoConfig,
    });
}
```

### 3.3 SSO Config Type

```typescript
interface SsoConfig {
    type: 'saml' | 'oidc';
    providerId: string;                    // "saml.org-{orgId}" or "oidc.org-{orgId}"
    emailDomains: string[];                // ["acme.com", "acme.co.uk"]
    enforced: boolean;                     // if true, only SSO login allowed (no password/Google)
    jitProvisioning: boolean;              // auto-create account + membership on first SSO login
    defaultRole: OrgRole;                  // role assigned to JIT-provisioned users (default: "member")
    createdAt: Timestamp;
}
```

---

## 4. Just-In-Time (JIT) Provisioning

### 4.1 First SSO Login Flow

When a user authenticates via SSO for the first time and `jitProvisioning` is true:

```
1. Firebase Auth creates the user (or links to existing)
2. Post-sign-in hook detects SSO provider ID → looks up org
3. If user not in org:
   a. Check seat limit → block if full
   b. Create membership doc: orgId/members/{uid}
   c. Set user profile: orgId, orgRole = defaultRole
   d. Increment org.seatCount
   e. Optional: send welcome email
4. If user already in org:
   a. Normal login, update lastActiveAt
```

### 4.2 Implementation

```typescript
// src/services/sso-service.ts

async function handleSsoPostLogin(user: FirebaseUser): Promise<void> {
    // Check if user signed in via an org SSO provider
    const ssoProviderData = user.providerData.find(
        p => p.providerId.startsWith('saml.org-') || p.providerId.startsWith('oidc.org-')
    );
    if (!ssoProviderData) return; // not SSO login

    const orgId = extractOrgIdFromProviderId(ssoProviderData.providerId);
    const org = await getOrg(orgId);
    if (!org || !org.settings.sso?.jitProvisioning) return;

    const existingMembership = await getOrgMembership(orgId, user.uid);
    if (existingMembership?.status === 'active') return; // already member

    // Seat check
    if (org.seatCount >= org.seatLimit) {
        throw new AppError('SEAT_LIMIT_REACHED', 'Organization has reached its seat limit');
    }

    // JIT provision
    await db.runTransaction(async (tx) => {
        tx.set(db.doc(`orgs/${orgId}/members/${user.uid}`), {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName ?? user.email,
            role: org.settings.sso!.defaultRole ?? 'member',
            status: 'active',
            joinedAt: FieldValue.serverTimestamp(),
            invitedBy: 'sso-jit',
            lastActiveAt: FieldValue.serverTimestamp(),
            examsTaken: 0,
            averageScore: 0,
            lastExamAt: null,
        });

        tx.update(db.doc(`users/${user.uid}/profile`), {
            orgId,
            orgRole: org.settings.sso!.defaultRole ?? 'member',
        });

        tx.update(db.doc(`orgs/${orgId}`), {
            seatCount: FieldValue.increment(1),
        });
    });
}
```

---

## 5. SSO Enforcement Modes

### 5.1 Optional SSO

- SSO available as a login option alongside Google OAuth
- User can sign in via Google or SSO
- Good for piloting SSO before enforcing

### 5.2 Enforced SSO

- Only SSO login allowed for the org's email domains
- Blocks Google OAuth, password auth for those domains
- Required by most enterprise security teams

```typescript
// In login page logic
async function getAvailableAuthMethods(email: string): Promise<AuthMethod[]> {
    const sso = await detectSsoProvider(email);

    if (sso?.enforced) {
        return [{ type: 'sso', providerId: sso.providerId }];
    }

    const methods: AuthMethod[] = [{ type: 'google' }];
    if (sso) methods.push({ type: 'sso', providerId: sso.providerId });
    return methods;
}
```

### 5.3 Login Page UX

```
┌──────────────────────────────────────┐
│  Sign in to ExamFlow                 │
│                                      │
│  ┌──────────────────────────────┐    │
│  │  Enter your email            │    │
│  └──────────────────────────────┘    │
│                                      │
│  [Continue →]                        │
│                                      │
│  ── If SSO detected ──               │
│                                      │
│  ┌──────────────────────────────┐    │
│  │ 🔒 Your organization uses     │    │
│  │ single sign-on. You'll be     │    │
│  │ redirected to your company's  │    │
│  │ identity provider.            │    │
│  │                               │    │
│  │ [Sign in with SSO →]          │    │
│  └──────────────────────────────┘    │
│                                      │
│  ── If SSO optional ──               │
│                                      │
│  Or continue with:                   │
│  [G] Sign in with Google             │
└──────────────────────────────────────┘
```

---

## 6. IdP Configuration Guide (for Customer IT Admins)

ExamFlow must provide a clear setup guide for each major IdP.

### 6.1 Metadata ExamFlow Provides to Customer

| Field | Value |
|-------|-------|
| ACS URL | `https://examflow.pro/__/auth/handler` |
| Entity ID | `examflow-{orgId}` |
| NameID Format | `urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress` |
| Attributes Required | `email`, `firstName`, `lastName` |
| Attributes Optional | `department`, `employeeId` |
| Signing | Responses must be signed |

### 6.2 Supported IdPs (Tested)

| IdP | Protocol | Status | Notes |
|-----|----------|--------|-------|
| Okta | SAML 2.0 | P2 Launch | Most common for CISSP-buyers |
| Azure AD (Entra ID) | SAML 2.0 / OIDC | P2 Launch | Dominant in enterprise |
| Google Workspace | OIDC | P2 Launch | Via Firebase natively |
| OneLogin | SAML 2.0 | P2+1 month | Smaller market share |
| PingIdentity | SAML 2.0 | P2+1 month | Government sector |
| Auth0 | OIDC | P2+1 month | Developer-focused orgs |

### 6.3 Self-Service SSO Setup

In the Admin Console (Phase 2):

```
Admin Console → Settings → Single Sign-On
  → Choose: SAML 2.0 or OIDC
  → Enter IdP metadata URL or upload XML
  → Configure email domains
  → Test connection (dry-run login)
  → Enable (optional or enforced)
```

---

## 7. SCIM — User Provisioning (Phase 2+)

### 7.1 What SCIM Solves

Without SCIM, admins must:
1. Manually invite each user via ExamFlow admin console
2. Manually remove users when they leave the company

With SCIM, the customer's IdP automatically syncs users.

### 7.2 SCIM Endpoints

```
Base URL: https://examflow.pro/api/scim/v2/{orgId}
Auth: Bearer token (org-specific, long-lived)

GET    /Users                → List org members
GET    /Users/{id}           → Get member
POST   /Users                → Create member (JIT)
PUT    /Users/{id}           → Update member
PATCH  /Users/{id}           → Partial update
DELETE /Users/{id}           → Deactivate member
```

### 7.3 SCIM User Schema

```json
{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "userName": "jane.doe@acme.com",
  "name": {
    "givenName": "Jane",
    "familyName": "Doe"
  },
  "emails": [
    { "value": "jane.doe@acme.com", "primary": true }
  ],
  "active": true,
  "externalId": "12345"
}
```

### 7.4 SCIM Implementation Priority

SCIM is a Phase 2+ feature — implement after SSO is stable. Many enterprise customers accept manual invite flow for 6-12 months if SSO is in place.

**Estimate:** 5-8 engineering days for basic SCIM (Users only, no Groups).

---

## 8. Session Management

### 8.1 Session Lifecycle

```
SSO Login → Firebase ID Token → session cookie (__session)
  → Cookie maxAge: 5 days (Firebase default)
  → On token refresh: silent re-auth via Firebase SDK
  → On IdP session expiry: redirect to SSO re-auth
```

### 8.2 Session Revocation

When an org admin removes a member or a user is deprovisioned via SCIM:

```typescript
async function revokeUserSessions(uid: string): Promise<void> {
    // Revoke all Firebase refresh tokens
    await admin.auth().revokeRefreshTokens(uid);

    // Clear org membership
    // User's next request will fail auth → redirect to login
}
```

### 8.3 Forced Re-Authentication

Enterprise orgs may require periodic re-auth (e.g., every 8 hours). Configurable per org:

```typescript
interface OrgSettings {
    // ... existing fields ...
    sessionMaxAge: number;  // hours, default 120 (5 days), enterprise can set 8-24
}
```

---

## 9. Security Considerations

### 9.1 SAML-Specific

| Risk | Mitigation |
|------|------------|
| XML Signature Wrapping attacks | Firebase handles SAML validation — we don't parse XML ourselves |
| Replay attacks | Firebase enforces assertion expiry + one-time use |
| IdP certificate rotation | Admin console allows updating cert; alert admin before expiry |
| Unsigned assertions | Reject — require signed responses |

### 9.2 OIDC-Specific

| Risk | Mitigation |
|------|------------|
| Token substitution | Use authorization code flow only (no implicit) |
| Client secret exposure | Store in Firebase Auth config (encrypted at rest) |
| Issuer mismatch | Validate issuer claim matches registered config |

### 9.3 General

| Risk | Mitigation |
|------|------------|
| Account linking conflicts | If email already exists via Google: prompt to link accounts |
| Domain takeover | Require DNS TXT record verification before enabling SSO for a domain |
| Shadow IT (users bypassing SSO) | Enforced SSO mode blocks non-SSO login for configured domains |

---

## 10. Audit Log Events (SSO-Related)

All SSO events are logged in the org audit trail (see `admin-console.md`):

| Event | Logged Data |
|-------|-------------|
| `sso.configured` | Admin UID, protocol, IdP entity ID |
| `sso.enforced` | Admin UID, email domains |
| `sso.disabled` | Admin UID, reason |
| `sso.login.success` | User UID, email, IdP, timestamp |
| `sso.login.failure` | Email, error code, IdP, timestamp |
| `sso.jit_provision` | User UID, email, assigned role |
| `scim.user.created` | External ID, email |
| `scim.user.deactivated` | External ID, email |

---

## 11. Implementation Estimate

| Component | Effort | Dependencies |
|-----------|--------|-------------|
| Firebase SAML provider registration (per org) | 2-3 days | Firebase Auth, Admin console |
| Firebase OIDC provider registration (per org) | 1-2 days | Firebase Auth, Admin console |
| SSO login flow (domain detection + redirect) | 2-3 days | Login page, org settings |
| JIT provisioning | 2-3 days | Membership system, seat management |
| Enforced SSO mode | 1-2 days | Login page, middleware |
| Admin console SSO settings page | 2-3 days | Admin console, IdP config |
| Self-service SSO setup wizard | 3-5 days | UI, validation, test connection |
| SCIM endpoints (Users) | 5-8 days | Membership, Firebase Auth |
| Domain verification (DNS TXT) | 2-3 days | Settings, background check |
| **Total Phase 2 SSO** | **20-32 days** | |
| **Without SCIM** | **13-21 days** | |

### Priority Order

1. SAML 2.0 support (Okta + Azure AD) — biggest enterprise unlock
2. OIDC support (Google Workspace + Auth0)
3. Enforced SSO mode
4. Self-service setup wizard
5. SCIM (defer to Phase 2+)

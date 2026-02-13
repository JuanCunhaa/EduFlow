# Privacy & Anonymization

> Status: DRAFT
> Date: 2026-02-12
> Role: Privacy Officer
> Dependencies: `event-tracking-schema.md` (what data flows in), `cross-user-analytics.md` (what aggregates flow out)

---

## 1. Privacy Posture

ExamFlow is a study tool, not a social network. Users trust us with their performance data — how often they study, what they get wrong, where they struggle. Abusing that trust is a company-ending event.

**Privacy principles (non-negotiable):**

| # | Principle | Implementation |
|---|-----------|----------------|
| 1 | **No cross-user identification** | Analytics events carry `anonId`, never raw UID or email |
| 2 | **No individual profiling for third parties** | We never sell, share, or expose individual user performance |
| 3 | **Aggregation thresholds** | No aggregate is published with fewer than K users contributing |
| 4 | **Opt-out available** | Users can opt out of analytics contribution (their data still works for them, just not globally) |
| 5 | **Data minimization** | Collect only what's needed for product insights. No IP, no user agent, no GPS. |
| 6 | **Retention limits** | Raw events TTL'd from Firestore at 90 days. Aggregates are anonymous by design. |
| 7 | **Right to deletion** | User deletes account → all their events are purged |

---

## 2. Anonymization Design

### 2.1 The `anonId` — How It Works

**Problem:** We need to track the same user across multiple events (to compute co-failure within an exam, to avoid double-counting) without storing their Firebase UID in the analytics collection.

**Solution:** One-way keyed hash.

```
anonId = HMAC-SHA256(uid, ANALYTICS_HMAC_SECRET)
```

| Property | Value |
|----------|-------|
| Algorithm | HMAC-SHA256 |
| Key | `ANALYTICS_HMAC_SECRET` — environment variable, never in code |
| Input | Firebase UID (e.g., `"abc123def456"`) |
| Output | 64-character hex string (e.g., `"a1b2c3d4..."`) |
| Deterministic | Same UID always produces same anonId (needed for deduplication) |
| One-way | Cannot reverse anonId to UID without the secret |
| Collision-resistant | SHA-256 collision probability is negligible |

### 2.2 Why HMAC, Not Plain SHA-256

Plain `SHA-256(uid)` is vulnerable to rainbow table attacks — UIDs are short, low-entropy strings. An attacker with the analytics dataset could precompute `SHA-256` for all known Firebase UIDs and re-identify users.

HMAC adds a secret key. Without the key, re-identification requires brute-forcing both the UID space and the key — computationally infeasible.

### 2.3 Key Management

| Aspect | Policy |
|--------|--------|
| Storage | Vercel environment variable (`ANALYTICS_HMAC_SECRET`) |
| Access | Only server-side code (API routes, Cloud Functions) |
| Rotation | Rotate annually. On rotation: re-hash all events with new key (one-time batch). |
| Exposure | If the key is compromised, re-identification becomes possible. Treat as a security incident: rotate immediately, re-hash all events, audit access logs. |

### 2.4 What Gets Anonymized vs What Doesn't

| Field | Anonymized? | Rationale |
|-------|-------------|-----------|
| User UID | ✅ → `anonId` | Core PII |
| Email | ❌ Never stored in events | Not needed for analytics |
| Display name | ❌ Never stored in events | Not needed |
| Exam ID | Partially — hashed or kept as-is | Not PII (exam IDs are random strings), but useful for deduplication |
| Question ID | ❌ Kept as-is | Not PII. Needed for aggregation. |
| Study/cert ID | ❌ Kept as-is | Not PII. |
| Score | ❌ Kept as-is | Anonymized via anonId — score alone is not identifying |
| Selected option | ❌ Kept as-is | Not PII |
| Time per question | ❌ Kept as-is | Not PII |
| Locale | ❌ Kept as-is | Low cardinality (2 values: en, pt-BR). Not identifying. |
| Free-text reports | ⚠️ Stripped of PII patterns | User might type their name or email in a report |

---

## 3. Aggregation Thresholds (K-Anonymity)

### 3.1 The Problem

If a cohort has only 1 user studying CGRC, that user's performance IS the aggregate. Publishing "CGRC average score: 42%" effectively exposes that user's score.

### 3.2 K-Threshold Rules

| Aggregate Type | Minimum K (Users) | What Happens Below K |
|---------------|--------------------|---------------------|
| Question p-value / difficulty | 50 attempts (any number of users) | Show author-assigned difficulty, hide data-calibrated |
| Domain accuracy percentile | 10 unique users | Hide percentile, show only user's raw accuracy |
| Cert-level percentile | 20 unique users | Hide percentile ranking |
| Co-failure correlation | 30 co-occurrences | Don't surface the correlation |
| "Most missed questions" | 50 attempts per question | Don't include in list |
| Readiness Score percentile | 20 unique users with readiness computed | Show raw readiness, hide "top X%" |

### 3.3 Implementation

```typescript
function shouldExposeAggregate(
  aggregateType: string,
  sampleSize: number,
  uniqueUsers: number
): boolean {
  const thresholds = {
    'question_difficulty': { minAttempts: 50 },
    'domain_percentile':   { minUsers: 10 },
    'cert_percentile':     { minUsers: 20 },
    'co_failure':          { minCoOccurrences: 30 },
    'most_missed':         { minAttempts: 50 },
    'readiness_percentile':{ minUsers: 20 },
  };
  
  const t = thresholds[aggregateType];
  if (t.minAttempts && sampleSize < t.minAttempts) return false;
  if (t.minUsers && uniqueUsers < t.minUsers) return false;
  return true;
}
```

### 3.4 Growth Implications

At launch, most aggregates will be below threshold. This is expected.

| Users | CISSP aggregates visible? | CC aggregates? | CGRC aggregates? |
|-------|--------------------------|----------------|-------------------|
| 10 | Some questions (popular ones) | Likely no | No |
| 50 | Most questions, some domains | Some questions | No |
| 200 | All questions, all domains, percentiles | Most questions | Some questions |
| 1,000+ | Full analytics | Full | Most |

**UX strategy:** When an aggregate is below threshold, show a message: "Not enough data yet. Keep studying — this insight unlocks after more users contribute."

This is honest, creates social proof pressure ("others are using this"), and avoids showing unreliable numbers.

---

## 4. GDPR Compliance

### 4.1 Applicability

ExamFlow has PT-BR locale support → likely Brazilian users (LGPD, similar to GDPR). May also have EU users. Treat GDPR as the baseline.

### 4.2 Lawful Basis for Processing

| Data | Lawful Basis | Justification |
|------|-------------|---------------|
| Account data (email, name) | Contract | Necessary to provide the service |
| Exam answers & scores (user's own) | Contract | Core service functionality |
| Analytics events (anonymized) | Legitimate interest | Product improvement, quality calibration, no individual impact |
| Aggregated statistics | Legitimate interest | Statistical purpose, GDPR Recital 162 |
| Self-reported pass/fail | Consent | Explicitly opt-in survey |

### 4.3 Data Processing Records

| Category | Data | Purpose | Retention | Recipients |
|----------|------|---------|-----------|------------|
| User profile | UID, email, name | Authentication, service delivery | Account lifetime | Firebase Auth |
| Exam results | Scores, answers, performance | User-facing analytics, study tools | Account lifetime | User only |
| Analytics events | anonId, answers, scores, times | Cross-user aggregation, content quality | 90 days (Firestore), indefinite (BigQuery, anonymized) | Internal only |
| Aggregated stats | Question difficulty, percentiles | Product features, content monitoring | Indefinite | Exposed to users (aggregated only) |

### 4.4 Data Subject Rights — Implementation

| Right | Implementation |
|-------|----------------|
| **Right to Access** | User can export their data via `GET /api/export` (already exists). Add analytics events export. |
| **Right to Rectification** | Users can update profile. Exam answers are immutable facts (not rectifiable). |
| **Right to Erasure** | Account deletion → delete all user docs under `users/{uid}/`. Also: find and delete all analytics events matching their `anonId`. This requires the HMAC secret to map uid → anonId for deletion. |
| **Right to Restrict Processing** | Analytics opt-out flag on user profile → stop writing new events for this user |
| **Right to Data Portability** | Export includes all user data in JSON format |
| **Right to Object** | Same as restrict processing — opt out of analytics |

### 4.5 Erasure Implementation (Critical Path)

When a user requests account deletion:

```
1. Hash their UID to get anonId:
   anonId = HMAC-SHA256(uid, ANALYTICS_HMAC_SECRET)

2. Query analytics/events where anonId matches:
   - Delete all matching event documents

3. Question/domain aggregate counters:
   - We CANNOT decrement individual user contributions from counters
   - Accept minor inaccuracy: counters include contributions from deleted users
   - This is acceptable because:
     a) Counters are high-cardinality (each user is a tiny fraction)
     b) Events are fully deleted (no re-identification possible)
     c) GDPR allows statistical aggregates to persist after deletion
        (Recital 162: "statistical purposes… no longer personal data")

4. Delete all user-scoped data:
   - users/{uid}/* (all subcollections)
   - Firebase Auth user record
```

**Timeline:** Deletion completes within 30 days (GDPR maximum). Target: 24 hours.

---

## 5. Opt-Out Design

### 5.1 What Opt-Out Means

| With Analytics (Default) | With Opt-Out |
|--------------------------|-------------|
| User's exam answers are written to `analytics/events/` | No events written |
| User's data contributes to question difficulty calibration | No contribution |
| User sees cross-user insights (percentile, readiness comparison) | User sees personal-only analytics |
| User's data improves the product for everyone | No contribution |

### 5.2 User Profile Field

```typescript
// Added to UserProfile
interface UserProfile {
  // ... existing fields ...
  analyticsOptOut?: boolean;    // default: false (opted in)
  analyticsOptOutAt?: number;   // timestamp of opt-out
}
```

### 5.3 Opt-Out Flow

```
User → Settings → Privacy → "Contribute to community analytics"
    │
    ├── Toggle ON (default): "Your anonymized exam data helps improve question 
    │   quality and powers features like Readiness Score percentile comparisons."
    │
    └── Toggle OFF: "Your data stays private. You'll still see your personal 
        analytics, but cross-user comparisons won't be available."
        │
        └── On toggle OFF:
            1. Set analyticsOptOut = true on user profile
            2. Delete existing analytics events for this anonId
            3. Stop writing new events
            4. Hide percentile/comparison UI for this user
```

### 5.4 Where Opt-Out Is Checked

```typescript
// In analytics-writer.ts
async function writeExamAnalytics(uid: string, payload: AnalyticsPayload) {
  // Check opt-out BEFORE any writes
  const user = await getUser(uid);
  if (user.analyticsOptOut) {
    return; // silently skip
  }
  
  const anonId = hmacSha256(uid, process.env.ANALYTICS_HMAC_SECRET);
  // ... proceed with event writes ...
}
```

### 5.5 Opt-Out Rate Expectations

Industry benchmarks: 2–5% opt-out rate for non-invasive analytics. Since ExamFlow's analytics are clearly beneficial to the user (better question calibration = better exam prep), expect <3%.

At 100 users with 3% opt-out = 3 users. Negligible impact on aggregate quality.

---

## 6. Data Sensitivity Classification

| Classification | Data | Handling |
|---------------|------|---------|
| **Public** | Aggregated question difficulty, percentile tables | Can be shown to any authenticated user |
| **Internal** | Raw analytics events (with anonId) | Server-side only. Never exposed to clients. Never in API responses. |
| **Confidential** | HMAC secret, uid-to-anonId mapping | Environment variable. Access-logged. Rotate annually. |
| **Restricted** | Individual user performance data | Only accessible by the user themselves (or admin for support) |

---

## 7. Security Considerations

### 7.1 Threats

| Threat | Impact | Mitigation |
|--------|--------|------------|
| Analytics collection scraped by attacker | Aggregate stats exposed (non-sensitive since anonymized) | Firestore rules: analytics collection readable only by admin |
| HMAC secret leaked | All anonIds can be reversed to UIDs | Store in Vercel env, never in code, rotate on exposure |
| Re-identification via event correlation | Attacker correlates event timestamps with login timestamps | Events are batched per exam (not real-time per question), reducing correlation surface |
| Insider threat | Employee/founder accesses raw events + user profiles | Document access policies. Minimize who has both Firestore access and HMAC secret. |
| Analytics used for user discrimination | Performance data used to deny access or service | Policy: analytics data is NEVER used for individual user decisions. It's for aggregate product improvement only. |

### 7.2 Firestore Security Rules

```
// analytics collection — server-only via admin SDK
match /analytics/{document=**} {
  allow read, write: if false;  // no client access, ever
  // All reads/writes go through admin SDK (server-side)
}
```

All analytics reads/writes use the Firebase Admin SDK (server-side). No Firestore client rules needed — deny everything on the client.

---

## 8. Privacy-by-Design Checklist

Before shipping any analytics feature, verify:

```
□ 1. Does this feature require individual user identification?
     → If yes, use user's OWN data only (not cross-user).
     → If no, use aggregated data with anonId.

□ 2. Does this expose an aggregate below K-threshold?
     → If sample size < threshold, suppress or show placeholder.

□ 3. Could this aggregate be reverse-engineered to identify a user?
     → Consider: small cohorts (CGRC has few users), rare events, 
        temporal correlation.
     → If yes: increase K-threshold or suppress.

□ 4. Is the data retention appropriate?
     → Raw events: 90 days in Firestore, then BigQuery.
     → Aggregates: indefinite (anonymous by design).
     → User-scoped data: account lifetime.

□ 5. Does opt-out work for this feature?
     → If user is opted out, is this feature hidden/degraded?
     → Does the opted-out user's data leak into this aggregate?

□ 6. Is account deletion handled?
     → If user deletes account, are their events purged?
     → Are aggregate counters acceptable with minor inaccuracy?

□ 7. Is this documented in the privacy policy?
     → Any new data collection must be reflected in the user-facing privacy policy.
```

---

## 9. Privacy Policy Updates Required

The following additions are needed when analytics ships:

### 9.1 New Section: "Cross-User Analytics"

```
We collect anonymized exam performance data to improve question quality and 
provide comparative insights (such as percentile rankings and readiness scores).

What we collect:
- Which questions you answered correctly or incorrectly
- How long you spent on each question
- Your exam scores and domain-level results

How it's anonymized:
- Your identity is replaced with a one-way hash that cannot be reversed 
  to identify you
- No names, emails, or personal details are included in analytics data
- Aggregated statistics require a minimum number of users before being 
  displayed, so no individual's performance can be inferred

How to opt out:
- Go to Settings → Privacy → toggle off "Contribute to community analytics"
- You will still see your personal performance data
- Cross-user comparisons (like percentile rankings) will not be available 
  if you opt out
```

### 9.2 Updated Data Retention Section

```
- Account data: retained while your account is active
- Exam results: retained while your account is active
- Anonymized analytics events: retained for 90 days, then deleted from 
  primary storage. Statistical aggregates (which cannot identify you) 
  are retained indefinitely.
```

### 9.3 Updated Deletion Section

```
When you delete your account:
- All personal data is deleted within 24 hours
- All anonymized analytics events associated with your account are deleted
- Aggregate statistics (like overall question difficulty scores) may retain 
  the effect of your past contributions but cannot be traced back to you
```

---

## 10. Compliance Timeline

| Day | Action |
|-----|--------|
| 7 | Implement `anonId` generation with HMAC |
| 7 | Add `analyticsOptOut` field to UserProfile |
| 14 | Implement opt-out toggle in Settings |
| 14 | Implement K-threshold checks in API responses |
| 21 | Update privacy policy text |
| 21 | Implement account deletion → analytics event purge |
| 30 | Internal privacy review (self-audit against this checklist) |
| 90 | Review opt-out rate and adjust messaging if needed |

# Moderation & Review — Quality Control Pipeline

> Status: DRAFT
> Date: 2026-02-12
> Role: Trust & Safety + Product
> Depends on: `creator-marketplace.md`
> Related: `creator-incentives-revenue-share.md`, `marketplace-economy.md`

---

## 1. Moderation Philosophy

### Principles

1. **Quality is the moat.** A marketplace full of bad content is worse than no marketplace. Every question on ExamFlow must be trustworthy.
2. **Pre-publish review, not post-publish takedown.** Content is reviewed BEFORE it goes live. This is slower but prevents damage to buyer trust.
3. **Creators are partners, not adversaries.** Revision feedback is constructive, not punitive. Goal: help them publish better content.
4. **Consistency over speed.** Every pack is evaluated against the same checklist. No favorites.
5. **Transparency.** Creators always know why something was rejected or revised. No black-box decisions.

### Moderation Scope

| Layer | What | When |
|-------|------|------|
| **Pre-publish review** | Every new pack submission and every content update with new questions | Before going live |
| **Automated checks** | Plagiarism, formatting, difficulty distribution | On submission (before human review) |
| **Post-publish audits** | Sampling audits of live packs | Ongoing (periodic) |
| **User reports** | Flagged content from buyers | On-demand |
| **Creator account review** | Suspicious accounts, high refund rates | Triggered by signals |

---

## 2. Pre-Publish Review Queue

### 2.1 Queue Management

**Route:** `/marketplace/admin/review`

**Queue priority (descending):**

| Priority | Condition | SLA |
|----------|-----------|-----|
| P0 — Resubmission | Creator addressed revision notes | 48h |
| P1 — First submission (paid pack) | Revenue at stake, creator waiting | 72h |
| P2 — First submission (free pack) | No revenue urgency | 5 business days |
| P3 — Content update (new questions added to live pack) | Pack already reviewed once | 5 business days |

### 2.2 Reviewer Assignment

Phase 1 (0-50 packs): Solo founder reviews everything.
Phase 2 (50-200 packs): Recruit 2-3 certified volunteer reviewers (compensated with free Pro + small stipend).
Phase 3 (200+ packs): Paid part-time moderators with cert-specific expertise.

**Conflict of interest rule:** A reviewer cannot review packs for a certification they don't hold. A reviewer cannot review packs by creators they know personally (self-declared).

### 2.3 Review Interface

```
Review: CISSP Domain 4 — Network Fundamentals
By: Jane Smith (✅ Verified, CISSP Certified)
Submitted: Feb 10, 2026 (2 days ago)
Type: First submission · Paid ($9.99) · 75 questions
───────────────────────────────────────────────────────

Automated Checks:
  ✅ Plagiarism check: Passed (0% match)
  ✅ Formatting check: Passed (all questions have explanations)
  ✅ Difficulty distribution: 18% easy · 52% medium · 30% hard
  ⚠️  Warning: 3 questions have very short explanations (<50 chars)

Question Review (spot-check 20%):
   Reviewing 15 of 75 questions (randomly selected)

┌─────────────────────────────────────────────────────────┐
│  Q#14 (random sample)                                   │
│  Domain: D4 — Communication & Network Security          │
│  Difficulty: Medium                                     │
│                                                         │
│  Which protocol operates at Layer 3 of the OSI model    │
│  and is responsible for logical addressing?             │
│                                                         │
│  A) TCP                                                 │
│  B) IP        ← marked correct                         │
│  C) Ethernet                                            │
│  D) HTTP                                                │
│                                                         │
│  Explanation:                                           │
│  Short: "IP operates at Layer 3 (Network) and handles  │
│  logical addressing via IP addresses."                  │
│                                                         │
│  Why others wrong:                                      │
│  A: "TCP is Layer 4 — Transport, responsible for..."    │
│  C: "Ethernet is Layer 2 — Data Link"                   │
│  D: "HTTP is Layer 7 — Application"                     │
│                                                         │
│  [✅ Correct]  [❌ Issue]  [📝 Minor fix needed]        │
│                                                         │
│  Issue note (if flagged):                               │
│  ┌─────────────────────────────────────────────────┐    │
│  │                                                 │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘

   Question 14: ✅ Correct
   Question 23: ✅ Correct
   Question 7:  📝 Minor — explanation for option C is vague
   Question 51: ❌ Issue — correct answer may be wrong (debatable)
   ... (11 more)

Overall Assessment:
   ○ Approve — ready to publish
   ○ Revision needed — see notes below
   ○ Reject — fundamental issues

Revision Notes (sent to creator):
┌─────────────────────────────────────────────────────────┐
│  Overall: Strong pack. Two issues to address:           │
│                                                         │
│  1. Q#7: The explanation for option C ("Ethernet is     │
│     wrong because...") is too vague. Please explain     │
│     why Ethernet operates at Layer 2, not Layer 3.      │
│                                                         │
│  2. Q#51: The correct answer is marked as B, but both   │
│     B and D could be considered correct depending on     │
│     the scenario. Please rephrase to make the intended  │
│     answer unambiguous.                                 │
│                                                         │
│  3. General: 3 questions have very short explanations   │
│     (<50 characters). Consider expanding them for       │
│     better learning value.                              │
└─────────────────────────────────────────────────────────┘

[Submit Review]
```

---

## 3. Review Checklist

### 3.1 Hard Fails (Auto-Reject)

These issues result in immediate rejection:

| Check | Description | Detection |
|-------|-------------|-----------|
| **Exam dump** | Questions copied verbatim from actual certification exams | Automated plagiarism check + human recognition |
| **Copyright violation** | Text copied from published study guides (Sybex, etc.) | Automated plagiarism check |
| **Factually wrong** | > 5% of questions have objectively incorrect answers | Reviewer spot check |
| **Offensive content** | Discriminatory, inappropriate, or unprofessional language | Reviewer judgment |
| **Spam/low-effort** | Questions are trivially simple, repetitive, or AI-generated garbage | Reviewer judgment |
| **Exam irrelevant** | Questions test topics not covered by the certification exam | Reviewer domain knowledge |

### 3.2 Soft Fails (Revision Needed)

These trigger revision requests:

| Check | Description | Threshold |
|-------|-------------|-----------|
| **Ambiguous correct answer** | Multiple options could be considered correct | Any occurrence |
| **Implausible distractors** | Wrong options are obviously wrong (no learning value) | > 10% of questions |
| **Thin explanations** | Explanation doesn't teach — just says "A is correct" | > 15% of questions |
| **Domain misalignment** | Question tagged under wrong domain | Any occurrence |
| **Formatting issues** | Typos, inconsistent capitalization, broken formatting | > 5 issues |
| **Too narrow difficulty** | All questions are same difficulty | Automated check |
| **Missing context** | Scenario questions lack necessary context to answer | Any occurrence |

### 3.3 Advisory (Non-Blocking)

These are communicated but don't block publication:

| Advice | Example |
|--------|---------|
| "Consider adding more hard questions" | Pack is 70% easy, 30% medium |
| "Explanation could be richer here" | Technically correct but brief |
| "This topic is already well-covered by other packs" | Market saturation warning |

---

## 4. Automated Pre-Checks

Run automatically when a creator clicks "Submit for Review," before the pack enters the human review queue.

### 4.1 Plagiarism Detection

**Method:** Fuzzy text matching against known sources.

| Source Corpus | Purpose |
|---------------|---------|
| All existing ExamFlow marketplace questions | Detect duplicates within the marketplace |
| Creator's own previously published questions | Detect self-plagiarism across packs |
| Known exam dump databases (if accessible) | Detect actual exam content |
| Web scraping of top study guide excerpts | Detect copyrighted content |

**Algorithm:**
1. For each question text, compute a normalized fingerprint (lowercase, remove stop words, stem remaining words).
2. Compare against corpus using cosine similarity on TF-IDF vectors.
3. Flag questions with > 80% similarity to any existing question.

**Phase 1 (MVP):** Simple Jaccard similarity on word trigrams. Runs on submission, takes < 30 seconds for 150 questions.

**Phase 2:** Dedicated similarity service using sentence embeddings (e.g., OpenAI embeddings or open-source alternative). Better at catching paraphrased duplicates.

**Output:**

```
Plagiarism Check Results:
─────────────────────────
✅ 72 / 75 questions: No match found
⚠️ 3 questions flagged for review:
   Q#12: 87% similar to pack "CISSP Full Exam" by Mark J. (Q#45)
   Q#34: 82% similar to pack "CISSP D4 Basics" by Sarah L. (Q#8)
   Q#61: 91% similar to Q#12 in this same pack (self-duplicate)

Flagged questions are highlighted in the review queue.
Reviewer decides: legitimate overlap vs. copied content.
```

### 4.2 Formatting Validation

| Check | Automated? | Blocking? |
|-------|------------|-----------|
| All questions have ≥ 4 options | ✅ | ✅ (hard fail) |
| All questions have a correct answer marked | ✅ | ✅ (hard fail) |
| All questions have explanation.short | ✅ | ✅ (hard fail) |
| All questions have whyOthersWrong entries for all wrong options | ✅ | ⚠️ (warning, not blocking) |
| No duplicate question text within the pack | ✅ | ✅ (hard fail) |
| Question text ≥ 20 characters | ✅ | ✅ (hard fail) |
| Option text ≥ 3 characters | ✅ | ✅ (hard fail) |
| Explanation.short ≥ 20 characters | ✅ | ⚠️ (warning) |
| Title ≤ 80 characters, no ALL CAPS | ✅ | ✅ |
| Description ≥ 100 characters | ✅ | ✅ |

### 4.3 Difficulty Distribution Check

```
Expected: At least 2 of 3 difficulty levels present
──────────────────────────────────────────────────
Actual: 18% easy · 52% medium · 30% hard → ✅ Pass

Edge case:
Actual: 0% easy · 95% medium · 5% hard → ⚠️ Warning
  "Consider adding easy-level questions for foundational practice."
```

### 4.4 AI-Generated Content Detection

**Phase 1:** No automated detection. Rely on reviewer judgment (AI-generated content often has telltale patterns: overly formal, lacks domain-specific nuance, generic explanations).

**Phase 2:** Use an AI detection tool (GPTZero, Originality.ai) as a signal (not a blocker). Flag packs where > 50% of content is likely AI-generated. Human reviewer decides.

**Policy:** AI-assisted content is allowed (creator uses AI to draft, then edits and verifies). Fully AI-generated content with no expert review is NOT allowed. The creator must certify that all content has been expert-verified.

---

## 5. Post-Publish Audits

### 5.1 Sampling Audit Schedule

| Trigger | What | Frequency |
|---------|------|-----------|
| **Periodic random audit** | Sample 10% of questions from a random live pack | Monthly |
| **High-sales audit** | Pack exceeds 100 sales | Once (at threshold) |
| **Negative review trigger** | Pack receives ≥ 3 reviews with rating ≤ 2 | Within 48h |
| **Refund rate trigger** | Pack refund rate > 15% | Within 48h |
| **User report** | Buyer flags a specific question | Within 72h |

### 5.2 Audit Process

```
1. System selects pack for audit (trigger or random)
   ↓
2. Auditor reviews 10-20% of questions (different sample than initial review)
   ↓
3. Audit outcomes:
   a) Clean — no issues found → update lastAuditAt
   b) Minor issues — notify creator to fix within 14 days
   c) Major issues — temporarily suspend pack, notify creator
   d) Policy violation — permanent removal, creator warned/banned
```

### 5.3 Audit Record

```typescript
interface AuditRecord {
    id: string;
    packId: string;
    auditorUid: string;
    triggerType: 'random' | 'high_sales' | 'negative_reviews' | 'refund_rate' | 'user_report';
    questionsReviewed: number;
    questionsTotal: number;
    issuesFound: AuditIssue[];
    outcome: 'clean' | 'minor_issues' | 'major_issues' | 'violation';
    notes: string;
    createdAt: Timestamp;
}

interface AuditIssue {
    questionId: string;
    issueType: 'factual_error' | 'plagiarism' | 'formatting' | 'domain_mismatch' | 'policy_violation';
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
}
```

---

## 6. User Report System

### 6.1 What Can Be Reported

| Entity | Report Reasons |
|--------|---------------|
| **Question** | Incorrect answer, outdated content, copied from exam, offensive language, wrong domain |
| **Pack** | Misleading description, low quality, copyright violation |
| **Review** | Fake review, abusive language, irrelevant content, review from non-purchaser |
| **Creator** | Fraudulent credentials, multiple accounts, harassment |

### 6.2 Report Flow

```
1. User clicks "Report" on question/pack/review
   ↓
2. Select reason from predefined list + optional free-text explanation
   ↓
3. Report created in moderation_actions/ with status: 'pending'
   ↓
4. If same entity receives 3+ reports → auto-escalate to P0 in review queue
   ↓
5. Moderator reviews report within SLA:
   - Question report: 48h
   - Pack report: 72h
   - Review report: 24h (fake reviews damage trust quickly)
   - Creator report: 72h
   ↓
6. Moderator actions:
   - Dismiss (report is unfounded)
   - Warn creator (first offense — email with specific issue)
   - Remove specific content (hide question/review)
   - Suspend pack (take offline pending creator fix)
   - Ban creator (severe or repeated violations)
```

### 6.3 Report Data Model

```typescript
interface ModerationReport {
    id: string;
    reporterUid: string;
    entityType: 'question' | 'pack' | 'review' | 'creator';
    entityId: string;
    packId: string | null;                  // associated pack (if applicable)
    reason: ReportReason;
    description: string | null;             // free-text from reporter
    status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
    resolution: ReportResolution | null;
    resolvedByUid: string | null;
    resolvedAt: Timestamp | null;
    resolverNotes: string | null;
    createdAt: Timestamp;
}

type ReportReason =
    | 'incorrect_answer'
    | 'outdated_content'
    | 'exam_dump'
    | 'copyright_violation'
    | 'offensive_language'
    | 'wrong_domain'
    | 'misleading_description'
    | 'low_quality'
    | 'fake_review'
    | 'abusive_review'
    | 'fraudulent_credentials'
    | 'multiple_accounts'
    | 'harassment'
    | 'other';

type ReportResolution =
    | 'no_action'            // report unfounded
    | 'content_edited'       // creator fixed the issue
    | 'content_removed'      // specific item removed
    | 'pack_suspended'       // pack taken offline
    | 'creator_warned'       // warning issued
    | 'creator_banned';      // account terminated
```

---

## 7. Creator Strike System

### 7.1 Strike Levels

| Level | Trigger | Consequence |
|-------|---------|-------------|
| **Warning** | First minor issue (formatting, single factual error) | Email notification. No restrictions. |
| **Strike 1** | Second minor issue OR first moderate issue (plagiarism of 1-2 questions, misleading description) | All future packs require review (no fast-track). Creator notification. |
| **Strike 2** | Third minor issue OR second moderate issue | Paid packs suspended for 30 days. Creator must complete "quality guidelines" review. |
| **Strike 3** | Fourth minor issue OR first major issue (exam dump, copyright violation, fake credentials) | Account permanently banned. All packs removed. Pending payouts frozen for 90 days (dispute window). |

### 7.2 Strike Record

```typescript
interface CreatorStrike {
    id: string;
    creatorUid: string;
    level: 'warning' | 'strike_1' | 'strike_2' | 'strike_3';
    reason: string;
    relatedPackId: string | null;
    relatedReportId: string | null;
    issuedByUid: string;
    issuedAt: Timestamp;
    expiresAt: Timestamp | null;         // warnings expire after 12 months
    acknowledged: boolean;                // creator must acknowledge
}
```

### 7.3 Strike Decay

Warnings expire after 12 months of clean record. Strike 1 expires after 18 months. Strike 2 never expires. Strike 3 is permanent.

### 7.4 Appeal Process

| Step | SLA | Who |
|------|-----|-----|
| 1. Creator submits appeal (free-text + evidence) | Within 14 days of strike | Creator |
| 2. Different moderator reviews (not the one who issued strike) | 7 days | Senior moderator |
| 3. Decision: uphold, reduce, or reverse | — | Senior moderator |
| 4. Creator notified of outcome | Same day as decision | System |

Appeals are limited to 1 per strike. Decision is final.

---

## 8. Content Policy

### 8.1 Allowed Content

| Category | Details |
|----------|---------|
| Original practice questions | Written by the creator, not copied |
| Scenario-based questions | Real-world cybersecurity scenarios |
| Knowledge-check questions | Testing concept understanding |
| Multi-domain questions | Cross-domain integration |
| AI-assisted content | With creator expert review and verification |

### 8.2 Prohibited Content

| Category | Details | Detection |
|----------|---------|-----------|
| **Exam dumps** | Actual questions from ISC2, CompTIA, or other certification exams | Plagiarism check + human review |
| **Copyrighted text** | Content from Sybex, Pearson, McGraw-Hill study guides | Plagiarism check |
| **Spam / low-effort** | Auto-generated garbage, keyword-stuffed, repetitive | Human review |
| **Offensive content** | Discriminatory, hateful, sexist, or violent material | Human review + user reports |
| **Misleading claims** | "Guaranteed to pass" or "These are real exam questions" | Human review |
| **Personal data** | Contains PII of real individuals | Human review |
| **Malicious content** | Questions designed to teach exploitation/hacking of specific systems | Human judgment |

### 8.3 Content Policy Versioning

The content policy is versioned. Creators must accept the latest version. Changes are communicated 30 days in advance. Existing content is not retroactively judged under new policies (unless safety-critical).

---

## 9. Moderation Dashboard — Admin View

### 9.1 Overview

```
Moderation Dashboard
─────────────────────────────────────────────────────────────

Queue Status
┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────────┐
│ Pending   │ │ In Review │ │ Avg SLA   │ │ Overdue       │
│   12      │ │    3      │ │  38h      │ │    1 ⚠️       │
└───────────┘ └───────────┘ └───────────┘ └───────────────┘

Recent Actions
┌──────────────────────────────────────────────────────────┐
│  Action          Pack/Entity       By       Time         │
│  ──────────────────────────────────────────────────────  │
│  ✅ Approved     CISSP D1 Deep     Admin    2h ago       │
│  📝 Revision     CC Full Exam      Admin    6h ago       │
│  ❌ Rejected     SSCP Quick Pack   Admin    1d ago       │
│  🚩 Report       Fake review       System   2d ago       │
│  ⚠️ Strike 1     Mark J.           Admin    3d ago       │
└──────────────────────────────────────────────────────────┘

Open Reports (7)
  3 question reports · 2 review reports · 1 pack report · 1 creator report
```

### 9.2 Moderation Action Audit Trail

Every moderation action is logged immutably:

```typescript
interface ModerationAction {
    id: string;
    actionType: 'review_decision' | 'report_resolution' | 'strike_issued' | 'pack_suspended' | 'creator_banned' | 'appeal_resolved';
    targetType: 'pack' | 'question' | 'review' | 'creator';
    targetId: string;
    moderatorUid: string;
    decision: string;                     // 'approved', 'rejected', 'revision_needed', etc.
    notes: string;                        // required — moderators must explain every action
    metadata: Record<string, unknown>;    // additional context
    createdAt: Timestamp;
}
```

All moderation actions require a written note. No silent actions.

---

## 10. SLAs & Metrics

### 10.1 Review SLAs

| Queue | Target SLA | Acceptable | Unacceptable |
|-------|-----------|------------|--------------|
| Resubmission (P0) | 24h | 48h | > 48h |
| Paid first submission (P1) | 48h | 72h | > 72h |
| Free first submission (P2) | 72h | 5 days | > 5 days |
| Content update (P3) | 72h | 5 days | > 7 days |
| User report (question/review) | 24h | 48h | > 48h |
| User report (pack/creator) | 48h | 72h | > 72h |

### 10.2 Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| First-pass approval rate | > 60% | Packs approved without revision / total submissions |
| Average revision rounds | < 1.5 | Total revision requests / total packs published |
| Post-publish issue rate | < 2% | Packs with post-publish issues / total published packs |
| False positive report rate | < 30% | Dismissed reports / total reports |
| Creator satisfaction with review | > 4.0 / 5 | Post-review survey (optional) |
| Review consistency | > 90% agreement | Two reviewers independently assess same pack (calibration check) |

### 10.3 Scaling Plan

| Scale | Reviewers | Tools | Process |
|-------|-----------|-------|---------|
| 0-50 packs | 1 (founder) | Manual checklist | Full review of every pack |
| 50-200 packs | 2-3 (volunteers + founder) | Review dashboard, automated pre-checks | Standardized checklist, second reviewer for rejections |
| 200-500 packs | 3-5 (part-time paid) | + plagiarism detection, AI content flags | Spot-check (30% sample), full review for new creators |
| 500+ packs | 5-10 (mix of paid + senior volunteer) | + full-text search, community moderation tools | Trusted creator fast-track, community-assisted flagging |

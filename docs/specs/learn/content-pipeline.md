# Content Pipeline

> Status: DRAFT
> Date: 2026-02-12
> Audience: Founder + future content team
> Dependency: `question-quality-standard.md` (quality gates referenced throughout)

---

## 1. Pipeline Overview

```
┌───────────────┐    ┌──────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│  1. DRAFT     │───▶│  2. REVIEW   │───▶│  3. QA       │───▶│ 4. STAGE    │───▶│ 5. PUBLISH   │
│  (AI + human) │    │  (expert)    │    │  (automated) │    │ (import)    │    │ (marketplace)│
└───────────────┘    └──────────────┘    └──────────────┘    └─────────────┘    └──────────────┘
       │                    │                    │                  │                     │
    10–20 min/Q         5–8 min/Q           <1 sec/Q          batch 498           auto via API
       ▼                    ▼                    ▼                  ▼                     ▼
   JSON draft         annotated JSON       pass/fail          Firestore           visible to users
```

**Throughput targets** (solo founder):
- Day 0–30: 55 questions/day → 1,650 total
- Day 31–60: 105 questions/day → 4,800 total
- Day 61–90: 127 questions/day → 8,600 total

After Day 90 with 1 contractor reviewer: 200+ questions/day.

---

## 2. Stage 1 — AI-Assisted Drafting

### 2.1 The Workflow

```
Founder picks a domain + exam objective
        │
        ▼
Run LLM prompt (GPT-4o / Claude) with:
  - Domain name + objective text
  - Question Quality Standard rules
  - 3–5 example questions from that domain
  - Existing questions (to avoid duplicates)
        │
        ▼
LLM outputs 10–20 draft questions (JSON)
        │
        ▼
Founder rapid-reviews batch (3–5 min per 10)
  - Kill obviously bad ones
  - Fix minor issues inline
  - Flag "needs research" items
        │
        ▼
Move passing questions to Stage 2 or directly to Stage 3
```

### 2.2 Prompt Template

```
You are a cybersecurity exam question author for the {CERT_NAME} certification.

Domain: {DOMAIN_ID} — {DOMAIN_NAME}
Exam Objective: {OBJECTIVE_TEXT}

Rules (MANDATORY):
1. Output ONLY valid JSON array
2. Each question follows this schema: { text, options: [{label, text}], correctOptionIndex, explanation: {short, whyOthersWrong: {A, B, C, D}}, difficulty, tags }
3. 4 options per question (labeled A–D)
4. difficulty must be one of: "easy", "medium", "hard"
5. Follow the 20/50/30 ratio (2 easy, 5 medium, 3 hard per batch of 10)
6. explanation.short must be 2+ sentences with a specific reference (standard, framework, or CBK section)
7. whyOthersWrong must have an entry for EVERY incorrect option (1–3 sentences each)
8. Distractors must be plausible real concepts, never absurd
9. BOLD qualifiers in stems: **BEST**, **FIRST**, **MOST**, **PRIMARY**, **NOT**
10. No "All of the above", "None of the above", vendor-specific answers

Standards references to use:
- NIST SP 800-53 (controls), SP 800-61 (IR), SP 800-37 (RMF), SP 800-175B (crypto)
- ISO 27001/27002, ISO 27005 (risk), ISO 27017/27018 (cloud)
- GDPR, HIPAA, SOX, PCI DSS
- ISC2 CBK, CompTIA exam objectives
- CSA CCM, OWASP Top 10

AVOID:
- Inventing standards (verify every SP/ISO number is real)
- Questions answerable without reading options
- Two options that are effectively the same answer
- Outdated technologies presented as current

Existing questions in this domain (DO NOT DUPLICATE):
{EXISTING_QUESTION_TEXTS}

Generate {COUNT} questions following the above rules.
```

### 2.3 Post-Generation Filtering (Manual, 30 Seconds Per Question)

The founder performs a fast initial sweep:

| Check | Action |
|-------|--------|
| Is the correct answer actually correct? | If unsure → flag for research, don't publish |
| Do all NIST/ISO numbers exist? | Quick Google check on any cited standard |
| Are distractors plausible? | If one is absurd → delete question or fix |
| Is the stem clear? | Read it once — if you have to re-read, rewrite |
| Does it duplicate an existing Q? | Compare against the existing questions fed to the prompt |

After this sweep, surviving questions go to Stage 2 or 3.

---

## 3. Stage 2 — Expert Review

### 3.1 Day 1–60 (Founder Reviews Own Content)

Solo founder wears the expert hat. This is why the prompt output quality matters — the author-reviewer being the same person is a weakness. Mitigations:

1. **Time separation**: Draft in the morning, review in the evening (fresh eyes)
2. **Batch reviews**: Review 50 questions at a time, not one by one
3. **Random sampling**: After the first 500 questions, random-sample 10% of new batches for deep review
4. **Track error rate**: Keep a simple counter of errors caught in review. If >15% of AI-drafted questions have issues → improve the prompt

### 3.2 Day 60+ (Contractor Reviewer)

Hire 1 part-time contractor (cybersecurity professional, ideally CISSP-certified):

| Attribute | Requirement |
|-----------|------------|
| Certification | CISSP, SSCP, or CCSP active |
| Commitment | 10–15 hours/week |
| Compensation | $40–60/hr (US) or $20–30/hr (LATAM/Eastern Europe) |
| Output | Review 50–80 questions/day |
| Access | Read-only to staging spreadsheet/JSON; flags issues via comments |

**Reviewer responsibilities:**
- Verify factual accuracy of correct answer
- Verify all cited standards/references exist
- Rate each question using the 6-dimension rubric (see `question-quality-standard.md` §10)
- Flag duplicates against existing published set
- Suggest improvements (don't just reject — explain how to fix)

### 3.3 Review Status Tracking

Each question carries a review status:

```typescript
type ReviewStatus =
  | 'draft'           // AI-generated, not yet reviewed
  | 'founder_reviewed' // Founder passed initial sweep
  | 'expert_reviewed'  // Expert reviewer approved
  | 'needs_revision'   // Rejected with feedback
  | 'approved'         // Ready for QA + import
  | 'published'        // Live in marketplace
  | 'archived';        // Removed from active use
```

This field does NOT exist in the current schema. It will be added to the drafting/staging workflow (spreadsheet or JSON files) before questions are imported into Firestore. Once in Firestore (published), the question is implicitly "published."

---

## 4. Stage 3 — Automated QA

### 4.1 Pre-Import Validation Script

Create `scripts/validate-questions.ts` — runs before any bulk import.

```typescript
// Validation checks (all must pass)
interface ValidationResult {
  questionIndex: number;
  passed: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

// ERRORS (block import)
type ValidationError =
  | 'MISSING_EXPLANATION_SHORT'
  | 'EXPLANATION_TOO_SHORT'        // < 2 sentences (check for period count)
  | 'MISSING_WHY_OTHERS_WRONG'     // any incorrect option missing
  | 'OPTION_COUNT_INVALID'         // not 4 or 5
  | 'CORRECT_INDEX_OUT_OF_RANGE'
  | 'EMPTY_OPTION_TEXT'
  | 'DUPLICATE_OPTION_TEXT'        // two options with same text
  | 'STEM_TOO_SHORT'              // < 20 characters
  | 'MISSING_DOMAIN_IDS'
  | 'INVALID_DOMAIN_ID'           // not in known domain list
  | 'MISSING_DIFFICULTY'
  | 'INVALID_DIFFICULTY'          // not easy/medium/hard
  | 'MISSING_TAGS'                // zero tags
  | 'DUPLICATE_DETECTED';         // similarity score > threshold

// WARNINGS (allow import but flag for review)
type ValidationWarning =
  | 'ALL_OF_ABOVE_DETECTED'       // option text contains "all of the above"
  | 'NONE_OF_ABOVE_DETECTED'
  | 'CORRECT_OPTION_LONGEST'      // correct answer is >30% longer than others
  | 'UNBALANCED_OPTION_LENGTHS'   // some options 3x longer than others
  | 'NO_REFERENCE_IN_EXPLANATION' // explanation.short has no standard reference
  | 'POTENTIAL_BIAS'              // flagged terms list
  | 'STEM_NEGATIVE_UNBOLD'        // "NOT" in stem without bold formatting
  | 'LOW_TAG_COUNT';              // fewer than 2 tags
```

### 4.2 Duplicate Detection

**The current codebase has ZERO duplicate detection.** This is critical to fix before scaling content.

#### Approach: TF-IDF + Cosine Similarity (Lightweight, No Dependencies)

```typescript
// scripts/duplicate-detector.ts

// 1. Build TF-IDF vectors from all existing question stems
// 2. For each new question, compute cosine similarity against all existing
// 3. Flag any pair with similarity > THRESHOLD

const DUPLICATE_THRESHOLD = 0.75;  // Exact or near-exact
const SIMILAR_THRESHOLD = 0.55;    // "Suspiciously similar, needs human review"

interface DuplicateResult {
  newQuestionIndex: number;
  existingQuestionId: string;
  similarityScore: number;
  verdict: 'duplicate' | 'similar' | 'unique';
}
```

**Why not embeddings (OpenAI, etc.)?**
- Adds API dependency + cost for a batch process
- TF-IDF is sufficient for exam questions (they share domain vocabulary, so semantic similarity shows up as word overlap)
- Can upgrade to embeddings later if TF-IDF produces too many false negatives

**Implementation priority:** Day 7–14. Run before every bulk import.

### 4.3 Difficulty Distribution Check

After QA, validate that the batch meets the target distribution:

| Cert | Easy | Medium | Hard |
|------|------|--------|------|
| All  | 20% ±5% | 50% ±5% | 30% ±5% |

If a batch is 40% easy / 40% medium / 20% hard → reject and rebalance.

---

## 5. Stage 4 — Staging & Import

### 5.1 Content Artifacts (File Format)

Questions are stored as JSON files before import:

```
content/
├── cissp/
│   ├── domain-1-sam/
│   │   ├── batch-001.json       ← 50 questions
│   │   ├── batch-002.json
│   │   └── batch-003.json
│   ├── domain-2-as/
│   └── ...
├── cc/
├── sscp/
├── ccsp/
└── cgrc/
```

Each JSON file:
```json
{
  "metadata": {
    "certId": "cissp",
    "domainId": "sam",
    "batchNumber": 1,
    "generatedAt": "2025-01-15T10:30:00Z",
    "generatedBy": "gpt-4o",
    "reviewedBy": "founder",
    "reviewedAt": "2025-01-15T14:00:00Z",
    "qaResult": {
      "passed": 47,
      "failed": 3,
      "warnings": 8
    }
  },
  "questions": [ /* ... */ ]
}
```

### 5.2 Import Process

Uses existing `MarketplaceService.bulkImportQuestions()`:

1. Run `scripts/validate-questions.ts` on batch file
2. Fix any errors
3. Run `scripts/duplicate-detector.ts` against all published questions
4. Remove/fix duplicates
5. Import via admin API (`POST /api/marketplace/studies/{studyId}/questions/import`)
6. Batch size: 498 (Firestore limit)
7. Log import result (success count, error count)

### 5.3 Versioning

**Git is the version control system.** All content JSON files are committed to the repo.

- Branch per batch: `content/cissp-domain-1-batch-003`
- PR for review (when contractor reviewer is active)
- Merge to main = ready for import
- Tag after import: `imported/cissp-domain-1-batch-003`

Benefits:
- Full audit trail (who wrote what, who reviewed, when)
- Easy rollback (revert commit + delete from Firestore)
- Diff-friendly (JSON changes are visible)

---

## 6. Stage 5 — Publishing & Post-Publish

### 6.1 Marketplace Publication

Once imported, questions are part of a `MarketplaceStudy`. Users can:
- Browse studies by certification and domain
- Import studies into their personal question pool
- Take exams using those questions

### 6.2 Post-Publish Monitoring

Track these metrics per question (requires cross-user analytics from `03-cross-user-analytics.md`):

| Metric | Threshold | Action |
|--------|-----------|--------|
| Correct rate >95% | Too easy | Review — add harder distractors or reclassify |
| Correct rate <15% | Too hard or confusing | Review — may be ambiguous or wrong |
| Skip rate >30% | Confusing stem | Review — rewrite stem |
| Report rate >0 | User flagged issue | Immediate manual review |
| Zero attempts after 30 days | Never served in exams? | Check domain/tag assignment |

### 6.3 Question Lifecycle

```
draft → reviewed → approved → published → [monitored]
                                              │
                                    ┌─────────┼─────────┐
                                    ▼         ▼         ▼
                                 active   flagged   archived
                                              │
                                              ▼
                                   revised → re-published
```

- **Flagged**: Question has a report or fails metrics threshold. Removed from exam pool until reviewed.
- **Archived**: Permanently removed. Soft-deleted (isActive=false in Firestore).
- **Revised**: Edited and re-published. Previous version is archived. New version gets a fresh ID to avoid corrupting exam history.

---

## 7. Duplicate Detection — Deep Dive

### 7.1 Why This Is Critical

At 8,600 questions, manual duplicate checking is impossible. Without automated detection:
- Users encounter the same question twice → "this is lazy"
- Near-duplicates test the same concept → wasted content budget
- SEO value degrades (duplicate content if questions are ever surfaced)

### 7.2 Implementation Plan

```
Day 7:  Build TF-IDF vectorizer for question stems
Day 8:  Build cosine similarity comparator
Day 9:  Build CLI: validate-questions.ts --check-duplicates
Day 10: Integrate into import workflow
Day 14: Add "concept fingerprint" (domain + tags + difficulty = same concept slot)
```

### 7.3 Concept Fingerprint (Beyond Text Similarity)

Two questions can have different wording but test the exact same knowledge:

```
Q1: "What is the PRIMARY purpose of a firewall?"
Q2: "Which device is PRIMARILY responsible for filtering network traffic?"
```

These have moderate text similarity (~0.5) but test the same concept.

**Concept fingerprint** = `{domainId}:{sorted_tags}:{difficulty}`

If two questions share the same fingerprint AND have text similarity >0.45 → flag as conceptual duplicate.

---

## 8. Content Refresh & Currency

### 8.1 Triggers for Content Review

| Trigger | Action |
|---------|--------|
| ISC2 updates exam outline | Map new objectives → identify gaps → draft new questions |
| Major regulation changes (GDPR amendment, new NIST publication) | Tag affected questions → review → update or archive |
| Technology deprecation (e.g., TLS 1.0/1.1) | Search for references → update or archive |
| User reports (accuracy) | Immediate review pipeline |
| Quarterly review | Random sample 5% → verify currency |

### 8.2 Exam Outline Mapping

Maintain a mapping file per certification:

```json
// content/mappings/cissp-objectives.json
{
  "certId": "cissp",
  "outlineVersion": "2024",
  "lastChecked": "2025-01-15",
  "objectives": [
    {
      "id": "1.1",
      "text": "Understand, adhere to, and promote professional ethics",
      "domain": "sam",
      "questionCount": 45,
      "lastQuestionAdded": "2025-01-10"
    }
  ]
}
```

This enables:
- Gap analysis: Which objectives have zero or few questions?
- Coverage tracking: Are all objectives adequately represented?
- Outline change detection: Compare against ISC2 published outline

---

## 9. Tooling Roadmap

| Day | Tool | Purpose |
|-----|------|---------|
| 1–3 | Prompt templates (Markdown files) | Standardize AI drafting |
| 4–6 | `scripts/validate-questions.ts` | Pre-import QA |
| 7–10 | `scripts/duplicate-detector.ts` | Duplicate detection |
| 11–14 | `content/` directory structure | Organized staging area |
| 15–20 | Objective mapping files | Gap analysis |
| 30+ | Admin dashboard metrics | Post-publish monitoring |
| 60+ | Reviewer portal (simple web UI) | Contractor review workflow |

---

## 10. Capacity Model

### Solo Founder (Day 1–60)

| Activity | Time/Day | Output |
|----------|----------|--------|
| AI prompt + batch generation | 1.5 hr | 100 draft questions |
| Rapid review (kill bad ones) | 1 hr | 60 surviving questions |
| Deep review + fact-check | 1.5 hr | 55 approved questions |
| QA script + import | 0.5 hr | 55 published questions |
| **Total** | **4.5 hr/day** | **55 questions/day** |

### Founder + 1 Contractor (Day 60+)

| Activity | Who | Time/Day | Output |
|----------|-----|----------|--------|
| AI prompt + batch generation | Founder | 2 hr | 200 draft questions |
| Rapid review | Founder | 1 hr | 150 surviving questions |
| Expert review + fact-check | Contractor | 4 hr (their day) | 80 reviewed questions |
| QA script + import | Founder | 0.5 hr | 80 published questions |
| Post-publish monitoring | Founder | 0.5 hr | — |
| **Total founder time** | | **4 hr/day** | — |
| **Total output** | | | **80 questions/day** |

Scale to 200+/day by adding a second AI-drafter (contractor) who generates batches that the expert reviews.

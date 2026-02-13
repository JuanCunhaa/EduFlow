# Certification Model Extensions

> Status: DRAFT
> Date: 2026-02-12
> Role: Product Lead — Certification Expansion
> Scope: What (if anything) needs to change in ExamFlow's data model to support CompTIA Security+ and future non-ISC2 certifications
> Dependency: `comptia-security-plus-launch.md`

---

## 1. Current Model Audit

### 1.1 Study Type (Today)

```typescript
interface Study {
    id: string;
    abbreviation: string;    // "CISSP"
    name: string;            // "Certified Information Systems Security Professional"
    domains: StudyDomain[];  // Embedded array
    questionCount: number;
    examCount: number;
    accentColor?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

interface StudyDomain {
    id: string;           // "d1"
    abbreviation: string; // "SAM"
    name: string;         // "Security and Risk Management"
    order: number;
}
```

### 1.2 ISC2 vs CompTIA Taxonomy Comparison

| Concept | ISC2 (CISSP) | CompTIA (Security+) | ExamFlow Model |
|---------|-------------|---------------------|----------------|
| Top-level grouping | Domain (8) | Domain (5) | `StudyDomain` ✅ |
| Sub-grouping | Topic area (informal) | Objective (e.g., 1.1, 1.2) | `tags[]` on Question |
| Exam weight | Per-domain % | Per-domain % | Not stored (display only in SEO) |
| Question format | Multiple choice (4 options) | Multiple choice + PBQs | `options[]` ✅ for MC |
| Passing mechanism | Scaled (700/1000) + CAT | Scaled (750/900, linear) | Not modeled (not needed) |
| Renewal | Annual AMF + CPE | 3-year, CE credits | Not modeled |

### 1.3 Verdict: What Fits, What Doesn't

| Aspect | Fits Today? | Notes |
|--------|-------------|-------|
| Domains (top-level) | ✅ Yes | `StudyDomain` maps perfectly to Sec+ domains |
| Objectives (sub-level) | ⚠️ Partial | Can use `tags[]` today; purpose-built model is better long-term |
| Multiple choice questions | ✅ Yes | 4-option MC is identical |
| PBQs (drag-drop, matching) | ❌ No | New question type needed (future) |
| Difficulty levels | ✅ Yes | `easy/medium/hard` applies universally |
| Cert vendor field | ⚠️ Missing | No way to group "all CompTIA" vs "all ISC2" certs |
| Exam weight per domain | ⚠️ Missing | Display-only; can store in SEO data only |
| Exam format metadata | ⚠️ Missing | Duration, question count, passing score — not modeled |

---

## 2. Recommended Changes

### 2.1 Change Tier Classification

Each proposed change is classified by urgency:

| Tier | Meaning | Timeline |
|------|---------|----------|
| **T0** | Required for Sec+ launch | Before launch |
| **T1** | Enhances experience, ship within 30 days | Post-launch |
| **T2** | Nice-to-have, ship when convenient | Quarter 2+ |
| **T3** | Future architecture, not needed now | 6+ months |

---

### 2.2 T0: No Schema Changes Required

**The Security+ launch requires zero data model changes.**

The `Study` + `StudyDomain` + `Question` types are already generic enough:

- Security+ domains map 1:1 to `StudyDomain`
- Security+ MC questions map 1:1 to `Question`
- `tags[]` on questions can hold objective codes ("1.1", "2.3")
- The exam engine is study-agnostic — it filters on `studyId`
- All services, hooks, and UI components operate on generic `studyId`

**Implication:** Ship Security+ by seeding data, not changing code.

---

### 2.3 T1: Certification Vendor Metadata

**Problem:** As the platform grows beyond ISC2, users and admin need to filter/group by vendor (ISC2, CompTIA, AWS, etc.).

**Solution:** Add optional `vendor` field to `Study`:

```typescript
interface Study {
    // ... existing fields
    vendor?: string;          // "ISC2" | "CompTIA" | "AWS" | "ISACA" — NEW
    examCode?: string;        // "SY0-701" | null — NEW
}
```

**Impact:**
- Additive field — no migration needed, existing docs remain valid
- UI: sidebar can group studies by vendor (collapsible sections)
- Marketplace: filter marketplace studies by vendor
- SEO: group SEO pages by vendor path if desired

**Effort:** 1-2 hours (add field to type, update sidebar UI, update marketplace filter).

---

### 2.4 T1: Exam Metadata for SEO Pages

**Problem:** Cert hub SEO pages display exam details (duration, question count, passing score). This data lives only in MDX content files today. It should be structured.

**Solution:** Add to `seo-data.ts` (not the Firestore model — this is display-only):

```typescript
interface CertSeoData {
    // ... existing fields
    examMeta: {
        code: string;           // "SY0-701"
        duration: string;       // "90 minutes"
        questionCount: string;  // "Up to 90"
        passingScore: string;   // "750/900"
        format: string;         // "Multiple choice + PBQs"
        cost: string;           // "$404"
        vendor: string;         // "CompTIA"
        vendorUrl: string;      // "https://www.comptia.org/certifications/security"
    };
}
```

**Impact:** Zero Firestore changes. Only affects SEO page rendering.

**Effort:** 30 min.

---

### 2.5 T1: Objective-Level Tagging Convention

**Problem:** Security+ SY0-701 has 28 specific objectives (e.g., "1.1 Compare and contrast various types of security controls"). Users want to practice by objective, not just domain.

**Solution:** Standardize the `tags[]` convention for objectives:

```typescript
// Convention: "obj:{code}" prefix in tags array
const question: Question = {
    // ...
    domainIds: ["d1"],
    tags: [
        "obj:1.1",                          // Objective code
        "security-controls",                // Topic tag
        "technical-controls",               // Concept tag
    ],
};
```

**Filtering:** The existing `tags` query path in `question-service.ts` doesn't support tag-based filtering today. Add a lightweight filter:

```typescript
// In ListQuestionsOptions:
tags?: string[];  // Filter questions containing ALL of these tags
```

This enables:
- Practice by objective: filter `tags` contains `"obj:1.1"`
- Future: "Objective mastery" view in analytics

**Impact:** Additive. No migration. Existing questions without objective tags continue working.

**Effort:** 2-3 hours (add tag filter to service + API + exam config UI objective picker).

---

### 2.6 T2: Domain Exam Weight

**Problem:** Cert hub pages show domain weight percentages (e.g., "Domain 4: 28%"). This is purely display data but would be useful in the exam engine for `real_mix` mode — currently `real_mix` uses difficulty distribution, not domain weight distribution.

**Solution A (Display only — T1):** Store in `seo-data.ts`, don't touch Firestore.

**Solution B (Engine integration — T2):** Add optional `weight` to `StudyDomain`:

```typescript
interface StudyDomain {
    // ... existing
    weight?: number;  // 0.28 = 28% of exam — NEW
}
```

Then update `real_mix` mode in `exam-engine.ts` to use domain weights when available:

```typescript
// In selectRealMix():
// If domains have weights, distribute questions proportionally
// Otherwise, fall back to current difficulty-based distribution
```

**Impact:** Additive field. Makes `real_mix` more realistic for certs that publish weights.

**Effort:** 3-4 hours.

---

### 2.7 T2: Multi-Select / PBQ Question Type

**Problem:** CompTIA exams include performance-based questions (PBQs) — drag-and-drop, matching, ordering. ExamFlow only supports single-correct multiple choice.

**Interim solution (T1):** Support "select N correct answers" by adding:

```typescript
interface Question {
    // ... existing
    questionType?: 'single' | 'multi_select';  // NEW, default 'single'
    correctOptionIndices?: number[];             // NEW, for multi_select
}
```

**Full PBQ support (T3):** Would require a new question rendering engine with drag-and-drop, ordering, matching UI. Out of scope for Security+ launch.

**Recommendation:** Launch with single-correct MC only. The vast majority of Security+ prep tools do the same. PBQ practice is a V2 differentiator.

**Effort:** Multi-select: 4-6 hours. Full PBQ: 40+ hours.

---

### 2.8 T3: Certification Path / Upgrade Graph

**Problem:** Users on Security+ should see a natural path to CC → CISSP. This requires modeling certification relationships.

**Solution (T3):** Add a `certPaths` registry:

```typescript
interface CertPath {
    from: string;     // studyId of source cert
    to: string;       // studyId of target cert
    relationship: 'prerequisite' | 'upgrade' | 'lateral';
    message: string;  // "Ready for the next level? Try CISSP."
}

const CERT_PATHS: CertPath[] = [
    { from: 'sec_plus', to: 'cc',    relationship: 'lateral',      message: 'Also consider ISC2 Certified in Cybersecurity' },
    { from: 'sec_plus', to: 'cissp', relationship: 'upgrade',      message: 'Ready for CISSP? You have the foundation.' },
    { from: 'cc',       to: 'cissp', relationship: 'prerequisite', message: 'CISSP is the natural next step after CC.' },
    { from: 'sscp',     to: 'cissp', relationship: 'upgrade',      message: 'Level up from SSCP to CISSP.' },
];
```

**Impact:** Powers "What's Next?" section in dashboard, post-exam nudges, and SEO comparison pages.

**Effort:** 3-4 hours (data + UI component + placement).

---

## 3. Vendor Abstraction Strategy

### 3.1 Current State: ISC2-Implicit

The codebase has no vendor-specific logic. However, several things are ISC2-implicit:
- Project name is "ISC2" (repo name, not user-facing)
- Migration script hardcodes ISC2 cert definitions
- `seo-data.ts` (planned) lists only ISC2 certs
- No vendor grouping in UI

### 3.2 Target State: Vendor-Agnostic Platform

```
ExamFlow
├── CompTIA
│   ├── Security+ (SY0-701)
│   ├── Network+ (future)
│   └── CySA+ (future)
├── ISC2
│   ├── CISSP
│   ├── CC
│   ├── SSCP
│   ├── CCSP
│   └── CGRC
├── ISACA (future)
│   ├── CISM
│   └── CISA
└── AWS (future)
    └── SAA-C03
```

### 3.3 Migration Path (Incremental, No Big Bang)

| Step | When | What |
|------|------|------|
| 1 | Sec+ launch | Add `vendor` field to Sec+ Study doc. Don't backfill ISC2 yet. |
| 2 | Post-launch | Backfill `vendor: "ISC2"` on existing studies (1 Firestore script, 5 min). |
| 3 | When adding 3rd vendor | Add vendor grouping to sidebar UI. |
| 4 | When marketplace grows | Add vendor filter to marketplace browse. |

---

## 4. Future Cert Expansion Playbook

### 4.1 "Add a New Cert" Checklist

For any future certification, follow this checklist:

```
□ 1. Research: Exam code, domains, question count, passing score, format
□ 2. Seed data: Create Study document with domains in seo-data.ts
□ 3. Question bank: Source 150+ questions (see content-plan-security-plus.md)
□ 4. Quality gate: 100% of questions pass quality standard
□ 5. Marketplace: Publish as marketplace study
□ 6. SEO pages: Cert hub + domain pages + practice questions page
□ 7. Blog: "How to pass [Cert]" + study plan
□ 8. i18n: Add cert name translations
□ 9. Launch: Sitemap update, GSC submission, social post
□ 10. Monitor: 30-day metrics review
```

### 4.2 Effort Estimate per New Cert

| Category | Hours |
|----------|-------|
| Research & domain mapping | 2 |
| Question sourcing (150 Qs) | 15-20 |
| SEO pages (hub + domains + practice) | 10-15 |
| Blog content (2 posts) | 6-8 |
| QA & testing | 2-3 |
| **Total** | **35-48 hours** |

A solo founder can launch a new cert every 2-3 weeks at steady pace.

---

## 5. Tagging Taxonomy — Cross-Vendor

### 5.1 Unified Tag Namespace

Tags should work across certs so users can discover related concepts:

| Tag Category | Example | Cross-Cert? |
|-------------|---------|-------------|
| Objective codes | `obj:1.1`, `obj:2.3` | No (cert-specific numbering) |
| Topic tags | `encryption`, `risk-management`, `access-control` | ✅ Yes |
| Concept tags | `cia-triad`, `defense-in-depth`, `zero-trust` | ✅ Yes |
| Tool/tech tags | `nmap`, `wireshark`, `siem` | ✅ Yes |
| Framework tags | `nist`, `iso-27001`, `cobit` | ✅ Yes |

### 5.2 Tag Governance

- Maintain a canonical tag list in `src/lib/seo-data.ts` or a separate `tags-registry.ts`
- No free-form tags in UI — only pick from registry (prevents duplicates like "encryption" vs "Encryption")
- Tags are lowercase, kebab-case
- Max 10 tags per question

### 5.3 Cross-Cert Topic Overlap (Security+ ↔ ISC2)

| Security+ Domain | Overlapping ISC2 Cert Domain | Shared Tags |
|-------------------|------------------------------|-------------|
| 1.0 General Security Concepts | CISSP D1: Security and Risk Management | `cia-triad`, `security-controls`, `governance` |
| 2.0 Threats & Vulnerabilities | CISSP D7: Security Operations | `malware`, `social-engineering`, `vulnerability-scanning` |
| 3.0 Security Architecture | CISSP D3: Security Architecture | `defense-in-depth`, `zero-trust`, `network-segmentation` |
| 4.0 Security Operations | CISSP D7: Security Operations | `incident-response`, `siem`, `log-management` |
| 5.0 Security Program Mgmt | CISSP D1: Security and Risk Management | `risk-management`, `compliance`, `security-awareness` |

This overlap is the engine for cross-selling: "You mastered `risk-management` in Security+. You're 30% ready for CISSP Domain 1."

---

## 6. Data Model Extension Summary

| Change | Tier | Schema Impact | Effort | Blocks Launch? |
|--------|------|---------------|--------|----------------|
| None (use existing model) | T0 | None | 0 | No ✅ |
| `vendor` field on Study | T1 | Additive | 1-2 hrs | No |
| Exam metadata in seo-data.ts | T1 | None (code-only) | 0.5 hrs | No |
| Objective tag convention | T1 | Convention (no schema) | 0 | No |
| Tag-based filtering in API | T1 | Additive | 2-3 hrs | No |
| Domain weight on StudyDomain | T2 | Additive | 3-4 hrs | No |
| Multi-select question type | T2 | Additive | 4-6 hrs | No |
| Cert path / upgrade graph | T3 | New module | 3-4 hrs | No |
| Full PBQ engine | T3 | Major new feature | 40+ hrs | No |

**Key insight: The architecture was designed right.** The generic `Study` + `Question` model means adding a new certification vendor is a content operation, not an engineering operation.

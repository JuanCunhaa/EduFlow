# CompTIA Security+ Launch — Executive Spec

> Status: DRAFT
> Date: 2026-02-12
> Role: Product Lead — Certification Expansion
> Exam: CompTIA Security+ SY0-701 (current version, effective Nov 2023)

---

## 1. Why Security+ and Why Now

### 1.1 Market Rationale

| Factor | Security+ | CISSP (current core) |
|--------|-----------|---------------------|
| Annual exam takers | ~350K-400K | ~50K-60K |
| Search volume ("security+ practice test") | ~60K/mo | ~40K/mo |
| Avg. candidate experience | 0-2 years | 5+ years |
| Candidate age / career stage | Early career, students | Mid/senior |
| Price sensitivity | Very high (students, career changers) | Moderate (employer-paid) |
| Renewal cycle | Every 3 years (CE credits) | Annual maintenance |
| Competitive density | High but low quality | Medium, Boson dominates |

**Security+ is the single highest-volume cybersecurity certification in the world.** It is a feeder: almost every CISSP candidate held Security+ first. Capturing users at Security+ creates a multi-year upgrade path to CISSP — the platform's highest-value tier.

### 1.2 Strategic Position

```
Security+ (free/cheap)  →  CC / SSCP (bridge)  →  CISSP (premium)
    ▲ Acquisition             ▲ Retention            ▲ Revenue
    High volume               Moderate volume         High ARPU
```

Security+ is the **top-of-funnel acquisition cert** — not the revenue center.

### 1.3 Competitive Landscape

| Competitor | Sec+ Questions | Price | Weakness |
|------------|---------------|-------|----------|
| Professor Messer | Free videos, no practice exams | Free / $30 | No interactive practice |
| Jason Dion (Udemy) | ~500 Qs bundled with video | $15-90 | No adaptive engine, no analytics |
| Pocket Prep | ~500 Qs | $20/month | Weak analytics, no domain focus |
| CompTIA CertMaster | ~1,000 Qs (official) | $399 | Expensive, clunky UX |
| Kaplan IT Training | ~800 Qs | $149/year | Enterprise-focused, dated UI |
| ExamCompass | ~1,500 Qs | Free (ad-supported) | Terrible UX, no explanation quality |

**ExamFlow's edge:** Adaptive exam engine, spaced repetition, domain-focused practice, real analytics — none of the competitors offer all four. The free tier undercuts everyone except ExamCompass (which has no UX to speak of).

---

## 2. Engineering Impact Assessment

### 2.1 What Already Works — Zero Changes Needed

| Component | Why It Works | Notes |
|-----------|-------------|-------|
| `Study` type | Generic: `{ abbreviation, name, domains[], questionCount }` | Security+ is just another Study |
| `StudyDomain` type | Generic: `{ id, abbreviation, name, order }` | Maps perfectly to Sec+ domains |
| `Question` type | Generic: `{ studyId, domainIds[], text, options[], difficulty, tags[] }` | Sec+ questions fit identically |
| `ExamConfig` / `ExamMode` | All modes are study-agnostic | No cert-specific logic anywhere |
| `exam-engine.ts` | Filters by `studyId`, selects by difficulty/domain | Works for any cert |
| `PerformanceSummary` | Keyed by `studyId` | Separate perf tracking for Sec+ |
| All API routes | Operate on generic `studyId` | No ISC2-specific logic |
| All services | `question-service`, `study-service`, `exam-service` | Fully generic |
| Marketplace | Supports any study with any domain structure | Sec+ can be published to marketplace |
| UI components | `ExamConfigForm`, `ExamSession`, `ExamResults` | All study-agnostic |

**Result: The data model is already certification-agnostic.** Adding Security+ requires **zero code changes** to the core platform.

### 2.2 What Needs to Be Added (Content + SEO Only)

| Task | Type | Effort |
|------|------|--------|
| Security+ Study document in Firestore | Data seed | 15 min |
| Security+ Marketplace study + questions | Data import | 1-2 hours |
| SEO pages: `/en/security-plus/` hub + domain pages | Content | 10-15 hours |
| SEO data registry entry in `seo-data.ts` | Code | 30 min |
| i18n strings for Security+ cert name / domains | Content | 30 min |
| Blog posts targeting Security+ keywords | Content | 5-10 hours |
| OG image variant for Security+ | Design | 30 min |

**Total engineering effort: ~1 hour of code changes + ~15-25 hours of content.**

### 2.3 Optional Enhancements (Post-Launch)

| Feature | Effort | Priority |
|---------|--------|----------|
| CompTIA objective-level tagging (sub-domains) | 2-4 hours | P2 — Week 4+ |
| PBQ (performance-based question) simulator | 20-40 hours | P3 — V2 |
| Sec+ → CISSP upgrade nudge UI | 2-3 hours | P2 — Month 2 |
| CE credit tracker for renewals | 10-15 hours | P3 — V2 |

---

## 3. Data Model Mapping

### 3.1 Security+ SY0-701 Exam Structure

| Property | Value |
|----------|-------|
| Exam code | SY0-701 |
| Questions | Up to 90 |
| Duration | 90 minutes |
| Format | Multiple choice + PBQs |
| Passing score | 750/900 |
| Domains | 4 |
| Current version since | November 2023 |
| Expected next version | ~2026-2027 |

### 3.2 Domain → StudyDomain Mapping

| Domain | ID | Abbreviation | Name | Exam Weight |
|--------|----|-------------|------|-------------|
| 1.0 | `d1` | `GRC` | General Security Concepts | 12% |
| 2.0 | `d2` | `THR` | Threats, Vulnerabilities, and Mitigations | 22% |
| 3.0 | `d3` | `SAR` | Security Architecture | 18% |
| 4.0 | `d4` | `SOO` | Security Operations | 28% |
| 5.0 | `d5` | `SPM` | Security Program Management and Oversight | 20% |

### 3.3 Study Document (Firestore Seed)

```json
{
  "abbreviation": "SEC+",
  "name": "CompTIA Security+",
  "domains": [
    { "id": "d1", "abbreviation": "GRC", "name": "General Security Concepts", "order": 0 },
    { "id": "d2", "abbreviation": "THR", "name": "Threats, Vulnerabilities, and Mitigations", "order": 1 },
    { "id": "d3", "abbreviation": "SAR", "name": "Security Architecture", "order": 2 },
    { "id": "d4", "abbreviation": "SOO", "name": "Security Operations", "order": 3 },
    { "id": "d5", "abbreviation": "SPM", "name": "Security Program Management and Oversight", "order": 4 }
  ],
  "questionCount": 0,
  "examCount": 0,
  "accentColor": "#C8102E"
}
```

The `accentColor` uses CompTIA's brand red to visually differentiate from ISC2 certs.

### 3.4 Sub-Domain / Objective Tagging Strategy

CompTIA Security+ has detailed sub-objectives (e.g., "1.1 Compare and contrast various types of security controls"). These can be represented using the existing `tags[]` field on questions:

```json
{
  "tags": ["1.1", "security-controls", "technical-controls", "administrative-controls"]
}
```

This avoids any schema changes while enabling future filtering by objective. A purpose-built objective taxonomy can be added later if needed (see `certification-model-extensions.md`).

---

## 4. Launch Scope

### 4.1 MVP (Week 1-2)

- [ ] Create Sec+ Study document in marketplace
- [ ] Import 150 questions (minimum viable bank)
- [ ] Publish Sec+ cert hub SEO page
- [ ] Publish 5 domain deep-dive SEO pages
- [ ] Publish practice questions lead-magnet page
- [ ] Add to sitemap and robots.txt

### 4.2 Growth (Week 3-6)

- [ ] Expand to 300 questions
- [ ] Launch blog posts: "Security+ Study Plan", "How to Pass Security+ First Time"
- [ ] Comparison pages: "Security+ Practice Exams Compared"
- [ ] Study plan guide page
- [ ] PT-BR translations (cert hub + practice page)

### 4.3 Full (Week 7-12)

- [ ] Expand to 500+ questions
- [ ] Objective-level tagging for all questions
- [ ] "Security+ → CISSP" upgrade path content
- [ ] Integration with monetization (Security+ as free tier, CISSP as paid)

---

## 5. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| CompTIA releases SY0-801 during content creation | Low (not expected until 2027) | Medium | Monitor CompTIA announcements; architecture supports versioning |
| Question quality lower than ISC2 standard | Medium | High | Same quality review process; follow `question-quality-standard.md` |
| Cannibalization of ISC2 user attention | Low | Low | Separate study context; users choose active study |
| Content perceived as too thin vs Dion/Messer | Medium | Medium | Prioritize question quality + adaptive engine over volume |
| CompTIA trademark/IP concerns | Low | Medium | Use "Security+" (generic cert name), don't use CompTIA logo |

---

## 6. Success Metrics (90 Days Post-Launch)

| Metric | Target |
|--------|--------|
| Sec+ signups | 200-500 |
| Sec+ questions in bank | 500+ |
| Sec+ organic sessions/month | 1K-3K |
| Sec+ → CISSP cross-sell conversions | 10-20% of Sec+ users browse CISSP |
| Retention: 7-day return rate (Sec+ users) | >25% |

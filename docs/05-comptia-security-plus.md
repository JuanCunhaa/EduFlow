# 05 — CompTIA Security+ Expansion

---

## Problem Statement

ExamFlow only covers ISC2 certifications (~100-150K candidates/year). CompTIA Security+ has 10x the candidate volume — it's the entry-level cybersecurity certification required by DoD 8570 for government IT roles. Adding Security+ triples the addressable market overnight.

The architecture already supports arbitrary certifications via the `Study` + `StudyDomain` model. This is a content effort, not an engineering effort.

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Security+ questions available | 1,000+ by Day 60 |
| Security+ users (registered) | 200+ by Day 90 |
| Security+ paying users | 30+ by Day 90 |
| Domain coverage (SY0-701) | All 5 domains covered |
| Revenue from Security+ segment | 20%+ of total MRR by Day 90 |

---

## MVP Scope (2 weeks)

### 1. Study Configuration

Create marketplace study for CompTIA Security+ (SY0-701):

```
{
  abbreviation: "SEC+",
  name: "CompTIA Security+ (SY0-701)",
  domains: [
    { id: "d1", abbreviation: "GAT", name: "General Security Concepts", order: 1 },
    { id: "d2", abbreviation: "THR", name: "Threats, Vulnerabilities, and Mitigations", order: 2 },
    { id: "d3", abbreviation: "ARC", name: "Security Architecture", order: 3 },
    { id: "d4", abbreviation: "OPS", name: "Security Operations", order: 4 },
    { id: "d5", abbreviation: "MGT", name: "Security Program Management and Oversight", order: 5 }
  ]
}
```

### 2. Initial Question Bank (500 questions)

- 100 questions per domain (balanced distribution)
- Difficulty split: 30% easy, 50% medium, 20% hard
- All questions include structured explanations with `whyOthersWrong`
- Source: AI-assisted generation + expert review (see [02-content-moat.md](02-content-moat.md))

### 3. Exam Configuration Presets

- Practice mode: 30 questions, untimed, all domains
- Simulation mode: 90 questions, 90 minutes, all domains, `real_mix` (matches real SY0-701 format)
- Domain focus: per-domain deep-dive

### 4. SEO Pages

- `/resources/security-plus-practice-questions` — primary landing page
- `/resources/security-plus-vs-cissp` — comparison page (high search volume)
- `/resources/security-plus-study-guide-2026`
- `/resources/security-plus-sy0-701-domains`

### 5. Landing Page Update

- Add Security+ to certification list on hero section
- Add "CompTIA Security+" to marketplace catalog
- Update meta description to include Security+

---

## Phase 2 Scope (6–8 weeks)

1. **Question bank expansion to 2,000+** — Target 400 questions per domain. Expert review pipeline from Phase 1 content moat work.
2. **Performance-Based Questions (PBQs)** — Security+ includes drag-and-drop and scenario-based questions. Build interactive question types beyond multiple-choice. Engineering effort: new `questionType` field + renderer components.
3. **CompTIA CySA+ and PenTest+** — Next certifications in the CompTIA cybersecurity track. Same domain model, new content.
4. **Security+ study plan** — Guided 8-week study plan with daily targets. Uses spaced repetition scheduling to assign daily question sets.
5. **Cross-sell between certs** — "Passed Security+? CISSP is your next step. Start studying →"

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| CompTIA trademark enforcement (stricter than ISC2) | 🟡 Medium | Use "Security+" as descriptive term. Add disclaimers. Do NOT use CompTIA logo. Review CompTIA's third-party guidelines. |
| Question quality for a new cert domain | 🟡 Medium | Recruit Security+ certified reviewers. Target: 1 reviewer per domain. |
| Splitting founder attention across two cert ecosystems | 🟡 Medium | Security+ content can be generated in parallel with ISC2 content growth. The platform work is zero — only content creation. |
| SY0-701 objectives change (CompTIA updates every 3 years) | 🟢 Low | SY0-701 launched 2023, valid until ~2026-2027. 2+ years of relevance. Monitor CompTIA announcements. |
| Candidate expectations differ (Security+ is entry-level, CISSP is advanced) | 🟡 Medium | Adjust default exam difficulty. Security+ candidates expect more "easy" and "medium" questions. Tune `REAL_MIX_DIFFICULTY` per study. |

# Question Quality Standard

> Status: DRAFT
> Date: 2026-02-12
> Audience: Anyone who creates, reviews, or imports questions into ExamFlow
> Authority: This is the canonical quality gate. Any question that violates these rules MUST be rejected or revised.

---

## 1. Purpose

A single low-quality question damages trust more than 100 good questions build it. Cybersecurity professionals are skeptical, detail-oriented, and trained to find flaws. If a CISSP candidate finds a factually wrong answer, an ambiguous stem, or a dubious distractor — they'll screenshot it, post it on r/cissp, and ExamFlow's reputation dies.

This document defines what "good" looks like and how to detect "bad."

---

## 2. Question Anatomy — Required Elements

Every question in ExamFlow maps to this schema:

```
Question
├── text: string             ← The stem (question prompt)
├── options: Option[]        ← 4 or 5 answer choices
│   ├── label: "A"
│   └── text: string
├── correctOptionIndex: number
├── explanation
│   ├── short: string        ← Why the correct answer is correct
│   └── whyOthersWrong       ← Per-distractor reasoning
│       ├── "A": string
│       ├── "B": string
│       └── "C": string      (correct option may be omitted)
├── difficulty: easy | medium | hard
├── domainIds: string[]      ← Maps to cert domain(s)
└── tags: string[]           ← Topic keywords
```

**Every field is mandatory for publication.** A question without `whyOthersWrong` for all incorrect options is incomplete and MUST NOT be published.

---

## 3. Stem (Question Text) Rules

### 3.1 Clarity

| Rule | Good | Bad |
|------|------|-----|
| Ask one thing only | "What protocol provides mutual authentication?" | "What protocol provides mutual authentication and what layer does it operate on?" |
| State the question clearly | "Which of the following BEST describes..." | "Regarding security, which is true?" |
| Avoid negatives when possible | "Which control is MOST effective..." | "Which of the following is NOT a control?" (acceptable but last resort) |
| Bold qualifiers | "What is the **MOST** important..." | "What is the most important..." |
| Qualify negatives explicitly | "Which is **NOT** a benefit of..." | "Which isn't a benefit..." |

### 3.2 Length Guidelines

| Difficulty | Stem Length | Notes |
|------------|------------|-------|
| Easy | 1–3 sentences | Direct recall. Definition or concept. |
| Medium | 2–5 sentences | Applied scenario. Context required. |
| Hard | 4–10 sentences | Multi-step scenario. "Your organization..." setup. |

### 3.3 Scenario Construction (Medium/Hard)

Good scenario stems include:
- **Role**: "As a security architect, you are tasked with..."
- **Context**: Company type, data type, regulatory environment
- **Constraint**: Budget, timeline, existing infrastructure
- **Trigger**: Incident, audit finding, business change
- **Question**: "What should you recommend **FIRST**?"

```
GOOD (Hard):
"Your organization operates in the EU and stores customer health records in 
a US-based cloud provider. During a routine audit, you discover that the 
provider's subprocessor transfers data to a data center in Singapore without 
explicit contractual authorization. As the DPO, what is your MOST immediate 
concern?"

BAD (Hard):
"A company has data in the cloud. What regulation applies?"
```

### 3.4 Forbidden Patterns in Stems

| Pattern | Why It's Bad | Example |
|---------|-------------|---------|
| "All of the following EXCEPT" | Increases cognitive load, error-prone | Use positive framing instead |
| Trick questions | Tests trick identification, not knowledge | "Which of these is security?" (vague) |
| Vendor-specific answers | ISC2/CompTIA exams are vendor-neutral | "Which Cisco feature..." |
| Absolute language without bolding | Ambiguous | "always", "never" without emphasis |
| Cultural/geographic bias | Assumes US-only context (unless relevant) | "Under US federal law..." (ok only if explicitly a US law question) |
| Overly current events | Dates quickly | "After the 2024 CrowdStrike incident..." |

---

## 4. Answer Options (Distractors) Rules

### 4.1 Construction Principles

| Rule | Description |
|------|-------------|
| **Plausible** | Every distractor must be a real concept or practice in the domain. No absurd options. |
| **Parallel structure** | All options should have similar grammatical form and length. |
| **Independent** | No "All of the above" or "Both A and C." |
| **No giveaways** | Correct answer should not be obviously longer, more specific, or more technical. |
| **Uniform length** | Correct answer within ±30% word count of the longest distractor. |
| **No contradictions** | Options should not contradict each other in a way that reveals the answer. |

### 4.2 Distractor Sources (How to Write Good Wrong Answers)

| Source | Example |
|--------|---------|
| **Common misconception** | Confusing authentication with authorization |
| **Adjacent concept** | Listing TLS as answer when the question is about IPSec |
| **Correct for a different context** | A control that's correct for HIPAA but wrong for GDPR |
| **Partially correct** | A step that's part of the process but not the BEST first step |
| **Outdated practice** | An approach that was once recommended but is now superseded |

### 4.3 "Best Answer" Questions

For hard questions, ALL options may be partially correct. The question asks for the **BEST** or **FIRST** or **MOST** appropriate.

Rules:
- The correct answer must be **unambiguously better** than alternatives
- `explanation.short` must explain WHY it's better, not just that it's correct
- `whyOthersWrong` must explain why each alternative is **less optimal** (not wrong per se)
- Never have two options that a qualified expert would consider equally valid

### 4.4 Option Patterns to Avoid

| Pattern | Problem |
|---------|---------|
| One option is twice as long as others | Length = correctness signal |
| "None of the above" | Lazy distractor, untestable |
| "All of the above" | Creates dependency between options |
| Options that are subsets of each other | "Firewall" and "Next-gen firewall" as separate options |
| Identical options with minor wording difference | "Perform a risk assessment" vs "Conduct a risk evaluation" |
| Options starting with articles and some not | "A firewall" / "Encryption" / "An IDS" / "Logging" — inconsistent |

---

## 5. Explanation Standards

### 5.1 `explanation.short` (Why the Correct Answer Is Correct)

| Requirement | Min | Example |
|-------------|-----|---------|
| Length | 2 sentences | — |
| Content | State the concept, cite the standard/framework if applicable | "AES-256 is the correct answer because it provides 256-bit symmetric encryption and is approved by NIST (SP 800-175B) for protecting classified information up to TOP SECRET." |
| Tone | Educational, confident, non-condescending | Not "Obviously, the answer is..." |
| Reference | Cite source when possible | "(ISC2 CBK, Domain 3)" or "(NIST SP 800-53, AC-2)" |

### 5.2 `explanation.whyOthersWrong` (Per-Distractor Reasoning)

**Mandatory for every incorrect option. No exceptions.**

| Requirement | Example |
|-------------|---------|
| Option-specific | "B: 3DES is a legacy algorithm. While it provides encryption, it has been deprecated by NIST since 2023 and is not recommended for new implementations." |
| Not dismissive | NOT "B is wrong." or "B: Incorrect." |
| Educational | Explain what the distractor IS and why it doesn't fit HERE |
| Distinguish from correct | Show the specific gap between this option and the correct one |

**Length:** 1–3 sentences per distractor. Enough to teach, not so much that it overwhelms.

### 5.3 Explanation Anti-Patterns

| Anti-Pattern | Fix |
|-------------|-----|
| "The answer is C because C is correct." | Explain WHY — cite a principle, standard, or logical reasoning |
| Explaining the correct answer in the wrong option section | Keep each `whyOthersWrong` entry focused on THAT option |
| Copy-pasting the same explanation for multiple wrong options | Each distractor is wrong for a different reason — explain that reason |
| "This is a common misconception." (without explaining the misconception) | State what the misconception IS and why it's wrong |
| Referencing unofficial/dubious sources | Cite ISC2 CBK, NIST, ISO 27001, CompTIA objectives — not random blogs |

---

## 6. Difficulty Calibration

### 6.1 Author-Assigned Difficulty (Day 1)

Authors assign difficulty based on cognitive level:

| Difficulty | Bloom's Level | Question Style | Example |
|------------|--------------|----------------|---------|
| **Easy** | Remember, Understand | Definition, recognition, recall | "What does CIA stand for in information security?" |
| **Medium** | Apply, Analyze | Scenario with clear answer, process ordering | "A company needs to classify data. Which classification level is appropriate for internal financial reports?" |
| **Hard** | Evaluate, Create | Multi-step scenario, "best" answer, trade-offs | "During an incident response, your team discovers evidence of APT activity spanning 6 months. The CISO wants immediate containment, but legal counsel recommends preserving evidence. What should you recommend FIRST?" |

### 6.2 Data-Calibrated Difficulty (Day 60+)

Once cross-user analytics are active (see `03-cross-user-analytics.md`):

| Correct Rate (50+ attempts) | Calibrated Difficulty |
|------------------------------|----------------------|
| >80% | Easy |
| 40–80% | Medium |
| <40% | Hard |

If calibrated difficulty differs from author-assigned by 2 levels (e.g., author said "hard" but 90% get it right), flag for review. Either:
- Upgrade distractors to be more plausible (make it harder)
- Reclassify to actual difficulty
- If a question is too easy to be useful, archive it

---

## 7. Preventing Hallucinated/Wrong Answers

### 7.1 The AI Hallucination Problem

LLMs generating certification questions will:
- Invent standards that don't exist ("NIST SP 800-99")
- Misattribute capabilities ("AES provides authentication" — it doesn't)
- Confuse similar acronyms (SAML vs SASL, TLS vs SSL)
- Apply concepts to wrong frameworks (mixing COBIT controls into an ISC2 question)
- Generate plausible but factually wrong explanations

### 7.2 Validation Checklist (Applied to Every Question)

```
□ 1. Is the correct answer UNAMBIGUOUSLY correct?
     → Could a certified professional argue for a different answer?
     → If yes: rewrite the question or change the answer.

□ 2. Are all cited standards/frameworks real?
     → Verify: NIST SP numbers, ISO numbers, ISC2 domain names
     → Cross-check against official documentation

□ 3. Is the difficulty appropriate?
     → Easy: Would a student pass this after reading one chapter?
     → Medium: Does this require applying knowledge to a scenario?
     → Hard: Does this require evaluating trade-offs?

□ 4. Are all distractors plausible but wrong?
     → Would a real candidate with partial knowledge select each distractor?
     → Is any distractor so wrong that it's a giveaway?

□ 5. Do explanations contain factual claims?
     → Verify every factual claim in explanation.short
     → Verify every factual claim in whyOthersWrong entries

□ 6. Does this question duplicate an existing question?
     → Different wording testing the exact same concept is a duplicate
     → Same concept from a different angle is NOT a duplicate

□ 7. Is this question current?
     → No references to deprecated technologies as current
     → No outdated regulatory requirements

□ 8. Is the stem free of ambiguity?
     → Read it aloud. Is there exactly one interpretation?
     → If using "BEST" or "MOST", is the ranking clear?
```

### 7.3 High-Risk Topics (Extra Scrutiny Required)

These topics are frequently hallucinated by LLMs:

| Topic | Common LLM Error | Verification |
|-------|-------------------|-------------|
| NIST SP publication numbers | Invents plausible numbers | Check NIST.gov |
| ISO standard numbers | Confuses 27001/27002/27005/27017/27018 | Check ISO catalog |
| Encryption key lengths | Wrong key sizes for algorithms | Verify against NIST SP 800-175B |
| GDPR article numbers | Invents articles or misattributes | Check official GDPR text |
| ISC2 domain names | Uses outdated domain structure | Check latest ISC2 exam outline |
| Incident response order | Scrambles steps | Verify against NIST SP 800-61 |
| Risk formula components | Mixes qualitative/quantitative | Verify against ISC2 CBK |
| Cloud responsibility models | Wrong provider/customer splits | Check CSA guidance |

---

## 8. Tagging Standard

### 8.1 Required Tags

Every question MUST have at minimum:

| Tag Category | Format | Examples |
|-------------|--------|---------|
| Exam objective | `obj:{objective-id}` | `obj:1.1`, `obj:3.4.2` |
| Topic | lowercase, hyphenated | `encryption`, `access-control`, `risk-assessment` |

### 8.2 Recommended Tags

| Tag Category | Format | Examples |
|-------------|--------|---------|
| Framework reference | `ref:{framework}` | `ref:nist-800-53`, `ref:iso-27001`, `ref:gdpr` |
| Question type | `type:{type}` | `type:scenario`, `type:definition`, `type:best-answer`, `type:process-order` |
| Cognitive level | `bloom:{level}` | `bloom:remember`, `bloom:apply`, `bloom:evaluate` |

### 8.3 Tag Governance

- Tags are lowercase, alphanumeric + hyphens only
- No spaces in tags
- Max 10 tags per question
- Maintain a canonical tag list per certification (stored in marketplace study metadata)
- Reject questions with zero tags

---

## 9. Red Lines — Automatic Rejection Criteria

A question is **immediately rejected** if it has any of:

| Violation | Category |
|-----------|----------|
| Factually incorrect answer marked as correct | **Accuracy** |
| Two or more options that a certified expert would consider equally valid | **Ambiguity** |
| `explanation.short` shorter than 2 sentences | **Depth** |
| Missing `whyOthersWrong` for any incorrect option | **Completeness** |
| Copy-pasted from a known question bank (Boson, Official ISC2, Sybex, etc.) | **Plagiarism** |
| References a non-existent standard, framework, or regulation | **Factual** |
| Contains vendor-specific technology as the correct answer | **Neutrality** |
| "All of the above" or "None of the above" as an option | **Format** |
| Offensive, biased, or culturally insensitive content | **Ethics** |
| Stem that can be answered without reading the options | **Construction** |
| Correct option is always the longest | **Pattern** |

---

## 10. Quality Score Rubric (For Reviewer Use)

Rate each question 1–5 on each dimension. Minimum passing score: **3.5 average**.

| Dimension | 1 (Reject) | 3 (Acceptable) | 5 (Excellent) |
|-----------|-----------|-----------------|---------------|
| **Accuracy** | Wrong answer or claims | Correct but imprecise | Correct, precise, cites sources |
| **Difficulty fit** | Mislabeled by 2+ levels | Roughly appropriate | Perfectly calibrated with clear bloom's level |
| **Distractor quality** | Implausible or giveaway | Plausible but formulaic | Realistic, tests specific misconceptions |
| **Explanation quality** | "The answer is X" | Explains why X, minimal distractor reasoning | Per-option reasoning with references |
| **Stem clarity** | Ambiguous, multi-question | Clear but could be tighter | Unambiguous, well-scoped, single cognitive task |
| **Originality** | Near-duplicate of existing Q | Standard angle | Novel scenario or unique testing angle |

Questions scoring <3.0 on any single dimension: **reject**.
Questions scoring 3.0–3.4 average: **revise and re-review**.
Questions scoring 3.5+: **publish**.

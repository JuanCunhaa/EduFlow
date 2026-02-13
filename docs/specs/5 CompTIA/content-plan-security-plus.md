# Content Plan — CompTIA Security+ SY0-701

> Status: DRAFT
> Date: 2026-02-12
> Role: Product Lead — Content Strategy
> Exam: CompTIA Security+ SY0-701
> Dependency: `comptia-security-plus-launch.md`, `certification-model-extensions.md`

---

## 1. Content Pillars

| Pillar | What | Volume |
|--------|------|--------|
| Question bank | Practice questions with explanations | 150 → 300 → 500+ |
| SEO pages | Cert hub, domain pages, practice page, study plans | 12-15 pages |
| Blog content | Study guides, tips, comparisons | 5-8 posts |
| Lead magnets | Free quiz page, downloadable study plan | 2 assets |

---

## 2. Question Bank Strategy

### 2.1 Minimum Viable Question Count

| Milestone | Questions | Coverage | When |
|-----------|----------|----------|------|
| **MVP Launch** | 150 | 30 per domain; all objectives touched | Week 1-2 |
| **Credible** | 300 | 60 per domain; decent depth | Week 4-6 |
| **Competitive** | 500 | 100 per domain; full objective coverage | Week 8-12 |
| **Market leader** | 800+ | Deep coverage, multiple difficulty angles | Month 4-6 |

**Why 150 is the MVP:** Users can take at least 1-2 full-length practice exams (90 Qs each) without heavy repeats. The adaptive engine's value shows even at 150 Qs.

### 2.2 Question Distribution by Domain

Based on SY0-701 exam weights:

| Domain | Weight | 150 Qs | 300 Qs | 500 Qs |
|--------|--------|--------|--------|--------|
| 1.0 General Security Concepts (12%) | 12% | 18 | 36 | 60 |
| 2.0 Threats, Vulns & Mitigations (22%) | 22% | 33 | 66 | 110 |
| 3.0 Security Architecture (18%) | 18% | 27 | 54 | 90 |
| 4.0 Security Operations (28%) | 28% | 42 | 84 | 140 |
| 5.0 Security Program Mgmt (20%) | 20% | 30 | 60 | 100 |

### 2.3 Difficulty Distribution

| Difficulty | % of Bank | Description |
|-----------|-----------|-------------|
| Easy | 25% | Definition recall, basic concept identification |
| Medium | 50% | Scenario application, "best" answer selection |
| Hard | 25% | Multi-concept scenarios, subtle distinctions |

### 2.4 Question Quality Standard

Every question must meet the bar defined in `docs/specs/learn/question-quality-standard.md`:

| Criterion | Requirement |
|-----------|-------------|
| Stem | Clear, scenario-based where possible, no negatives ("NOT") unless necessary |
| Options | 4 plausible options, no "all of the above" |
| Correct answer | Unambiguously correct based on CompTIA objectives |
| Explanation `.short` | 2-3 sentences explaining why correct answer is correct |
| Explanation `.whyOthersWrong` | 1-2 sentences per wrong option |
| Tags | Domain tag + objective code + 2-3 concept tags |
| Difficulty | Accurately rated by author, verified on review |

### 2.5 Question Format Examples

**Easy — Definition recall:**
```
Q: Which security control type is implemented through organizational 
   policies and procedures?
A) Technical control
B) Administrative control ← correct
C) Physical control
D) Compensating control

Explanation:
short: "Administrative controls are implemented through policies, 
procedures, and guidelines. Technical controls use technology, and 
physical controls protect physical assets."
whyOthersWrong:
  A: "Technical controls are implemented through technology such as 
     firewalls and encryption."
  C: "Physical controls protect physical assets like locks and fences."
  D: "Compensating controls are alternatives used when primary controls 
     aren't feasible."

tags: ["obj:1.1", "security-controls", "administrative-controls"]
difficulty: "easy"
domainIds: ["d1"]
```

**Medium — Scenario application:**
```
Q: A security analyst discovers that an employee's credentials were 
   used to access a file server at 3:00 AM from an overseas IP address. 
   The employee was confirmed to be at home sleeping. What is the MOST 
   likely attack that occurred?
A) Brute force attack
B) Credential stuffing ← correct
C) Password spraying
D) On-path attack

Explanation:
short: "Credential stuffing uses previously breached credentials to 
authenticate. The attacker likely obtained the employee's credentials 
from a data breach on another service where the employee reused their 
password."
...

tags: ["obj:2.2", "credential-stuffing", "identity-attacks", "credential-reuse"]
difficulty: "medium"
domainIds: ["d2"]
```

**Hard — Multi-concept scenario:**
```
Q: An organization wants to implement zero trust architecture. Which 
   combination of controls BEST supports this approach?
A) VPN, firewall, and antivirus
B) Micro-segmentation, MFA, and continuous validation ← correct
C) IDS, SIEM, and log aggregation
D) DLP, encryption, and access control lists

Explanation:
short: "Zero trust requires micro-segmentation to isolate resources, 
MFA to verify identity, and continuous validation to never implicitly 
trust. VPN implies a trusted network perimeter, which contradicts 
zero-trust principles."
...

tags: ["obj:3.3", "zero-trust", "micro-segmentation", "mfa", "continuous-validation"]
difficulty: "hard"
domainIds: ["d3"]
```

---

## 3. Question Sourcing Approach

### 3.1 Sourcing Methods (Ranked by Quality)

| Method | Quality | Speed | Cost | Volume |
|--------|---------|-------|------|--------|
| **1. Original authoring by founder** | Highest | Slow (3-5 Qs/hr) | $0 | 30-50 Qs/week |
| **2. AI-assisted drafting + human review** | High | Fast (10-15 Qs/hr) | $0 | 100-150 Qs/week |
| **3. Community contribution (marketplace)** | Variable | Passive | $0 | Unpredictable |
| **4. Contracted question writers** | High | Fast | $2-5/Q | Scalable |
| **5. Public domain / open source** | Low | Instant | $0 | Variable quality |

### 3.2 Recommended Approach: AI-Assisted + Founder Review

**Phase 1 (150 Qs — Week 1-2):**
1. Use Claude/GPT to generate draft questions from SY0-701 objectives
2. Provide the exact objective text as prompt context
3. Request output in ExamFlow's JSON format
4. **Founder reviews every question** for:
   - Factual accuracy against CompTIA objectives
   - Answer correctness (verify with official study materials)
   - Explanation quality
   - Difficulty appropriateness
   - Plausible distractors
5. Reject or rewrite ~20-30% of AI drafts (typical rejection rate)
6. Import via marketplace bulk import (`MarketplaceBulkImportDialog`)

**Phase 2 (150 → 300 Qs — Week 3-6):**
- Continue AI-assisted pipeline
- Fill coverage gaps: check which objectives have <5 questions
- Add more scenario-based "hard" questions (AI tends to under-generate these)

**Phase 3 (300 → 500 Qs — Week 7-12):**
- Targeted authoring for weak areas
- Add questions based on user feedback (reported issues, requested topics)
- Consider community submissions through marketplace

### 3.3 AI Prompt Template

```
You are a CompTIA Security+ SY0-701 exam question writer. 

Generate 5 practice questions for objective {OBJECTIVE_CODE}: 
"{OBJECTIVE_TEXT}"

Requirements:
- Each question must have 4 options (A-D)
- Exactly one correct answer
- Scenario-based stems preferred over pure definition recall
- Include plausible distractors that test common misconceptions
- Difficulty: generate 1 easy, 3 medium, 1 hard

Output JSON format:
{
  "questions": [
    {
      "text": "...",
      "options": [
        { "label": "A", "text": "..." },
        { "label": "B", "text": "..." },
        { "label": "C", "text": "..." },
        { "label": "D", "text": "..." }
      ],
      "correctOptionIndex": 0,
      "explanation": {
        "short": "...",
        "whyOthersWrong": { "B": "...", "C": "...", "D": "..." }
      },
      "difficulty": "medium",
      "tags": ["obj:{code}", "topic-tag-1", "topic-tag-2"],
      "domainIds": ["d{N}"]
    }
  ]
}
```

### 3.4 Quality Gate: Review Checklist

Every question batch must pass before import:

- [ ] Correct answer is unambiguously correct per CompTIA objectives
- [ ] No questions copied from commercial question banks
- [ ] No CompTIA CertMaster questions reproduced
- [ ] All explanations are factually accurate
- [ ] Difficulty rating is appropriate
- [ ] Tags include objective code
- [ ] Domain ID is correct
- [ ] No duplicate or near-duplicate questions in existing bank
- [ ] Grammar and spelling reviewed

### 3.5 Content IP & Legal

| Rule | Reasoning |
|------|-----------|
| Never reproduce CompTIA exam questions | Copyright violation, ethical breach |
| Never copy questions from paid question banks | Copyright violation |
| Use CompTIA objectives as topic guides, not as question stems | Fair use of publicly available exam objectives |
| Original authoring or AI-generated originals only | Clean IP |
| Avoid "dump site" association | ExamFlow must be perceived as a learning tool, not a brain dump |
| Cite "CompTIA Security+ SY0-701" exam objectives as source for topic coverage | Attribution |

---

## 4. Objective Coverage Matrix

### 4.1 SY0-701 Full Objective List

Track question coverage against every objective:

**Domain 1 — General Security Concepts (12%)**

| Objective | Description | 150Q Target | Status |
|-----------|-------------|-------------|--------|
| 1.1 | Compare and contrast various types of security controls | 4 | ☐ |
| 1.2 | Summarize fundamental security concepts | 5 | ☐ |
| 1.3 | Explain the importance of change management processes | 3 | ☐ |
| 1.4 | Explain the importance of using appropriate cryptographic solutions | 6 | ☐ |

**Domain 2 — Threats, Vulnerabilities, and Mitigations (22%)**

| Objective | Description | 150Q Target | Status |
|-----------|-------------|-------------|--------|
| 2.1 | Compare and contrast common threat actors and motivations | 5 | ☐ |
| 2.2 | Explain common threat vectors and attack surfaces | 6 | ☐ |
| 2.3 | Explain various types of vulnerabilities | 5 | ☐ |
| 2.4 | Given a scenario, analyze indicators of malicious activity | 7 | ☐ |
| 2.5 | Explain the purpose of mitigation techniques | 5 | ☐ |
| 2.6 | Given a scenario, apply common security techniques to computing resources | 5 | ☐ |

**Domain 3 — Security Architecture (18%)**

| Objective | Description | 150Q Target | Status |
|-----------|-------------|-------------|--------|
| 3.1 | Compare and contrast security implications of different architecture models | 5 | ☐ |
| 3.2 | Given a scenario, apply security principles to secure enterprise infrastructure | 6 | ☐ |
| 3.3 | Compare and contrast concepts and strategies to protect data | 5 | ☐ |
| 3.4 | Explain the importance of resilience and recovery in security architecture | 5 | ☐ |
| 3.5 | Given a scenario, apply common security techniques | 6 | ☐ |

**Domain 4 — Security Operations (28%)**

| Objective | Description | 150Q Target | Status |
|-----------|-------------|-------------|--------|
| 4.1 | Given a scenario, apply common security techniques to computing resources | 6 | ☐ |
| 4.2 | Explain the security implications of proper hardware, software, and data asset management | 5 | ☐ |
| 4.3 | Explain various activities associated with vulnerability management | 6 | ☐ |
| 4.4 | Explain security alerting and monitoring concepts and tools | 6 | ☐ |
| 4.5 | Given a scenario, modify enterprise capabilities to enhance security | 6 | ☐ |
| 4.6 | Given a scenario, implement and maintain identity and access management | 7 | ☐ |
| 4.7 | Explain the importance of automation and orchestration related to secure operations | 3 | ☐ |
| 4.8 | Explain appropriate incident response activities | 3 | ☐ |

**Domain 5 — Security Program Management and Oversight (20%)**

| Objective | Description | 150Q Target | Status |
|-----------|-------------|-------------|--------|
| 5.1 | Summarize elements of effective security governance | 6 | ☐ |
| 5.2 | Explain elements of the risk management process | 6 | ☐ |
| 5.3 | Explain the processes associated with third-party risk assessment and management | 5 | ☐ |
| 5.4 | Summarize elements of effective security compliance | 5 | ☐ |
| 5.5 | Explain types and purposes of audits and assessments | 4 | ☐ |
| 5.6 | Given a scenario, implement security awareness practices | 4 | ☐ |

**Total: 28 objectives, 150 questions**

---

## 5. Content Production Timeline

### 5.1 Question Bank Timeline

| Week | Deliverable | Questions | Cumulative |
|------|-------------|-----------|------------|
| 1 | Domain 1 + Domain 2 (partial) | 51 | 51 |
| 2 | Domain 2 (remaining) + Domain 3 + Domain 4 (partial) | 49 | 100 |
| 3 | Domain 4 (remaining) + Domain 5 | 50 | 150 ✅ MVP |
| 4-5 | Coverage gaps + difficulty balancing | 50 | 200 |
| 6-7 | Second pass: harder scenarios, edge cases | 50 | 250 |
| 8-9 | Objective-level coverage gaps | 50 | 300 ✅ Credible |
| 10-12 | Community review + expansion | 100-200 | 400-500 ✅ Competitive |

### 5.2 SEO Content Timeline

| Week | Content | Pages |
|------|---------|-------|
| 1 | Cert hub: `/en/security-plus/` | 1 |
| 1 | 5 domain deep-dive pages | 5 |
| 2 | Practice questions lead-magnet page | 1 |
| 2 | Study plan guide page | 1 |
| 3 | Blog: "How to Pass Security+ SY0-701" | 1 |
| 3 | Blog: "Security+ Study Plan (60 Days)" | 1 |
| 4 | Blog: "Security+ vs CISSP: Which First?" | 1 |
| 4 | Comparison: "Best Security+ Practice Exams 2025" | 1 |
| 6 | Blog: "Security+ SY0-701 CAT Tips" | 1 |
| 8 | PT-BR: Cert hub + practice page | 2 |

### 5.3 Daily Content Production Schedule

For the first 3 weeks (question bank MVP):

```
Morning (2 hours): AI-generate 15-20 question drafts
Afternoon (1 hour): Review & edit ~10-12 questions (accept ~70%)
Evening (1 hour): Write 1 SEO page or blog section
Weekend: Batch import, QA, update objective coverage matrix
```

Sustainable pace: ~50 reviewed questions per week.

---

## 6. Content Refresh Strategy

### 6.1 SY0-701 → SY0-801 Transition Plan

CompTIA typically announces new versions 6-12 months in advance.

| Phase | Trigger | Action |
|-------|---------|--------|
| Awareness | CompTIA announces SY0-801 objectives | Diff objectives, identify gaps |
| Content creation | 6 months before SY0-801 goes live | Write new questions for changed objectives |
| Parallel support | SY0-801 launch day | Offer both versions as separate Studies |
| Migration | 6 months after SY0-801 launch | Archive SY0-701, default to SY0-801 |
| Sunset | 12 months after SY0-801 launch | Remove SY0-701 from active marketplace |

### 6.2 Ongoing Content Updates

| Cadence | Activity |
|---------|----------|
| Weekly | Review user-reported question issues |
| Monthly | Check 10 random questions for accuracy |
| Quarterly | Verify objective coverage matrix is complete |
| Per-version | Full question bank audit against new objectives |

---

## 7. Localization Plan

### 7.1 PT-BR Priority

| Content | Translate? | When |
|---------|-----------|------|
| Cert hub page | Yes | Week 8 |
| Practice questions page | Yes | Week 8 |
| Domain pages | Later (Month 4+) | Low priority |
| Blog posts | Top 2 only | Month 3 |
| Question bank | No | PT-BR Security+ exam is English globally |

**Note:** Unlike ISC2 certs which have localized exams, CompTIA Security+ is administered in English worldwide (with some exceptions for Japanese). PT-BR users still take the exam in English, so English question practice is more relevant. PT-BR SEO pages serve as discovery — the actual practice happens in English.

---

## 8. Competitive Content Differentiation

### 8.1 What Competitors Miss

| Gap | ExamFlow's Approach |
|-----|---------------------|
| No objective-level tracking | Tag every question with `obj:X.Y`, show per-objective mastery |
| Static difficulty | Adaptive engine serves harder questions as you master easier ones |
| No spaced repetition | Spaced review mode for long-term retention |
| Generic "you scored X%" | Domain-level + objective-level score breakdown |
| No cross-cert awareness | "You mastered Security+ Domain 2. CISSP Domain 7 is similar." |
| Practice exams are random | `weak_domains` and `domain_focus` modes target weak areas |

### 8.2 Content Moat Features

| Feature | How It Compounds |
|---------|-----------------|
| Objective coverage tracking | Gets better as bank grows; competitors can't copy your analytics |
| Question attempt history | Personalizes over time; users have switching costs |
| Cross-cert skill mapping | Unique to multi-cert platform; deepens as more certs added |
| User-reported quality fixes | Bank quality improves continuously from community feedback |

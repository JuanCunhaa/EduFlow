/**
 * Shared utilities for AI question generation and validation.
 * Single source of truth for prompts, validation, cert data, and exam styles.
 *
 * Features:
 *  - Certification-specific exam style prompts (EXAM_STYLE_MAP)
 *  - Few-shot examples per issuer for style anchoring
 *  - Adaptive temperature based on difficulty distribution
 *  - Bloom's Taxonomy classification (heuristic, no extra API call)
 *  - Domain coverage analysis and gap detection
 *  - Quality scoring prompt builder
 *  - Auto-retry prompt for failed validations
 *  - Multi-answer (multi-select / ordering) question support
 *  - Feedback loop: anti-pattern injection from reports
 *  - Production-grade validation (25+ checks)
 *  - Markdown stripping for all text fields
 */

// ── Types ──

export type BloomLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
export type QuestionType = 'single' | 'multi-select' | 'ordering';

export interface GeneratedQuestion {
    text: string;
    options: Array<{ label: string; text: string }>;
    correctOptionIndex: number;
    correctOptionIndices?: number[];         // for multi-select
    questionType?: QuestionType;             // defaults to 'single'
    explanation: { short: string; whyOthersWrong: Record<string, string>; examTip?: string };
    difficulty: string;
    domainIds: string[];
    tags: string[];
    bloomLevel?: BloomLevel;                 // auto-classified after generation
    qualityScore?: number;                   // 0-100, from AI quality scorer
}

export interface CertDomain {
    id: string;
    name: string;
    weight?: string;
    topics?: string[];
}

export interface CertInfo {
    slug: string;
    name: string;
    issuer: string;
    domains: CertDomain[];
}

export interface DomainCoverageItem {
    domainId: string;
    domainName: string;
    expectedPct: number;
    actualPct: number;
    actualCount: number;
    gap: number;   // positive = under-represented
}

export interface QualityScoreResult {
    index: number;
    score: number;
    feedback: string;
}

// ── Constants ──

const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);

const BIAS_TERMS = [
    'always', 'never', 'impossible', 'guaranteed', 'obviously', 'clearly', 'simply',
];

const FAKE_NIST_NUMBERS = [
    '800-12', '800-14', '800-16', '800-18', '800-22', '800-24', '800-26',
    '800-29', '800-31', '800-33', '800-91', '800-95', '800-99', '800-101',
    '800-102', '800-150', '800-175A',
];

export const LANG_NAMES: Record<string, string> = {
    en: 'English',
    'pt-BR': 'Brazilian Portuguese (Português Brasileiro)',
    es: 'Spanish (Español)',
    fr: 'French (Français)',
    de: 'German (Deutsch)',
};

const SECURITY_ISSUERS = ['ISC2', 'CompTIA', 'ISACA', 'EC-Council', 'SANS', 'AWS', 'Amazon Web Services', 'Microsoft', 'Google', 'Cisco'];

// ── Exam Style Map ──

export const EXAM_STYLE_MAP: Record<string, string> = {
    'ISC2': `EXAM STYLE — ISC2 CBK (CRITICAL):
- Questions test MANAGEMENT JUDGMENT and RISK-BASED THINKING, not raw technical recall
- Stems MUST be scenario-based (3-8 sentences describing a real-world security situation)
- Ask "What should the security professional do FIRST?" or "What is the BEST course of action?"
- ALL four options must be partially correct — the BEST answer aligns with ISC2's governance/risk perspective
- Focus on "why" over "how" — governance, policy, due diligence, defense-in-depth`,

    'CompTIA': `EXAM STYLE — CompTIA Performance-Based (CRITICAL):
- Mix of direct knowledge questions and applied scenario questions
- Some questions present a troubleshooting scenario: "A user reports that..."
- Options list specific tools, commands, protocols, or actions
- Easy: 1-2 sentence direct recall. Medium/Hard: 3-5 sentence scenario
- Use real tool names, port numbers, protocol names — be technically precise`,

    'Amazon Web Services': `EXAM STYLE — AWS Scenario-Based (CRITICAL):
- EVERY question must be a real-world cloud architecture scenario
- Stem: "A company has [specific requirement]... Which combination of AWS services meets these requirements?"
- Options list SPECIFIC AWS services and configurations
- Correct answer optimizes for the stated priority (cost, resilience, performance, or security)
- Use real service names: EC2, S3, RDS, Lambda, CloudFront, Route 53, VPC, IAM`,

    'Microsoft': `EXAM STYLE — Microsoft Role-Based (CRITICAL):
- Scenario-driven: "Your organization needs to..." or "You are configuring..."
- Options reference specific Azure services, PowerShell cmdlets, CLI commands
- Use real Azure service names: Entra ID, Azure Policy, RBAC, NSG, App Service
- For fundamentals (900-level): mix of concept and identification questions`,

    'Google Cloud': `EXAM STYLE — Google Cloud (CRITICAL):
- Scenario-based: "Your team needs to deploy a microservices application that..."
- Options reference specific GCP services: Compute Engine, GKE, Cloud Run, BigQuery, Cloud SQL
- Correct answer follows Google's recommended best practices`,

    'ISACA': `EXAM STYLE — ISACA Governance & Audit (CRITICAL):
- Questions test GOVERNANCE and AUDIT JUDGMENT from a management/auditor perspective
- Stems describe audit findings, governance scenarios, or risk situations
- Ask "What should the auditor recommend?" or "What is the MOST important consideration?"
- Use COBIT, ITIL, and ISO frameworks as reference points`,

    'EC-Council': `EXAM STYLE — EC-Council Hands-On (CRITICAL):
- Questions test PRACTICAL HACKING/SECURITY knowledge
- Include specific tools: Nmap, Wireshark, Metasploit, Burp Suite, John the Ripper
- Stems describe attack scenarios, vulnerability findings, or forensic investigations
- Reference OWASP, MITRE ATT&CK, CVE identifiers when appropriate`,

    'PMI': `EXAM STYLE — PMI Situational Judgment (CRITICAL):
- ALL questions are situational: "You are a project manager and discover that..."
- Ask "What should you do FIRST?" or "What is the BEST approach?"
- Options are PM actions (not technical solutions)
- Mix predictive (waterfall) and adaptive (agile) per PMI's hybrid stance`,

    'Linux Foundation / CNCF': `EXAM STYLE — Kubernetes/DevOps Hands-On (CRITICAL):
- Questions test practical cluster administration and application deployment
- Include specific kubectl commands, YAML manifest snippets, and configuration details
- Stems describe cluster issues, deployment requirements, or troubleshooting scenarios`,

    'HashiCorp': `EXAM STYLE — HashiCorp IaC (CRITICAL):
- Questions test Terraform/Vault/Consul practical knowledge
- Include HCL code snippets, CLI commands, and configuration patterns
- Stems describe infrastructure provisioning scenarios`,

    'Scrum.org': `EXAM STYLE — Scrum Framework (CRITICAL):
- Questions test understanding of Scrum Guide (2020 edition)
- Scenarios involve Sprint events, roles, and artifacts
- Correct answers align strictly with the Scrum Guide — not "real world" deviations`,

    'INEP': `ESTILO — ENEM (CRÍTICO):
- TODA questão DEVE ter um TEXTO-BASE (3-8 linhas: trecho literário, notícia, gráfico, cenário)
- A pergunta pede interpretação, análise ou aplicação do texto-base
- Linguagem formal porém acessível, compatível com Ensino Médio`,

    'Conselho Federal da OAB': `ESTILO — OAB (CRÍTICO):
- Cada questão apresenta uma SITUAÇÃO-PROBLEMA jurídica (3-6 linhas)
- A pergunta pede a solução juridicamente correta conforme a legislação vigente
- Referência obrigatória: CF/88, Código Civil, Código Penal, CPC, CPP, CLT, Estatuto da OAB`,

    'Diversas Instituições BR': `ESTILO — Residência Médica (CRÍTICO):
- Cada questão apresenta um CASO CLÍNICO (5-10 linhas: idade, sexo, queixa, exame físico, labs)
- A pergunta pede diagnóstico, conduta, ou próximo passo
- Usar terminologia médica precisa (CID, protocolos do MS, diretrizes SUS)`,

    'PECB / BSI': `EXAM STYLE — ISO Auditing (CRITICAL):
- Stems describe audit scenarios, nonconformities, or management review situations
- Answers reference specific ISO 27001/27002 clauses and controls`,

    'BCS / IAPP': `EXAM STYLE — Data Protection (CRITICAL):
- Questions test GDPR articles, data subject rights, controller/processor obligations
- Stems describe data processing scenarios`,

    'HHS / AHIMA': `EXAM STYLE — HIPAA Compliance (CRITICAL):
- Questions present healthcare data scenarios involving PHI
- Options reference specific HIPAA rules (Privacy, Security, Breach Notification)`,
};

// ── Few-Shot Examples (1 gold-standard per issuer) ──

const FEW_SHOT_EXAMPLES: Record<string, string> = {
    'ISC2': `EXAMPLE (follow this exact style):
{
  "text": "A multinational corporation recently suffered a data breach affecting customer records stored across three geographic regions. The CISO discovers that the incident was caused by an unpatched vulnerability in a third-party vendor's software. The vendor's contract does not include specific patching SLAs. The board is requesting an immediate response plan. As the lead security architect, what should be the FIRST course of action?",
  "options": [
    {"label": "A", "text": "Immediately terminate the vendor contract and migrate to an alternative solution to prevent future breaches"},
    {"label": "B", "text": "Conduct a risk assessment of all third-party vendors and establish contractual security requirements including patching SLAs"},
    {"label": "C", "text": "Deploy an IDS/IPS to monitor the vendor's network traffic for additional indicators of compromise"},
    {"label": "D", "text": "Engage the incident response team to contain the breach while initiating a review of the vendor management program"}
  ],
  "correctOptionIndex": 3,
  "explanation": {
    "short": "The immediate priority is containment and damage control, followed by a systematic review. According to NIST SP 800-61, incident response begins with containment to limit the impact before addressing root causes. Simultaneously reviewing the vendor management program addresses the systemic gap that allowed the breach.",
    "whyOthersWrong": {
      "A": "Terminating the contract immediately is reactionary and could disrupt operations. Due diligence requires a measured approach rather than an impulsive response.",
      "B": "While important long-term, conducting a full vendor risk assessment is not the first action during an active breach. Containment takes priority over program improvements.",
      "C": "Monitoring the vendor's network may not be legally permissible without contractual authorization, and it does not address the immediate containment need."
    },
    "examTip": "ISC2 always prioritizes containment FIRST in incident scenarios, then moves to root cause analysis and program improvement. Think 'stop the bleeding, then fix the process.'"
  },
  "difficulty": "hard",
  "domainIds": ["sam"],
  "tags": ["incident-response", "vendor-management", "risk-assessment"]
}`,

    'CompTIA': `EXAMPLE (follow this exact style):
{
  "text": "A network administrator receives reports that several users on VLAN 10 cannot access the company's internal web application hosted on VLAN 20. Users on VLAN 20 can access the application without issues. The firewall logs show no blocked traffic between the VLANs. Which of the following should the administrator check FIRST?",
  "options": [
    {"label": "A", "text": "The inter-VLAN routing configuration on the Layer 3 switch"},
    {"label": "B", "text": "The DNS server settings on the VLAN 10 client machines"},
    {"label": "C", "text": "The web application server's host-based firewall rules"},
    {"label": "D", "text": "The trunk port configuration between the access and distribution switches"}
  ],
  "correctOptionIndex": 0,
  "explanation": {
    "short": "Since users on one VLAN cannot reach resources on another VLAN, the most likely cause is an inter-VLAN routing issue. Layer 3 switches handle routing between VLANs, and a misconfiguration there would prevent cross-VLAN traffic while allowing intra-VLAN communication.",
    "whyOthersWrong": {
      "B": "DNS issues would typically cause name resolution failures across all VLANs, not just VLAN 10. Users might see 'host not found' errors rather than connectivity failures.",
      "C": "The host-based firewall would block traffic from all sources, not just one VLAN. Since VLAN 20 users can access the application, the server firewall is not the issue.",
      "D": "Trunk port misconfiguration would typically cause the entire VLAN to be unreachable, not just cross-VLAN traffic. If the trunk were down, VLAN 10 users would lose all connectivity."
    },
    "examTip": "When troubleshooting cross-VLAN issues: if intra-VLAN works but inter-VLAN fails, always check Layer 3 routing first. Remember the OSI model — work from Layer 3 (routing) before checking Layer 7 (application)."
  },
  "difficulty": "medium",
  "domainIds": ["nt"],
  "tags": ["vlan", "inter-vlan-routing", "troubleshooting"]
}`,

    'Amazon Web Services': `EXAMPLE (follow this exact style):
{
  "text": "A company is migrating a legacy three-tier web application to AWS. The application serves 50,000 daily active users and requires sub-10ms latency for database reads. The database is currently a 2TB PostgreSQL instance with heavy read traffic (80% reads, 20% writes). The company wants to minimize operational overhead while maintaining high availability across two Availability Zones. Which architecture best meets these requirements?",
  "options": [
    {"label": "A", "text": "Deploy the application on EC2 instances behind an ALB, use Amazon RDS for PostgreSQL with Multi-AZ and a read replica, and add ElastiCache for Redis to handle frequent reads"},
    {"label": "B", "text": "Use AWS Lambda with API Gateway for the application tier, Amazon Aurora PostgreSQL with Global Database, and DynamoDB DAX for caching"},
    {"label": "C", "text": "Deploy on ECS Fargate behind an ALB, use Amazon Aurora PostgreSQL with Multi-AZ and up to 15 read replicas, and add ElastiCache for Redis for sub-millisecond reads"},
    {"label": "D", "text": "Use Elastic Beanstalk for the application tier, Amazon RDS for PostgreSQL with Multi-AZ deployment, and CloudFront for caching database responses"}
  ],
  "correctOptionIndex": 2,
  "explanation": {
    "short": "ECS Fargate eliminates EC2 management overhead while providing containerized deployment. Aurora PostgreSQL offers up to 15 read replicas with sub-10ms replication lag, and Multi-AZ provides high availability. ElastiCache Redis delivers sub-millisecond read latency, exceeding the 10ms requirement for cached queries.",
    "whyOthersWrong": {
      "A": "This architecture works but EC2 instances add operational overhead for patching and scaling. Standard RDS supports only 5 read replicas compared to Aurora's 15, limiting read scalability.",
      "B": "Lambda with API Gateway may not suit a legacy three-tier application without significant refactoring. DynamoDB DAX is designed for DynamoDB, not PostgreSQL. Aurora Global Database is for multi-region, which exceeds the two-AZ requirement.",
      "D": "CloudFront caches static content and HTTP responses, not database queries directly. This does not address the sub-10ms database read latency requirement."
    },
    "examTip": "For read-heavy PostgreSQL workloads on AWS: Aurora PostgreSQL + ElastiCache Redis is the go-to combination. Aurora handles relational reads with up to 15 replicas, while ElastiCache provides sub-millisecond caching for frequently accessed data."
  },
  "difficulty": "hard",
  "domainIds": ["hpa"],
  "tags": ["aurora", "elasticache", "ecs-fargate", "migration"]
}`,

    'PMI': `EXAMPLE (follow this exact style):
{
  "text": "You are managing a software development project using an agile approach. During Sprint Review, a key stakeholder expresses dissatisfaction with the product increment, stating that it does not align with their expectations despite the team delivering all planned user stories. The Product Owner confirms that all acceptance criteria were met. What should you do FIRST?",
  "options": [
    {"label": "A", "text": "Schedule a meeting between the stakeholder and the Product Owner to review and refine the product backlog priorities"},
    {"label": "B", "text": "Add the stakeholder's feedback as new user stories in the next Sprint backlog"},
    {"label": "C", "text": "Facilitate a discussion during the Sprint Review to understand the gap between expectations and the delivered increment"},
    {"label": "D", "text": "Escalate the issue to the project sponsor and request a scope change through the change control process"}
  ],
  "correctOptionIndex": 2,
  "explanation": {
    "short": "The Sprint Review is specifically designed for inspecting the increment and adapting the Product Backlog based on feedback. Per the Scrum Guide and PMBOK Guide 7th Edition, the first step is to understand the root cause of the misalignment by facilitating dialogue during the current ceremony before taking action.",
    "whyOthersWrong": {
      "A": "While refining the backlog may be needed later, scheduling a separate meeting bypasses the current Sprint Review, which is the appropriate forum for this conversation.",
      "B": "Adding stories directly assumes the feedback is valid and actionable without first understanding the root cause of the disconnect. This skips the inspection step.",
      "D": "Escalation and formal change control are typical of predictive approaches. In agile, stakeholder feedback is handled through Sprint events, not escalation processes."
    },
    "examTip": "PMI expects you to facilitate understanding FIRST, then act. In agile contexts, always use the existing ceremonies (Sprint Review, Retrospective) before creating new meetings or processes."
  },
  "difficulty": "medium",
  "domainIds": ["pe"],
  "tags": ["sprint-review", "stakeholder-management", "agile"]
}`,

    'ISACA': `EXAMPLE (follow this exact style):
{
  "text": "During an IS audit of a financial institution, the auditor discovers that the organization's disaster recovery plan (DRP) was last tested 18 months ago, and the test results showed a recovery time that exceeded the documented RTO by 40%. Management acknowledged the findings but has not taken corrective action. What is the MOST important recommendation the auditor should make?",
  "options": [
    {"label": "A", "text": "Recommend immediate retesting of the DRP with updated procedures to meet the documented RTO"},
    {"label": "B", "text": "Recommend that management reassess the business impact analysis and adjust the RTO to reflect actual recovery capabilities"},
    {"label": "C", "text": "Recommend implementing automated failover mechanisms to reduce the recovery time below the documented RTO"},
    {"label": "D", "text": "Recommend escalating the finding to the board of directors as a critical risk requiring immediate remediation"}
  ],
  "correctOptionIndex": 0,
  "explanation": {
    "short": "The most important action is to retest the DRP with corrected procedures to validate that the organization can meet its RTO. Per ISACA's CISA Review Manual, the DRP should be tested at least annually, and any gaps between actual recovery time and RTO must be addressed through procedural improvements and retesting.",
    "whyOthersWrong": {
      "B": "Adjusting the RTO to match poor performance lowers the standard rather than fixing the problem. The RTO should be driven by business requirements, not by current capability gaps.",
      "C": "While automation may help, recommending specific technical solutions goes beyond the auditor's role. The auditor should recommend outcomes, not prescribe implementation methods.",
      "D": "Board escalation may be warranted if management refuses to act, but the first recommendation should be the corrective action itself, not escalation."
    },
    "examTip": "ISACA auditors recommend corrective actions first, escalate only if management is unresponsive. Always ensure recommendations are based on standards (ISO 22301, NIST SP 800-34) and focus on testing and validation."
  },
  "difficulty": "hard",
  "domainIds": ["iso"],
  "tags": ["disaster-recovery", "drp-testing", "rto", "audit-finding"]
}`,
};

// ── Bloom's Taxonomy Classifier (heuristic, no API call) ──

const BLOOM_KEYWORDS: Record<BloomLevel, RegExp[]> = {
    remember: [
        /\bwhat is\b/i, /\bdefine\b/i, /\bwhich of the following is\b/i,
        /\bidentify\b/i, /\bname the\b/i, /\blist\b/i, /\brecall\b/i,
    ],
    understand: [
        /\bexplain\b/i, /\bdescribe\b/i, /\bsummarize\b/i, /\bwhy does\b/i,
        /\bwhat is the purpose\b/i, /\bwhat is the primary\b/i, /\bwhat is the main\b/i,
    ],
    apply: [
        /\bgiven this scenario\b/i, /\ba user reports\b/i, /\byou are asked to\b/i,
        /\bwhich command\b/i, /\bwhich tool\b/i, /\bhow would you\b/i, /\bimplement\b/i,
    ],
    analyze: [
        /\bwhat is the most likely\b/i, /\bwhat could cause\b/i, /\btroubleshoot\b/i,
        /\bdiagnose\b/i, /\bcompare\b/i, /\bdifferentiate\b/i, /\broot cause\b/i,
        /\binvestigat/i, /\banalyze\b/i,
    ],
    evaluate: [
        /\bwhat is the best\b/i, /\bwhich is the most\b/i, /\bfirst\b/i, /\bprioritize\b/i,
        /\bmost appropriate\b/i, /\bbest course of action\b/i, /\bmost effective\b/i,
        /\bshould .+ do first\b/i, /\bwhat should\b/i, /\brecommend\b/i,
    ],
    create: [
        /\bdesign\b/i, /\bpropose\b/i, /\bconstruct\b/i, /\bdevelop a plan\b/i,
        /\barchitect\b/i, /\bformulate\b/i,
    ],
};

/** Expected minimum Bloom level per issuer. Questions below this trigger a warning. */
export const BLOOM_EXPECTATIONS: Record<string, BloomLevel> = {
    'ISC2': 'evaluate',
    'CompTIA': 'apply',
    'Amazon Web Services': 'apply',
    'Microsoft': 'apply',
    'Google Cloud': 'apply',
    'ISACA': 'evaluate',
    'EC-Council': 'apply',
    'PMI': 'evaluate',
    'INEP': 'analyze',
    'Conselho Federal da OAB': 'apply',
    'Diversas Instituições BR': 'analyze',
};

const BLOOM_ORDER: BloomLevel[] = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];

export function classifyBloomLevel(q: GeneratedQuestion): BloomLevel {
    const text = q.text.toLowerCase();
    // Check from highest to lowest — return the highest match
    for (let i = BLOOM_ORDER.length - 1; i >= 0; i--) {
        const level = BLOOM_ORDER[i];
        if (BLOOM_KEYWORDS[level].some((re) => re.test(text))) {
            return level;
        }
    }
    // Heuristic: long stems with scenarios are at least 'apply'
    if (text.length > 200) return 'apply';
    if (text.length > 100) return 'understand';
    return 'remember';
}

export function isBloomBelowExpected(level: BloomLevel, issuer: string): boolean {
    const expected = BLOOM_EXPECTATIONS[issuer];
    if (!expected) return false;
    return BLOOM_ORDER.indexOf(level) < BLOOM_ORDER.indexOf(expected);
}

// ── Domain Coverage Analysis ──

export function analyzeDomainCoverage(questions: GeneratedQuestion[], domains: CertDomain[]): DomainCoverageItem[] {
    const total = questions.length;
    if (total === 0) return [];

    // Parse weight percentages
    const domainWeights = domains.map((d) => {
        const pct = parseFloat(d.weight?.replace('%', '') ?? '0') || (100 / domains.length);
        return { id: d.id, name: d.name, expectedPct: pct };
    });

    // Count actual distribution
    const counts: Record<string, number> = {};
    for (const q of questions) {
        for (const did of q.domainIds) {
            counts[did] = (counts[did] || 0) + 1;
        }
    }

    return domainWeights.map((d) => {
        const actual = counts[d.id] || 0;
        const actualPct = (actual / total) * 100;
        return {
            domainId: d.id,
            domainName: d.name,
            expectedPct: d.expectedPct,
            actualPct: Math.round(actualPct * 10) / 10,
            actualCount: actual,
            gap: Math.round((d.expectedPct - actualPct) * 10) / 10,
        };
    });
}

export function getUnderRepresentedDomains(coverage: DomainCoverageItem[], thresholdPct = 10): CertDomain[] {
    return coverage
        .filter((c) => c.gap > thresholdPct)
        .map((c) => ({ id: c.domainId, name: c.domainName }));
}

// ── Validation (production-grade, 25+ checks) ──

interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export function validateQuestion(q: GeneratedQuestion, index: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const prefix = `Q${index + 1}`;

    if (!q?.text || typeof q.text !== 'string') {
        errors.push(`${prefix}: Missing or invalid text`);
        return { valid: false, errors, warnings };
    }
    if (q.text.length < 20) errors.push(`${prefix}: Stem too short (${q.text.length} chars, min 20)`);
    if (/\*\*[^*]+\*\*/.test(q.text)) warnings.push(`${prefix}: Stem contains **bold** markdown`);

    // Multi-answer validation
    const isMultiSelect = q.questionType === 'multi-select';
    const expectedOptions = isMultiSelect ? (q.options?.length || 5) : 4;
    const minOptions = isMultiSelect ? 4 : 4;
    const maxOptions = isMultiSelect ? 6 : 4;

    if (!Array.isArray(q.options) || q.options.length < minOptions || q.options.length > maxOptions) {
        errors.push(`${prefix}: Must have ${minOptions}-${maxOptions} options, got ${q.options?.length ?? 0}`);
    } else {
        const optionTexts = q.options.map((o) => o.text?.toLowerCase().trim());
        if (new Set(optionTexts).size < q.options.length) errors.push(`${prefix}: Duplicate option text`);
        for (let i = 0; i < q.options.length; i++) {
            if (!q.options[i].text || q.options[i].text.trim().length < 2) {
                errors.push(`${prefix}: Option ${q.options[i].label || i} is empty or too short`);
            }
        }
        for (const opt of q.options) {
            const lower = opt.text?.toLowerCase() || '';
            if (lower.includes('all of the above') || lower.includes('none of the above')) {
                errors.push(`${prefix}: Contains "all/none of the above"`);
            }
        }
        const lengths = q.options.map((o) => o.text?.length || 0);
        const maxLen = Math.max(...lengths);
        const correctIdx = isMultiSelect ? -1 : q.correctOptionIndex;
        if (correctIdx >= 0 && lengths[correctIdx] === maxLen && lengths.filter((l) => l === maxLen).length === 1) {
            warnings.push(`${prefix}: Correct answer is the longest option`);
        }
    }

    // correctOptionIndex / correctOptionIndices
    if (isMultiSelect) {
        if (!Array.isArray(q.correctOptionIndices) || q.correctOptionIndices.length < 2) {
            errors.push(`${prefix}: multi-select needs correctOptionIndices with 2+ values`);
        }
    } else {
        if (typeof q.correctOptionIndex !== 'number' || q.correctOptionIndex < 0 || q.correctOptionIndex > 3) {
            errors.push(`${prefix}: correctOptionIndex must be 0–3`);
        }
    }

    if (!VALID_DIFFICULTIES.has(q.difficulty)) errors.push(`${prefix}: Invalid difficulty "${q.difficulty}"`);
    if (!Array.isArray(q.domainIds) || q.domainIds.length === 0) errors.push(`${prefix}: domainIds must be non-empty`);

    if (!q.explanation?.short) {
        errors.push(`${prefix}: Missing explanation.short`);
    } else if (q.explanation.short.length < 10) {
        errors.push(`${prefix}: Explanation too short`);
    }

    if (!q.explanation?.whyOthersWrong || typeof q.explanation.whyOthersWrong !== 'object') {
        errors.push(`${prefix}: Missing whyOthersWrong`);
    } else if (!isMultiSelect) {
        const labels = ['A', 'B', 'C', 'D'];
        const correctLabel = labels[q.correctOptionIndex];
        for (const label of labels) {
            if (label !== correctLabel && !q.explanation.whyOthersWrong[label]) {
                errors.push(`${prefix}: whyOthersWrong missing for ${label}`);
            }
        }
    }

    // Anti-hallucination
    const fullText = `${q.text} ${q.explanation?.short || ''}`;
    for (const fake of FAKE_NIST_NUMBERS) {
        if (fullText.includes(`SP ${fake}`)) warnings.push(`${prefix}: Possibly fabricated NIST SP ${fake}`);
    }
    for (const term of BIAS_TERMS) {
        if (new RegExp(`\\b${term}\\b`, 'i').test(q.text)) {
            warnings.push(`${prefix}: Stem contains bias term "${term}"`);
        }
    }

    return { valid: errors.length === 0, errors, warnings };
}

export function isValidQuestion(q: GeneratedQuestion): boolean {
    return validateQuestion(q, 0).valid;
}

// ── Markdown stripping ──

export function stripMarkdown(s: string): string {
    if (!s) return '';
    return s.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1');
}

export function cleanQ(q: GeneratedQuestion): GeneratedQuestion {
    const whyOthersWrong: Record<string, string> = {};
    if (q.explanation?.whyOthersWrong) {
        for (const [k, v] of Object.entries(q.explanation.whyOthersWrong)) {
            whyOthersWrong[k] = stripMarkdown(v);
        }
    }
    return {
        ...q,
        text: stripMarkdown(q.text),
        options: q.options.map((o) => ({ ...o, text: stripMarkdown(o.text) })),
        explanation: {
            ...q.explanation,
            short: stripMarkdown(q.explanation.short ?? ''),
            whyOthersWrong,
            examTip: q.explanation.examTip ? stripMarkdown(q.explanation.examTip) : undefined,
        },
    };
}

// ── Prompt Builder (unified, with all features) ──

export function buildPrompt(opts: {
    certName: string;
    issuer: string;
    domains: CertDomain[];
    targetDomainId?: string;
    batchSize: number;
    lang: string;
    existingStems: string[];
    enableMultiAnswer?: boolean;
    reportedPatterns?: string[];
}): { system: string; user: string; temperature: number } {
    const { certName, issuer, domains, targetDomainId, batchSize, lang, existingStems,
        enableMultiAnswer = false, reportedPatterns } = opts;

    const targetDomain = targetDomainId ? domains.find((d) => d.id === targetDomainId) : null;

    const domainContext = domains
        .map((d) => {
            const weight = d.weight ? ` (${d.weight})` : '';
            const topics = d.topics?.length ? `\n    Topics: ${d.topics.join(', ')}` : '';
            return `  • ${d.id}: ${d.name}${weight}${topics}`;
        })
        .join('\n');

    const focusLine = targetDomain
        ? `Focus ALL questions on domain "${targetDomain.name}" (${targetDomain.id}).`
        : 'Distribute questions across ALL domains proportionally to their exam weights. Maximize breadth.';

    const langInstruction = lang !== 'en'
        ? `\n\nLANGUAGE REQUIREMENT (CRITICAL):
All text, options, explanations, whyOthersWrong, and examTip MUST be in ${LANG_NAMES[lang] ?? lang}.
Keep technical terms, acronyms, and proper names in their original form.
JSON keys stay in English — only VALUES are translated.`
        : '';

    const examStyle = EXAM_STYLE_MAP[issuer] ?? '';
    const examStyleBlock = examStyle ? `\n\n${examStyle}` : '';

    // Few-shot example
    const fewShot = FEW_SHOT_EXAMPLES[issuer] ?? '';
    const fewShotBlock = fewShot ? `\n\n${fewShot}` : '';

    // References
    const isSecurityCert = SECURITY_ISSUERS.some((s) => issuer.includes(s));
    const referencesSection = isSecurityCert
        ? `\nReferences to cite (REAL only):
- NIST SP 800-53, SP 800-61, SP 800-37, SP 800-175B, SP 800-30, SP 800-171
- ISO 27001/27002, ISO 27005, ISO 31000
- GDPR, HIPAA, SOX, PCI DSS
- OWASP Top 10, CIS Controls, MITRE ATT&CK`
        : `\nReferences: Use REAL well-known sources relevant to ${certName}. Do NOT invent fake references.`;

    // Dedup
    const dedupBlock = existingStems.length > 0
        ? `\n\nEXISTING QUESTIONS (DO NOT REPEAT):\n${existingStems.slice(0, 60).map((s) => `- "${s}"`).join('\n')}`
        : '';

    // Feedback anti-patterns
    const feedbackBlock = reportedPatterns && reportedPatterns.length > 0
        ? `\n\nAVOID THESE PATTERNS (reported as problematic by users):
${reportedPatterns.map((p) => `- ${p}`).join('\n')}`
        : '';

    // Multi-answer format
    const multiAnswerBlock = enableMultiAnswer
        ? `\n\nMULTI-SELECT QUESTIONS (generate ~20% as multi-select):
For multi-select questions, use this format:
- "questionType": "multi-select"
- "text" must include "(Select TWO)" or "(Select THREE)" at the end
- "options": can have 5-6 options
- "correctOptionIndices": [0, 2] (array of correct option indices)
- "correctOptionIndex": use the FIRST correct index for backward compatibility
- "whyOthersWrong": explain EACH incorrect option`
        : '';

    // Difficulty distribution
    const easyCount = Math.max(1, Math.round(batchSize * 0.2));
    const mediumCount = Math.round(batchSize * 0.5);
    const hardCount = batchSize - easyCount - mediumCount;

    // Adaptive temperature
    const hardRatio = hardCount / batchSize;
    const temperature = hardRatio > 0.4 ? 0.85 : hardRatio < 0.2 ? 0.55 : 0.7;

    const system = `You are an expert ${certName} certification exam question author for ${issuer}.${langInstruction}${examStyleBlock}${fewShotBlock}

Available domains:
${domainContext}

${focusLine}

OUTPUT FORMAT (STRICT — output ONLY this JSON, nothing else):
{"questions": [
  {
    "text": "Question stem here...",
    "options": [
      {"label": "A", "text": "First option"},
      {"label": "B", "text": "Second option"},
      {"label": "C", "text": "Third option"},
      {"label": "D", "text": "Fourth option"}
    ],
    "correctOptionIndex": 0,
    "explanation": {
      "short": "2+ sentences explaining WHY the correct answer is right, citing a real reference.",
      "whyOthersWrong": {
        "B": "Why B is wrong (1-3 sentences)",
        "C": "Why C is wrong (1-3 sentences)",
        "D": "Why D is wrong (1-3 sentences)"
      },
      "examTip": "A practical study/exam tip"
    },
    "difficulty": "medium",
    "domainIds": ["domain-id"],
    "tags": ["topic-tag"]
  }
]}

RULES (ALL MANDATORY):
1. Generate exactly ${batchSize} questions
2. 4 options per question, labeled A–D (unless multi-select)
3. Difficulty: ~${easyCount} easy, ~${mediumCount} medium, ~${hardCount} hard
4. explanation.short: 2+ sentences, cite a REAL source
5. whyOthersWrong: one entry per incorrect option, 1–3 sentences each
6. examTip: REQUIRED — practical, actionable
7. PLAIN TEXT ONLY: No markdown, bold, italic
8. tags: lowercase hyphenated (at least 1)
9. domainIds: use IDs from the list above
10. correctOptionIndex: distribute evenly across 0,1,2,3
${referencesSection}

QUALITY REQUIREMENTS:
- OPTION LENGTH: All options similar length (±20%). Correct NOT longer.
- DISTRACTOR QUALITY: Wrong options must be plausible real concepts.
- No "All/None of the above"
- No questions answerable without reading options
- No two options that are the same concept
- No trick questions or ambiguous stems
${multiAnswerBlock}
${feedbackBlock}
${dedupBlock}

Output ONLY the JSON object. No markdown fences.`;

    const langNote = lang !== 'en' ? ` Write all content in ${LANG_NAMES[lang] ?? lang}.` : '';
    const user = `Generate ${batchSize} high-quality "${certName}" exam questions. Follow ALL rules.${langNote} Output valid JSON only.`;

    return { system, user, temperature };
}

// ── Retry Prompt Builder ──

export function buildRetryPrompt(opts: {
    certName: string;
    issuer: string;
    failedReasons: string[];
    retryCount: number;
    lang: string;
    domains: CertDomain[];
}): { system: string; user: string } {
    const { certName, issuer, failedReasons, retryCount, lang, domains } = opts;

    const domainContext = domains.map((d) => `  • ${d.id}: ${d.name}`).join('\n');
    const langNote = lang !== 'en' ? ` Write all content in ${LANG_NAMES[lang] ?? lang}.` : '';
    const examStyle = EXAM_STYLE_MAP[issuer] ?? '';

    const system = `You are an expert ${certName} exam question author for ${issuer}.
${examStyle ? `\n${examStyle}\n` : ''}
Available domains:
${domainContext}

The previous generation attempt produced ${retryCount} questions that FAILED validation for these reasons:
${failedReasons.map((r) => `- ${r}`).join('\n')}

Generate EXACTLY ${retryCount} REPLACEMENT questions that DO NOT have these problems.
Follow the SAME JSON schema as before. Be extra careful about:
- Every question needs exactly 4 options (A-D)
- correctOptionIndex must be 0-3
- explanation.short must have 2+ sentences
- whyOthersWrong must have entries for ALL 3 incorrect options
- examTip is REQUIRED
- difficulty must be "easy", "medium", or "hard"
- PLAIN TEXT ONLY — no markdown

Output ONLY: {"questions": [...]}`;

    const user = `Generate ${retryCount} replacement questions for "${certName}".${langNote} These must pass all validation rules. Output valid JSON only.`;

    return { system, user };
}

// ── Quality Score Prompt Builder ──

export function buildQualityScorePrompt(questions: GeneratedQuestion[], certName: string, issuer: string): string {
    const qSummaries = questions.map((q, i) =>
        `Q${i + 1}: "${q.text.slice(0, 150)}..." | Difficulty: ${q.difficulty} | Options: ${q.options.map(o => o.label).join(',')}`
    ).join('\n');

    return `You are a certification exam quality reviewer for "${certName}" (${issuer}).

Rate each question on a scale of 0-100 based on:
- Stem clarity and specificity (0-20)
- Distractor plausibility — are wrong options realistic? (0-20)
- Explanation depth — does it teach? (0-20)
- Domain relevance — does it test what the cert actually tests? (0-20)
- Certification style match — does it feel like a real ${certName} exam question? (0-20)

Questions to rate:
${qSummaries}

Return ONLY this JSON:
{"scores": [
  {"index": 0, "score": 85, "feedback": "Strong scenario-based question but distractor C is too obvious"},
  {"index": 1, "score": 60, "feedback": "Tests recall only; needs more application-level thinking"}
]}

Rate honestly. Questions below 50 are poor quality. Questions above 80 are exam-ready.
Output ONLY the JSON.`;
}

export function parseQualityScores(content: string): QualityScoreResult[] {
    try {
        const parsed = JSON.parse(content);
        if (!Array.isArray(parsed.scores)) return [];
        return parsed.scores.map((s: { index: number; score: number; feedback: string }) => ({
            index: s.index ?? 0,
            score: Math.min(100, Math.max(0, s.score ?? 0)),
            feedback: s.feedback ?? '',
        }));
    } catch {
        return [];
    }
}

// ── Feedback Loop: Anti-pattern extraction ──

export function buildAntiPatternBlock(reportReasons: string[]): string[] {
    const patternMap: Record<string, string> = {
        'incorrect_answer': 'Do not generate questions where the marked correct answer could be disputed. Ensure the correct option is unambiguously the BEST.',
        'ambiguous': 'Avoid ambiguous stems where multiple options could be equally correct. Each question must have ONE clearly best answer.',
        'outdated': 'Use only current, up-to-date information. Do not reference deprecated technologies, old exam versions, or superseded standards.',
        'too_easy': 'Avoid overly simple questions that test basic definitions. Prioritize scenario-based questions that require critical thinking.',
        'too_hard': 'Ensure questions are solvable with standard certification knowledge. Do not test obscure edge cases.',
        'poorly_worded': 'Write clear, grammatically correct stems. Avoid double negatives, convoluted phrasing, or overly technical jargon without context.',
        'duplicate': 'Ensure each question tests a unique concept. Do not create questions that are minor variations of each other.',
        'wrong_domain': 'Ensure the question clearly belongs to the assigned domain. Do not assign domain IDs that do not match the content.',
    };

    const patterns: string[] = [];
    const seen = new Set<string>();
    for (const reason of reportReasons) {
        const lower = reason.toLowerCase();
        for (const [key, pattern] of Object.entries(patternMap)) {
            if (lower.includes(key) && !seen.has(key)) {
                patterns.push(pattern);
                seen.add(key);
            }
        }
    }
    return patterns;
}

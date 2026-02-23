/**
 * Shared utilities for AI question generation and validation.
 * Single source of truth for prompts, validation, cert data, and exam styles.
 */

// ── Types ──

export interface GeneratedQuestion {
    text: string;
    options: Array<{ label: string; text: string }>;
    correctOptionIndex: number;
    explanation: { short: string; whyOthersWrong: Record<string, string>; examTip?: string };
    difficulty: string;
    domainIds: string[];
    tags: string[];
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

// ── Exam Style Map (certification-specific prompt instructions) ──

export const EXAM_STYLE_MAP: Record<string, string> = {
    'ISC2': `EXAM STYLE — ISC2 CBK (CRITICAL — follow this exactly):
- Questions test MANAGEMENT JUDGMENT and RISK-BASED THINKING, not raw technical recall
- Stems MUST be scenario-based (3-8 sentences describing a real-world security situation)
- The question asks "What should the security professional do FIRST?" or "What is the BEST course of action?"
- ALL four options must be partially correct or reasonable — the BEST answer aligns with ISC2's governance/risk perspective
- Focus on "why" over "how" — emphasize governance, policy, due diligence, and defense-in-depth
- Use terms: "risk assessment", "due care", "due diligence", "least privilege", "defense in depth"`,

    'CompTIA': `EXAM STYLE — CompTIA Performance-Based (CRITICAL — follow this exactly):
- Mix of direct knowledge questions and applied scenario questions
- Some questions present a troubleshooting scenario: "A user reports that..."
- Options list specific tools, commands, protocols, or actions (e.g., "Run netstat -an", "Configure port 443")
- Easy questions: 1-2 sentence direct recall
- Medium/Hard questions: 3-5 sentence scenario, identify the BEST tool/action/protocol
- Use real tool names, port numbers, protocol names — be technically precise`,

    'Amazon Web Services': `EXAM STYLE — AWS Scenario-Based (CRITICAL — follow this exactly):
- EVERY question must be a real-world cloud architecture scenario
- Stem format: "A company has [specific requirement/constraint]... Which combination of AWS services meets these requirements?"
- Options list SPECIFIC AWS services and configurations (e.g., "Use Amazon Aurora with read replicas and ElastiCache")
- Correct answer optimizes for the stated priority (cost, resilience, performance, or security)
- Use real AWS service names: EC2, S3, RDS, Lambda, CloudFront, Route 53, VPC, IAM, etc.
- Include specific details: instance types, storage classes, pricing models`,

    'Microsoft': `EXAM STYLE — Microsoft Role-Based (CRITICAL — follow this exactly):
- Scenario-driven: "Your organization needs to..." or "You are configuring..."
- Options reference specific Azure services, PowerShell cmdlets, CLI commands, or portal settings
- Use real Azure service names: Azure AD (Entra ID), Azure Policy, RBAC, NSG, App Service, etc.
- Include specific configuration details and best practices from Microsoft documentation
- For fundamentals exams (900-level): mix of concept and identification questions`,

    'Google Cloud': `EXAM STYLE — Google Cloud (CRITICAL — follow this exactly):
- Scenario-based: "Your team needs to deploy a microservices application that..."
- Options reference specific GCP services: Compute Engine, GKE, Cloud Run, BigQuery, Cloud SQL, etc.
- Correct answer follows Google's recommended best practices and Well-Architected Framework
- Include considerations for cost, scalability, and managed vs unmanaged services`,

    'ISACA': `EXAM STYLE — ISACA Governance & Audit (CRITICAL — follow this exactly):
- Questions test GOVERNANCE and AUDIT JUDGMENT from a management/auditor perspective
- Stems describe audit findings, governance scenarios, or risk situations
- Answer asks "What should the auditor recommend?" or "What is the MOST important consideration?"
- Options are governance actions, audit procedures, or risk responses
- Use COBIT, ITIL, and ISO frameworks as reference points`,

    'EC-Council': `EXAM STYLE — EC-Council Hands-On (CRITICAL — follow this exactly):
- Questions test PRACTICAL HACKING/SECURITY knowledge
- Include specific tools: Nmap, Wireshark, Metasploit, Burp Suite, John the Ripper, etc.
- Stems describe attack scenarios, vulnerability findings, or forensic investigations
- Options include specific commands, techniques, or tool configurations
- Reference OWASP, MITRE ATT&CK, CVE identifiers when appropriate`,

    'PMI': `EXAM STYLE — PMI Situational Judgment (CRITICAL — follow this exactly):
- ALL questions are situational: "You are a project manager and discover that..."
- Questions ask "What should you do FIRST?" or "What is the BEST approach?"
- Options are PM actions (not technical solutions)
- Mix of predictive (waterfall) and adaptive (agile) approaches per PMI's hybrid stance
- Reference PMBOK Guide, Agile Practice Guide concepts`,

    'Linux Foundation / CNCF': `EXAM STYLE — Kubernetes/DevOps Hands-On (CRITICAL — follow this exactly):
- Questions test practical cluster administration and application deployment
- Include specific kubectl commands, YAML manifest snippets, and configuration details
- Stems describe cluster issues, deployment requirements, or troubleshooting scenarios
- Options include specific commands or configuration approaches`,

    'HashiCorp': `EXAM STYLE — HashiCorp IaC (CRITICAL — follow this exactly):
- Questions test Terraform/Vault/Consul practical knowledge
- Include HCL code snippets, CLI commands, and configuration patterns
- Stems describe infrastructure provisioning scenarios
- Options include specific Terraform resources, providers, and workflow commands`,

    'Scrum.org': `EXAM STYLE — Scrum Framework (CRITICAL — follow this exactly):
- Questions test understanding of Scrum Guide (2020 edition)
- Scenarios involve Sprint events, roles, and artifacts
- Correct answers align strictly with the Scrum Guide — not "real world" deviations
- Ask "What should the Scrum Master do?" or "What is the purpose of..."`,

    'INEP': `ESTILO DO EXAME — ENEM (CRÍTICO — siga exatamente):
- TODA questão DEVE ter um TEXTO-BASE (3-8 linhas de contexto: trecho literário, notícia, gráfico descrito, tabela, ou cenário)
- A pergunta pede interpretação, análise ou aplicação do texto-base
- As alternativas devem ser plausíveis mas apenas UMA está correta conforme o texto
- Usar linguagem formal porém acessível, compatível com Ensino Médio
- Incluir questões interdisciplinares quando possível`,

    'Conselho Federal da OAB': `ESTILO DO EXAME — OAB (CRÍTICO — siga exatamente):
- Cada questão apresenta uma SITUAÇÃO-PROBLEMA jurídica (3-6 linhas descrevendo um caso)
- A pergunta pede a solução juridicamente correta conforme a legislação vigente
- Alternativas citam dispositivos legais, prazos ou institutos jurídicos
- Referência obrigatória: CF/88, Código Civil, Código Penal, CPC, CPP, CLT, Estatuto da OAB
- Usar linguagem técnico-jurídica precisa`,

    'Diversas Instituições BR': `ESTILO DO EXAME — Residência Médica (CRÍTICO — siga exatamente):
- Cada questão apresenta um CASO CLÍNICO (5-10 linhas: idade, sexo, queixa, exame físico, exames laboratoriais)
- A pergunta pede diagnóstico, conduta, ou próximo passo
- Alternativas são diagnósticos diferenciais ou condutas médicas plausíveis
- Usar terminologia médica precisa (CID, protocolos do MS, diretrizes SUS)`,

    'PECB / BSI': `EXAM STYLE — ISO Auditing (CRITICAL):
- Questions test audit methodology and ISMS understanding
- Stems describe audit scenarios, nonconformities, or management review situations
- Answers reference specific ISO 27001/27002 clauses and controls`,

    'BCS / IAPP': `EXAM STYLE — Data Protection (CRITICAL):
- Questions test GDPR articles, data subject rights, controller/processor obligations
- Stems describe data processing scenarios
- Answers reference specific GDPR articles and recitals`,

    'HHS / AHIMA': `EXAM STYLE — HIPAA Compliance (CRITICAL):
- Questions present healthcare data scenarios involving PHI
- Options reference specific HIPAA rules (Privacy, Security, Breach Notification)
- Include scenarios about covered entities, business associates, and safeguards`,
};

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

    // Text checks
    if (!q?.text || typeof q.text !== 'string') {
        errors.push(`${prefix}: Missing or invalid text`);
        return { valid: false, errors, warnings };
    }
    if (q.text.length < 20) errors.push(`${prefix}: Stem too short (${q.text.length} chars, min 20)`);
    if (/\*\*[^*]+\*\*/.test(q.text)) warnings.push(`${prefix}: Stem contains **bold** markdown`);

    // Options checks
    if (!Array.isArray(q.options) || q.options.length !== 4) {
        errors.push(`${prefix}: Must have exactly 4 options`);
    } else {
        const optionTexts = q.options.map((o) => o.text?.toLowerCase().trim());
        if (new Set(optionTexts).size < 4) errors.push(`${prefix}: Duplicate option text detected`);
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
        // Check if correct answer is systematically longest
        const lengths = q.options.map((o) => o.text?.length || 0);
        const maxLen = Math.max(...lengths);
        if (
            typeof q.correctOptionIndex === 'number' &&
            lengths[q.correctOptionIndex] === maxLen &&
            lengths.filter((l) => l === maxLen).length === 1
        ) {
            warnings.push(`${prefix}: Correct answer is the longest option`);
        }
    }

    // correctOptionIndex
    if (typeof q.correctOptionIndex !== 'number' || q.correctOptionIndex < 0 || q.correctOptionIndex > 3) {
        errors.push(`${prefix}: correctOptionIndex must be 0–3`);
    }

    // Difficulty
    if (!VALID_DIFFICULTIES.has(q.difficulty)) {
        errors.push(`${prefix}: Invalid difficulty "${q.difficulty}"`);
    }

    // DomainIds
    if (!Array.isArray(q.domainIds) || q.domainIds.length === 0) {
        errors.push(`${prefix}: domainIds must be a non-empty array`);
    }

    // Explanation.short
    if (!q.explanation?.short) {
        errors.push(`${prefix}: Missing explanation.short`);
    } else if (q.explanation.short.length < 10) {
        errors.push(`${prefix}: Explanation too short`);
    }

    // whyOthersWrong completeness
    if (!q.explanation?.whyOthersWrong || typeof q.explanation.whyOthersWrong !== 'object') {
        errors.push(`${prefix}: Missing whyOthersWrong`);
    } else {
        const labels = ['A', 'B', 'C', 'D'];
        const correctLabel = labels[q.correctOptionIndex];
        for (const label of labels) {
            if (label !== correctLabel && !q.explanation.whyOthersWrong[label]) {
                errors.push(`${prefix}: whyOthersWrong missing entry for option ${label}`);
            }
        }
    }

    // Anti-hallucination: fake NIST references
    const fullText = `${q.text} ${q.explanation?.short || ''}`;
    for (const fake of FAKE_NIST_NUMBERS) {
        if (fullText.includes(`SP ${fake}`)) {
            warnings.push(`${prefix}: Possibly fabricated NIST SP ${fake}`);
        }
    }

    // Anti-bias terms in stem
    for (const term of BIAS_TERMS) {
        const regex = new RegExp(`\\b${term}\\b`, 'i');
        if (regex.test(q.text)) {
            warnings.push(`${prefix}: Stem contains bias term "${term}"`);
        }
    }

    return { valid: errors.length === 0, errors, warnings };
}

// Legacy compat alias
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

// ── Prompt Builder ──

export function buildPrompt(opts: {
    certName: string;
    issuer: string;
    domains: CertDomain[];
    targetDomainId?: string;
    batchSize: number;
    lang: string;
    existingStems: string[];
}): { system: string; user: string } {
    const { certName, issuer, domains, targetDomainId, batchSize, lang, existingStems } = opts;

    const targetDomain = targetDomainId ? domains.find((d) => d.id === targetDomainId) : null;

    // Domain context with topics
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

    // Language
    const langInstruction = lang !== 'en'
        ? `\n\nLANGUAGE REQUIREMENT (CRITICAL):
All question text, options, explanations, whyOthersWrong, and examTip MUST be in ${LANG_NAMES[lang] ?? lang}.
Keep technical terms, acronyms, and proper names in their original form.
JSON keys stay in English — only VALUES are translated.`
        : '';

    // Exam style
    const examStyle = EXAM_STYLE_MAP[issuer] ?? '';
    const examStyleBlock = examStyle ? `\n\n${examStyle}` : '';

    // References
    const isSecurityCert = SECURITY_ISSUERS.some((s) => issuer.includes(s));
    const referencesSection = isSecurityCert
        ? `\nReferences to cite (REAL ones ONLY):
- NIST SP 800-53, SP 800-61, SP 800-37, SP 800-175B, SP 800-30, SP 800-171
- ISO 27001/27002, ISO 27005, ISO 27017/27018, ISO 31000
- GDPR, HIPAA, SOX, PCI DSS, FERPA, GLBA
- ISC2 CBK, CompTIA objectives, COBIT, ITIL
- CSA CCM, OWASP Top 10, CIS Controls, MITRE ATT&CK`
        : `\nReferences: Use REAL, well-known sources relevant to ${certName}. Do NOT invent fake references.`;

    // Dedup
    const dedupBlock = existingStems.length > 0
        ? `\n\nEXISTING QUESTIONS (DO NOT REPEAT — generate entirely new questions):\n${existingStems.slice(0, 60).map((s) => `- "${s}"`).join('\n')}`
        : '';

    // Difficulty distribution
    const easyCount = Math.max(1, Math.round(batchSize * 0.2));
    const mediumCount = Math.round(batchSize * 0.5);
    const hardCount = batchSize - easyCount - mediumCount;

    const system = `You are an expert ${certName} certification exam question author for ${issuer}.${langInstruction}${examStyleBlock}

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
2. 4 options per question, labeled A–D
3. Difficulty distribution: ~${easyCount} easy, ~${mediumCount} medium, ~${hardCount} hard
4. explanation.short: 2+ complete sentences, must cite a REAL source
5. whyOthersWrong: one entry for EACH incorrect option (skip the correct letter), 1–3 sentences each
6. examTip: REQUIRED — a practical, actionable study/exam tip
7. PLAIN TEXT ONLY: No markdown, bold, italic, or formatting. Write naturally.
8. tags: lowercase, hyphenated topic tags (at least 1)
9. domainIds: use domain IDs from the list above
10. correctOptionIndex: distribute evenly across 0,1,2,3
${referencesSection}

QUALITY REQUIREMENTS:
- OPTION LENGTH: All 4 options MUST be similar length (±20%). Correct answer must NOT be longer.
- DISTRACTOR QUALITY: Wrong options must be plausible real concepts, never absurd.
- No "All of the above" or "None of the above"
- No questions answerable without reading options
- No two options that are effectively the same concept
- No trick questions or overly ambiguous stems
- No hedging language only in distractors while correct answer uses definitive language

QUESTION TYPES:
- Easy: Direct recall — "What is the primary purpose of..."
- Medium: Applied scenario with clear answer, 2-5 sentence stem
- Hard: Complex scenario, 4-10 sentence stem, all options partially correct but one is BEST
${dedupBlock}

Output ONLY the JSON object. No markdown fences, no explanation outside JSON.`;

    const langNote = lang !== 'en' ? ` Write all content in ${LANG_NAMES[lang] ?? lang}.` : '';
    const user = `Generate ${batchSize} high-quality "${certName}" exam questions. Follow ALL rules in the system prompt.${langNote} Output valid JSON only.`;

    return { system, user };
}

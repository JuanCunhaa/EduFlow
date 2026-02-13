/**
 * Prompt Builder — 100% AI-driven, zero external file dependencies.
 *
 * Embeds all known cert domain data directly in code.
 * For unknown certs/topics, uses a two-phase AI approach:
 *   Phase 1: Ask the LLM to discover domains for the cert
 *   Phase 2: Generate questions per domain
 *
 * NO JSON files, NO mappings, NO templates needed.
 */

import * as fs from 'fs';
import * as path from 'path';

// ── Types ────────────────────────────────────────

export interface AIClient {
    chatJSON<T>(messages: any[]): Promise<{ data: T }>;
}

export interface DomainInfo {
    id: string;
    number: number;
    name: string;
    weight: string;
    topics: string[];
}

export interface CertInfo {
    slug: string;
    name: string;
    issuer: string;
    domains: DomainInfo[];
}

export interface DomainMeta {
    certSlug: string;
    certName: string;
    certIssuer: string;
    domainId: string;
    domainNumber: number;
    domainName: string;
    domainWeight: string;
    topics: string[];
}

// ── Embedded cert data ───────────────────────────
// Known certs — no files needed. The AI supplements with its training knowledge.

const KNOWN_CERTS: Record<string, CertInfo> = {
    cissp: {
        slug: 'cissp',
        name: 'CISSP (Certified Information Systems Security Professional)',
        issuer: 'ISC2',
        domains: [
            { id: 'sam', number: 1, name: 'Security and Risk Management', weight: '15%', topics: ['CIA triad', 'security governance', 'compliance', 'legal & regulatory', 'professional ethics', 'BCP', 'risk management', 'threat modeling', 'supply chain risk', 'security awareness'] },
            { id: 'as', number: 2, name: 'Asset Security', weight: '10%', topics: ['data classification', 'data ownership', 'privacy protection', 'asset retention', 'data security controls', 'data handling requirements'] },
            { id: 'se', number: 3, name: 'Security Architecture and Engineering', weight: '13%', topics: ['security models', 'security evaluation', 'secure design patterns', 'cryptography', 'site & facility security', 'physical security'] },
            { id: 'cns', number: 4, name: 'Communication and Network Security', weight: '13%', topics: ['network models', 'IP networking', 'wireless security', 'network protocols', 'network attacks', 'network security devices'] },
            { id: 'iam', number: 5, name: 'Identity and Access Management', weight: '13%', topics: ['physical & logical access', 'identification & authentication', 'identity as a service', 'authorization mechanisms', 'access control attacks', 'identity lifecycle'] },
            { id: 'sa', number: 6, name: 'Security Assessment and Testing', weight: '12%', topics: ['vulnerability assessment', 'penetration testing', 'log reviews', 'SOC reports', 'security audits', 'KPIs & metrics'] },
            { id: 'so', number: 7, name: 'Security Operations', weight: '13%', topics: ['investigation types', 'evidence handling', 'incident management', 'disaster recovery', 'business continuity', 'change management', 'physical security operations'] },
            { id: 'ssd', number: 8, name: 'Software Development Security', weight: '11%', topics: ['SDLC', 'development methodologies', 'maturity models', 'secure coding', 'code review', 'software testing', 'API security', 'DevSecOps'] },
        ],
    },
    cc: {
        slug: 'cc',
        name: 'CC (Certified in Cybersecurity)',
        issuer: 'ISC2',
        domains: [
            { id: 'sp', number: 1, name: 'Security Principles', weight: '26%', topics: ['CIA triad', 'authentication', 'non-repudiation', 'privacy', 'governance', 'risk management', 'compliance'] },
            { id: 'bc', number: 2, name: 'Business Continuity, Disaster Recovery & Incident Response', weight: '10%', topics: ['BCP', 'DRP', 'incident response', 'backup strategies'] },
            { id: 'ac', number: 3, name: 'Access Controls Concepts', weight: '22%', topics: ['access control models', 'RBAC', 'MAC', 'DAC', 'least privilege', 'segregation of duties'] },
            { id: 'ns', number: 4, name: 'Network Security', weight: '24%', topics: ['OSI model', 'TCP/IP', 'ports & protocols', 'firewalls', 'IDS/IPS', 'VPN', 'wireless security'] },
            { id: 'so', number: 5, name: 'Security Operations', weight: '18%', topics: ['data handling', 'logging & monitoring', 'encryption', 'hardening', 'security policies', 'awareness training'] },
        ],
    },
    sscp: {
        slug: 'sscp',
        name: 'SSCP (Systems Security Certified Practitioner)',
        issuer: 'ISC2',
        domains: [
            { id: 'sao', number: 1, name: 'Security Operations and Administration', weight: '16%', topics: ['security concepts', 'asset management', 'change management', 'security awareness'] },
            { id: 'ac', number: 2, name: 'Access Controls', weight: '15%', topics: ['access control models', 'authentication methods', 'internetwork trust', 'identity management'] },
            { id: 'ria', number: 3, name: 'Risk Identification, Monitoring, and Analysis', weight: '15%', topics: ['risk management', 'vulnerability assessment', 'security monitoring', 'risk frameworks'] },
            { id: 'ir', number: 4, name: 'Incident Response and Recovery', weight: '14%', topics: ['incident handling', 'forensic investigation', 'BCP', 'DRP'] },
            { id: 'cry', number: 5, name: 'Cryptography', weight: '9%', topics: ['symmetric/asymmetric encryption', 'hashing', 'PKI', 'digital signatures', 'key management'] },
            { id: 'ns', number: 6, name: 'Network and Communications Security', weight: '16%', topics: ['network fundamentals', 'wireless security', 'network attacks', 'network access control'] },
            { id: 'sse', number: 7, name: 'Systems and Application Security', weight: '15%', topics: ['malware', 'endpoint protection', 'cloud security', 'secure SDLC', 'virtual environments'] },
        ],
    },
    ccsp: {
        slug: 'ccsp',
        name: 'CCSP (Certified Cloud Security Professional)',
        issuer: 'ISC2',
        domains: [
            { id: 'cc', number: 1, name: 'Cloud Concepts, Architecture and Design', weight: '17%', topics: ['cloud computing concepts', 'cloud reference architecture', 'cloud security concepts', 'design principles'] },
            { id: 'cds', number: 2, name: 'Cloud Data Security', weight: '20%', topics: ['cloud data lifecycle', 'data classification', 'data privacy', 'data rights management', 'data retention'] },
            { id: 'cps', number: 3, name: 'Cloud Platform & Infrastructure Security', weight: '17%', topics: ['cloud infrastructure', 'risk assessment', 'virtualization security', 'countermeasures', 'BCP/DRP'] },
            { id: 'cas', number: 4, name: 'Cloud Application Security', weight: '17%', topics: ['application security threats', 'SDLC', 'application assurance', 'identity federation'] },
            { id: 'co', number: 5, name: 'Cloud Security Operations', weight: '16%', topics: ['physical & logical infrastructure', 'operational controls', 'digital forensics', 'communication'] },
            { id: 'lr', number: 6, name: 'Legal, Risk and Compliance', weight: '13%', topics: ['legal requirements', 'privacy issues', 'audit processes', 'risk management', 'outsourcing'] },
        ],
    },
    'security+': {
        slug: 'security-plus',
        name: 'CompTIA Security+ (SY0-701)',
        issuer: 'CompTIA',
        domains: [
            { id: 'gc', number: 1, name: 'General Security Concepts', weight: '12%', topics: ['security controls', 'CIA triad', 'authentication', 'authorization', 'zero trust', 'gap analysis'] },
            { id: 'ta', number: 2, name: 'Threats, Vulnerabilities, and Mitigations', weight: '22%', topics: ['threat actors', 'attack surfaces', 'social engineering', 'malware', 'cryptographic attacks', 'indicators of compromise'] },
            { id: 'sa', number: 3, name: 'Security Architecture', weight: '18%', topics: ['architecture models', 'infrastructure concepts', 'secure communication', 'cloud security', 'virtualization', 'IoT security', 'ICS/SCADA'] },
            { id: 'so', number: 4, name: 'Security Operations', weight: '28%', topics: ['monitoring', 'vulnerability management', 'incident response', 'digital forensics', 'automation', 'logging', 'alerting'] },
            { id: 'pm', number: 5, name: 'Security Program Management and Oversight', weight: '20%', topics: ['governance', 'risk management', 'compliance', 'security policies', 'awareness programs', 'audits'] },
        ],
    },
    enem: {
        slug: 'enem',
        name: 'Exame Nacional do Ensino Médio',
        issuer: 'Instituto Nacional de Estudos e Pesquisas Educacionais Anísio Teixeira (INEP)',
        domains: [
            { id: 'ling', number: 1, name: 'Linguagens, Códigos e suas Tecnologias', weight: '25%', topics: ['Língua Portuguesa', 'Literatura', 'Língua Estrangeira', 'Artes', 'Educação Física', 'Tecnologias da Informação'] },
            { id: 'mat', number: 2, name: 'Matemática e suas Tecnologias', weight: '25%', topics: ['Números e Operações', 'Geometria', 'Álgebra', 'Análise de Dados', 'Raciocínio Lógico'] },
            { id: 'ci1', number: 3, name: 'Ciências da Natureza e suas Tecnologias', weight: '25%', topics: ['Biologia', 'Química', 'Física', 'Ciências Ambientais'] },
            { id: 'ci2', number: 4, name: 'Ciências Humanas e suas Tecnologias', weight: '25%', topics: ['História', 'Geografia', 'Filosofia', 'Sociologia'] },
        ],
    },
};

// Aliases for flexible CLI input
const CERT_ALIASES: Record<string, string> = {
    'cissp': 'cissp',
    'cc': 'cc',
    'sscp': 'sscp',
    'ccsp': 'ccsp',
    'security+': 'security+',
    'securityplus': 'security+',
    'sec+': 'security+',
    'comptia-security': 'security+',
    'comptia security+': 'security+',
    'sy0-701': 'security+',
    'enem': 'enem',
};

// ── Language names ────────────────────────────────

const LANG_NAMES: Record<string, string> = {
    'en': 'English',
    'pt-BR': 'Brazilian Portuguese (Português Brasileiro)',
    'pt': 'Portuguese (Português)',
    'es': 'Spanish (Español)',
    'fr': 'French (Français)',
    'de': 'German (Deutsch)',
    'it': 'Italian (Italiano)',
    'ja': 'Japanese (日本語)',
    'ko': 'Korean (한국어)',
    'zh': 'Chinese (中文)',
    'ar': 'Arabic (العربية)',
    'hi': 'Hindi (हिन्दी)',
    'tr': 'Turkish (Türkçe)',
    'ru': 'Russian (Русский)',
    'nl': 'Dutch (Nederlands)',
};

// ── Public API ───────────────────────────────────

/**
 * Resolve a cert identifier — supports known certs and free-form topics.
 * For unknown certs, asks the AI to discover domains.
 */
/**
 * Resolve a cert identifier — supports known certs and free-form topics.
 * For unknown certs, asks the AI to discover domains.
 */
export async function resolveCert(input: string, client?: AIClient): Promise<CertInfo> {
    const normalized = input.toLowerCase().trim();

    // Try alias lookup first
    const aliasKey = CERT_ALIASES[normalized];
    if (aliasKey && KNOWN_CERTS[aliasKey]) {
        return KNOWN_CERTS[aliasKey];
    }

    // Try direct lookup
    if (KNOWN_CERTS[normalized]) {
        return KNOWN_CERTS[normalized];
    }

    // Unknown cert — use AI to discover domains
    if (!client) {
        const knownList = Object.keys(KNOWN_CERTS).join(', ');
        throw new Error(
            `Unknown cert "${input}". Known certs: ${knownList}.\n` +
            `For custom certs/topics, the AI will auto-discover domains (requires API key).`
        );
    }

    console.log(`\n🤖 Unknown cert "${input}" — asking AI to discover domains...`);
    return discoverCertDomains(input, client);
}

/**
 * Get a specific domain from a cert.
 */
export function getDomainMeta(cert: CertInfo, domainIdOrNumber: string): DomainMeta {
    // Try by ID
    let domain = cert.domains.find(d => d.id === domainIdOrNumber);

    // Try by number
    if (!domain) {
        const num = parseInt(domainIdOrNumber, 10);
        if (!isNaN(num)) {
            domain = cert.domains.find(d => d.number === num);
        }
    }

    if (!domain) {
        const available = cert.domains.map(d => `${d.id} (${d.number}: ${d.name})`).join(', ');
        throw new Error(`Unknown domain "${domainIdOrNumber}" for ${cert.name}. Available: ${available}`);
    }

    return {
        certSlug: cert.slug,
        certName: cert.name,
        certIssuer: cert.issuer,
        domainId: domain.id,
        domainNumber: domain.number,
        domainName: domain.name,
        domainWeight: domain.weight,
        topics: domain.topics,
    };
}

/**
 * List all domains for a cert.
 */
export function listDomains(cert: CertInfo): DomainMeta[] {
    return cert.domains.map(d => ({
        certSlug: cert.slug,
        certName: cert.name,
        certIssuer: cert.issuer,
        domainId: d.id,
        domainNumber: d.number,
        domainName: d.name,
        domainWeight: d.weight,
        topics: d.topics,
    }));
}

/**
 * List all known cert identifiers.
 */
export function listKnownCerts(): string[] {
    return Object.keys(KNOWN_CERTS);
}

/**
 * Build the system prompt for question generation.
 * 100% self-contained — no external files needed.
 */
export function buildSystemPrompt(
    domain: DomainMeta,
    count: number,
    existingQuestionTexts: string[] = [],
    lang: string = 'en'
): string {
    const topicsText = domain.topics.map(t => `  • ${t}`).join('\n');

    const existingSection = existingQuestionTexts.length > 0
        ? existingQuestionTexts.map((t, i) => `  ${i + 1}. ${t.slice(0, 120)}...`).join('\n')
        : '  (none — this is the first batch)';

    const langInstruction = lang !== 'en'
        ? `\n\nLANGUAGE REQUIREMENT (CRITICAL):\nAll question text, options, explanations, whyOthersWrong, and examTip MUST be written in ${LANG_NAMES[lang] || lang}.\nKeep technical terms, acronyms, and well-known proper names in their original form.\nThe JSON keys (text, options, label, etc.) stay in English — only the VALUES are translated.`
        : '';

    // Detect if this is a security/IT certification or a general exam
    const securityIssuers = ['ISC2', 'CompTIA', 'ISACA', 'EC-Council', 'SANS', 'AWS', 'Microsoft', 'Google', 'Cisco'];
    const isSecurityCert = securityIssuers.some(s => domain.certIssuer.includes(s));

    const referencesSection = isSecurityCert
        ? `\nReferences to cite in explanations (use REAL ones only):
- NIST SP 800-53, SP 800-61, SP 800-37, SP 800-175B, SP 800-30, SP 800-171
- ISO 27001/27002, ISO 27005, ISO 27017/27018, ISO 31000
- GDPR, HIPAA, SOX, PCI DSS, FERPA, GLBA
- ISC2 CBK, CompTIA exam objectives, COBIT, ITIL
- CSA CCM, OWASP Top 10, CIS Controls, MITRE ATT&CK`
        : `\nReferences to cite in explanations:
- Use REAL, well-known academic references, textbooks, laws, or official sources relevant to ${domain.certName}
- Cite specific authors, theories, laws, or frameworks when applicable
- Do NOT invent fake references or publication numbers`;

    const avoidSection = isSecurityCert
        ? `- Vendor-specific answers (Cisco, Microsoft, AWS, etc.)
- Inventing fake standards or SP/ISO numbers`
        : `- Inventing fake authors, laws, or publication references
- Questions that are opinion-based rather than factual`;

    return `You are an expert exam question author for ${domain.certName} (${domain.certIssuer}).${langInstruction}

Domain ${domain.domainNumber}: ${domain.domainName} (${domain.domainWeight} of exam)

Key topics for this domain:
${topicsText}

Use your training knowledge of this exam's official content to generate high-quality questions covering this domain comprehensively.

OUTPUT FORMAT (STRICT — output ONLY this JSON, nothing else):
{"questions": [
  {
    "text": "Question stem here, written naturally without any formatting...",
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
      "examTip": "A practical tip for the exam-taker"
    },
    "difficulty": "medium",
    "domainIds": ["d${domain.domainNumber}"],
    "tags": ["topic-tag"],
    "questionType": "mcq"
  }
]}

RULES (ALL MANDATORY):
1. Generate exactly ${count} questions
2. 4 options per question, labeled A–D
3. difficulty distribution: ~${Math.round(count * 0.2)} easy, ~${Math.round(count * 0.5)} medium, ~${Math.round(count * 0.3)} hard
4. explanation.short: 2+ complete sentences, must cite a REAL source
5. whyOthersWrong: one entry for EACH incorrect option (skip the correct letter), 1–3 sentences each
6. examTip: REQUIRED — a practical, actionable study/exam tip
7. PLAIN TEXT ONLY: Do NOT use markdown, bold (**), caps-lock, or any emphasis formatting in question text or options. Write naturally. Example: "Qual foi a maior consequência..." NOT "Qual foi a **MAIOR** consequência..."
8. tags: lowercase, hyphenated topic tags (at least 1)
9. questionType: always "mcq"
10. domainIds: always ["d${domain.domainNumber}"]
11. Spread questions across ALL topics listed above — cover maximum breadth
${referencesSection}

QUALITY REQUIREMENTS:
- OPTION LENGTH: All 4 options MUST be similar length (±20% character count). The correct answer must NOT be longer than distractors.
- CORRECT POSITION: Distribute correctOptionIndex evenly (0,1,2,3). Never cluster in one position.
- DISTRACTOR QUALITY: Wrong options must be plausible real concepts, never absurd.
- No "All of the above" or "None of the above"
${avoidSection}
- Questions answerable without reading options
- Two options that are effectively the same
- Trick questions or overly ambiguous stems
- Hedging language only in distractors ("may", "could") while correct answer uses definitive language

QUESTION TYPES:
- Easy: Direct recall — "Qual é o principal objetivo de..."
- Medium: Applied scenario with clear answer, 2-5 sentence stem
- Hard: Complex scenario, 4-10 sentence stem, all options partially correct but one is best

Existing questions (DO NOT DUPLICATE concepts or stems):
${existingSection}

Output ONLY the JSON object. No markdown fences, no explanation outside JSON.`;
}

/**
 * Build the user prompt (simple trigger).
 */
export function buildUserPrompt(count: number, domain: DomainMeta, lang: string = 'en'): string {
    const langNote = lang !== 'en' ? ` Write all content in ${LANG_NAMES[lang] || lang}.` : '';
    return `Generate ${count} high-quality ${domain.certName} exam questions for Domain ${domain.domainNumber}: ${domain.domainName}. Follow ALL rules in the system prompt.${langNote} Output valid JSON only.`;
}

/**
 * Load existing question texts from batch files in a cert/domain directory.
 * Used for deduplication context in the prompt.
 */
export function loadExistingQuestionTexts(certSlug: string, domain: DomainMeta): string[] {
    const dirName = `domain-${domain.domainNumber}-${domain.domainId}`;
    const dirPath = path.resolve(__dirname, '..', certSlug, dirName);

    if (!fs.existsSync(dirPath)) return [];

    const texts: string[] = [];
    const files = fs.readdirSync(dirPath).filter(
        f => f.endsWith('.json') && !f.includes('.example.') && !f.includes('.validation-') && !f.includes('.duplicate-')
    );

    for (const file of files) {
        try {
            const batch = JSON.parse(fs.readFileSync(path.join(dirPath, file), 'utf-8'));
            if (batch?.questions && Array.isArray(batch.questions)) {
                for (const q of batch.questions) {
                    if (q.text) texts.push(q.text);
                }
            }
        } catch {
            // Skip malformed files
        }
    }

    return texts;
}

// ── AI Domain Discovery (for unknown certs) ──────

async function discoverCertDomains(certInput: string, client: AIClient): Promise<CertInfo> {
    const prompt = `You are an expert on professional certifications and exams.

I need the FULL domain structure for the following certification/exam/topic:
"${certInput}"

Return a JSON object with this EXACT schema:
{
  "slug": "lowercase-hyphenated-short-id",
  "name": "Full Official Name of the Certification",
  "issuer": "Issuing Organization",
  "domains": [
    {
      "id": "short-id",
      "number": 1,
      "name": "Domain Full Name",
      "weight": "XX%",
      "topics": ["topic 1", "topic 2", "topic 3", "..."]
    }
  ]
}

Rules:
- Use the REAL, OFFICIAL exam domains from the latest version of this certification
- If it's not a real certification but a general topic, create logical domains/areas
- Each domain must have 3-8 key topics
- slug must be lowercase, letters and hyphens only
- domain id must be a short 2-4 letter abbreviation

Output ONLY the JSON. No markdown, no explanation.`;

    const result = await client.chatJSON<CertInfo>([
        { role: 'user', content: prompt },
    ]);

    const cert = result.data;

    // Basic validation
    if (!cert.slug || !cert.name || !Array.isArray(cert.domains) || cert.domains.length === 0) {
        throw new Error('AI returned invalid cert structure. Try again or use a more specific cert name.');
    }

    console.log(`   ✅ Discovered: ${cert.name} (${cert.issuer})`);
    console.log(`   📚 ${cert.domains.length} domains:`);
    for (const d of cert.domains) {
        console.log(`      ${d.number}. ${d.name} (${d.weight}) — ${d.topics.length} topics`);
    }

    return cert;
}

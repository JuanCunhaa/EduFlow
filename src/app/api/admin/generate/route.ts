/**
 * POST /api/admin/generate
 * AI question generator for the admin panel.
 *
 * Two modes:
 *   1. Existing study → studyId + optional domainId
 *   2. Free-form topic → topic string → AI discovers domains → auto-creates study
 *
 * Returns generated questions for PREVIEW — does NOT auto-import.
 * Use POST /api/admin/generate/import to import approved questions.
 *
 * Features:
 *   - Hardcoded cert data for known exams (CISSP, CC, SSCP, CCSP, Security+, ENEM, etc.)
 *   - Deduplication: loads existing questions and sends as context
 *   - Thorough validation with hallucination/bias detection
 *   - Auto markdown stripping
 *
 * Admin-only endpoint.
 */

import { NextResponse } from 'next/server';
import { withAdmin, type RouteContext } from '@/lib/api-middleware';
import { getAdminDb } from '@/lib/firebase/admin';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';

export const maxDuration = 120; // 2 minutes max execution time for AI generation

import { type GeneratedQuestion } from '@/lib/generator-utils';


// ── Input schema ──

const bodySchema = z
  .object({
    // Mode 1: existing study
    studyId: z.string().min(1).optional(),
    domainId: z.string().optional(),
    // Mode 2: free-form topic
    topic: z.string().min(2).max(200).optional(),
    // Shared
    count: z.number().int().min(1).max(30).default(5),
    model: z.string().default('gpt-4o-mini'),
    lang: z.string().default('en'),
  })
  .refine((d) => d.studyId || d.topic, {
    message: 'Either studyId or topic is required',
  });

// ── Types ──

interface DomainInfo {
  id: string;
  name: string;
  weight?: string;
  topics?: string[];
}

interface StudyContext {
  studyId: string;
  studyName: string;
  issuer: string;
  domains: DomainInfo[];
  isNewStudy: boolean;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ── Constants ──

const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const BIAS_TERMS = [
  'always',
  'never',
  'impossible',
  'guaranteed',
  'obviously',
  'clearly',
  'simply',
];
const FAKE_NIST_NUMBERS = [
  '800-12',
  '800-14',
  '800-16',
  '800-18',
  '800-22',
  '800-24',
  '800-26',
  '800-29',
  '800-31',
  '800-33',
  '800-91',
  '800-95',
  '800-99',
  '800-101',
  '800-102',
  '800-150',
  '800-175A',
];

const LANG_NAMES: Record<string, string> = {
  en: 'English',
  'pt-BR': 'Brazilian Portuguese (Português Brasileiro)',
  es: 'Spanish (Español)',
  fr: 'French (Français)',
  de: 'German (Deutsch)',
};

const SECURITY_ISSUERS = [
  'ISC2',
  'CompTIA',
  'ISACA',
  'EC-Council',
  'SANS',
  'AWS',
  'Microsoft',
  'Google',
  'Cisco',
];

// ── Hardcoded cert data (from CLI prompt-builder.ts) ──
// Provides rich domain info with weights and topics for known exams.
// The admin generator merges this with Firestore data for better prompts.

interface KnownCertInfo {
  slug: string;
  name: string;
  issuer: string;
  domains: Array<{
    id: string;
    name: string;
    weight: string;
    topics: string[];
  }>;
}

const KNOWN_CERTS: Record<string, KnownCertInfo> = {
  cissp: {
    slug: 'cissp',
    name: 'CISSP (Certified Information Systems Security Professional)',
    issuer: 'ISC2',
    domains: [
      {
        id: 'sam',
        name: 'Security and Risk Management',
        weight: '15%',
        topics: [
          'CIA triad',
          'security governance',
          'compliance',
          'legal & regulatory',
          'professional ethics',
          'BCP',
          'risk management',
          'threat modeling',
          'supply chain risk',
          'security awareness',
        ],
      },
      {
        id: 'as',
        name: 'Asset Security',
        weight: '10%',
        topics: [
          'data classification',
          'data ownership',
          'privacy protection',
          'asset retention',
          'data security controls',
          'data handling requirements',
        ],
      },
      {
        id: 'se',
        name: 'Security Architecture and Engineering',
        weight: '13%',
        topics: [
          'security models',
          'security evaluation',
          'secure design patterns',
          'cryptography',
          'site & facility security',
          'physical security',
        ],
      },
      {
        id: 'cns',
        name: 'Communication and Network Security',
        weight: '13%',
        topics: [
          'network models',
          'IP networking',
          'wireless security',
          'network protocols',
          'network attacks',
          'network security devices',
        ],
      },
      {
        id: 'iam',
        name: 'Identity and Access Management',
        weight: '13%',
        topics: [
          'physical & logical access',
          'identification & authentication',
          'identity as a service',
          'authorization mechanisms',
          'access control attacks',
          'identity lifecycle',
        ],
      },
      {
        id: 'sa',
        name: 'Security Assessment and Testing',
        weight: '12%',
        topics: [
          'vulnerability assessment',
          'penetration testing',
          'log reviews',
          'SOC reports',
          'security audits',
          'KPIs & metrics',
        ],
      },
      {
        id: 'so',
        name: 'Security Operations',
        weight: '13%',
        topics: [
          'investigation types',
          'evidence handling',
          'incident management',
          'disaster recovery',
          'business continuity',
          'change management',
          'physical security operations',
        ],
      },
      {
        id: 'ssd',
        name: 'Software Development Security',
        weight: '11%',
        topics: [
          'SDLC',
          'development methodologies',
          'maturity models',
          'secure coding',
          'code review',
          'software testing',
          'API security',
          'DevSecOps',
        ],
      },
    ],
  },
  cc: {
    slug: 'cc',
    name: 'CC (Certified in Cybersecurity)',
    issuer: 'ISC2',
    domains: [
      {
        id: 'sp',
        name: 'Security Principles',
        weight: '26%',
        topics: [
          'CIA triad',
          'authentication',
          'non-repudiation',
          'privacy',
          'governance',
          'risk management',
          'compliance',
        ],
      },
      {
        id: 'bc',
        name: 'Business Continuity, Disaster Recovery & Incident Response',
        weight: '10%',
        topics: ['BCP', 'DRP', 'incident response', 'backup strategies'],
      },
      {
        id: 'ac',
        name: 'Access Controls Concepts',
        weight: '22%',
        topics: [
          'access control models',
          'RBAC',
          'MAC',
          'DAC',
          'least privilege',
          'segregation of duties',
        ],
      },
      {
        id: 'ns',
        name: 'Network Security',
        weight: '24%',
        topics: [
          'OSI model',
          'TCP/IP',
          'ports & protocols',
          'firewalls',
          'IDS/IPS',
          'VPN',
          'wireless security',
        ],
      },
      {
        id: 'so',
        name: 'Security Operations',
        weight: '18%',
        topics: [
          'data handling',
          'logging & monitoring',
          'encryption',
          'hardening',
          'security policies',
          'awareness training',
        ],
      },
    ],
  },
  sscp: {
    slug: 'sscp',
    name: 'SSCP (Systems Security Certified Practitioner)',
    issuer: 'ISC2',
    domains: [
      {
        id: 'sao',
        name: 'Security Operations and Administration',
        weight: '16%',
        topics: [
          'security concepts',
          'asset management',
          'change management',
          'security awareness',
        ],
      },
      {
        id: 'ac',
        name: 'Access Controls',
        weight: '15%',
        topics: [
          'access control models',
          'authentication methods',
          'internetwork trust',
          'identity management',
        ],
      },
      {
        id: 'ria',
        name: 'Risk Identification, Monitoring, and Analysis',
        weight: '15%',
        topics: [
          'risk management',
          'vulnerability assessment',
          'security monitoring',
          'risk frameworks',
        ],
      },
      {
        id: 'ir',
        name: 'Incident Response and Recovery',
        weight: '14%',
        topics: ['incident handling', 'forensic investigation', 'BCP', 'DRP'],
      },
      {
        id: 'cry',
        name: 'Cryptography',
        weight: '9%',
        topics: [
          'symmetric/asymmetric encryption',
          'hashing',
          'PKI',
          'digital signatures',
          'key management',
        ],
      },
      {
        id: 'ns',
        name: 'Network and Communications Security',
        weight: '16%',
        topics: [
          'network fundamentals',
          'wireless security',
          'network attacks',
          'network access control',
        ],
      },
      {
        id: 'sse',
        name: 'Systems and Application Security',
        weight: '15%',
        topics: [
          'malware',
          'endpoint protection',
          'cloud security',
          'secure SDLC',
          'virtual environments',
        ],
      },
    ],
  },
  ccsp: {
    slug: 'ccsp',
    name: 'CCSP (Certified Cloud Security Professional)',
    issuer: 'ISC2',
    domains: [
      {
        id: 'cc',
        name: 'Cloud Concepts, Architecture and Design',
        weight: '17%',
        topics: [
          'cloud computing concepts',
          'cloud reference architecture',
          'cloud security concepts',
          'design principles',
        ],
      },
      {
        id: 'cds',
        name: 'Cloud Data Security',
        weight: '20%',
        topics: [
          'cloud data lifecycle',
          'data classification',
          'data privacy',
          'data rights management',
          'data retention',
        ],
      },
      {
        id: 'cps',
        name: 'Cloud Platform & Infrastructure Security',
        weight: '17%',
        topics: [
          'cloud infrastructure',
          'risk assessment',
          'virtualization security',
          'countermeasures',
          'BCP/DRP',
        ],
      },
      {
        id: 'cas',
        name: 'Cloud Application Security',
        weight: '17%',
        topics: [
          'application security threats',
          'SDLC',
          'application assurance',
          'identity federation',
        ],
      },
      {
        id: 'co',
        name: 'Cloud Security Operations',
        weight: '16%',
        topics: [
          'physical & logical infrastructure',
          'operational controls',
          'digital forensics',
          'communication',
        ],
      },
      {
        id: 'lr',
        name: 'Legal, Risk and Compliance',
        weight: '13%',
        topics: [
          'legal requirements',
          'privacy issues',
          'audit processes',
          'risk management',
          'outsourcing',
        ],
      },
    ],
  },
  'security+': {
    slug: 'security-plus',
    name: 'CompTIA Security+ (SY0-701)',
    issuer: 'CompTIA',
    domains: [
      {
        id: 'gc',
        name: 'General Security Concepts',
        weight: '12%',
        topics: [
          'security controls',
          'CIA triad',
          'authentication',
          'authorization',
          'zero trust',
          'gap analysis',
        ],
      },
      {
        id: 'ta',
        name: 'Threats, Vulnerabilities, and Mitigations',
        weight: '22%',
        topics: [
          'threat actors',
          'attack surfaces',
          'social engineering',
          'malware',
          'cryptographic attacks',
          'indicators of compromise',
        ],
      },
      {
        id: 'sa',
        name: 'Security Architecture',
        weight: '18%',
        topics: [
          'architecture models',
          'infrastructure concepts',
          'secure communication',
          'cloud security',
          'virtualization',
          'IoT security',
          'ICS/SCADA',
        ],
      },
      {
        id: 'so',
        name: 'Security Operations',
        weight: '28%',
        topics: [
          'monitoring',
          'vulnerability management',
          'incident response',
          'digital forensics',
          'automation',
          'logging',
          'alerting',
        ],
      },
      {
        id: 'pm',
        name: 'Security Program Management and Oversight',
        weight: '20%',
        topics: [
          'governance',
          'risk management',
          'compliance',
          'security policies',
          'awareness programs',
          'audits',
        ],
      },
    ],
  },
  enem: {
    slug: 'enem',
    name: 'Exame Nacional do Ensino Médio',
    issuer: 'INEP',
    domains: [
      {
        id: 'ling',
        name: 'Linguagens, Códigos e suas Tecnologias',
        weight: '25%',
        topics: [
          'Língua Portuguesa',
          'Literatura',
          'Língua Estrangeira',
          'Artes',
          'Educação Física',
          'Tecnologias da Informação',
        ],
      },
      {
        id: 'mat',
        name: 'Matemática e suas Tecnologias',
        weight: '25%',
        topics: [
          'Números e Operações',
          'Geometria',
          'Álgebra',
          'Análise de Dados',
          'Raciocínio Lógico',
        ],
      },
      {
        id: 'ci1',
        name: 'Ciências da Natureza e suas Tecnologias',
        weight: '25%',
        topics: ['Biologia', 'Química', 'Física', 'Ciências Ambientais'],
      },
      {
        id: 'ci2',
        name: 'Ciências Humanas e suas Tecnologias',
        weight: '25%',
        topics: ['História', 'Geografia', 'Filosofia', 'Sociologia'],
      },
    ],
  },
  'network+': {
    slug: 'network-plus',
    name: 'CompTIA Network+ (N10-009)',
    issuer: 'CompTIA',
    domains: [
      {
        id: 'nf',
        name: 'Networking Fundamentals',
        weight: '24%',
        topics: [
          'OSI model',
          'TCP/IP',
          'IP addressing',
          'subnetting',
          'ports & protocols',
          'network topologies',
        ],
      },
      {
        id: 'ni',
        name: 'Network Implementation',
        weight: '19%',
        topics: [
          'routing',
          'switching',
          'wireless',
          'WAN technologies',
          'network services',
        ],
      },
      {
        id: 'no',
        name: 'Network Operations',
        weight: '16%',
        topics: [
          'monitoring',
          'documentation',
          'business continuity',
          'disaster recovery',
        ],
      },
      {
        id: 'ns',
        name: 'Network Security',
        weight: '19%',
        topics: [
          'security concepts',
          'network attacks',
          'hardening',
          'remote access',
        ],
      },
      {
        id: 'nt',
        name: 'Network Troubleshooting',
        weight: '22%',
        topics: [
          'troubleshooting methodology',
          'cable connectivity',
          'network performance',
          'common issues',
        ],
      },
    ],
  },
  'a+': {
    slug: 'a-plus',
    name: 'CompTIA A+ (220-1101 & 220-1102)',
    issuer: 'CompTIA',
    domains: [
      {
        id: 'mh',
        name: 'Mobile Devices, Hardware & Networking',
        weight: '30%',
        topics: [
          'mobile devices',
          'hardware',
          'networking',
          'printers',
          'virtualization',
          'cloud computing',
        ],
      },
      {
        id: 'os',
        name: 'Operating Systems',
        weight: '27%',
        topics: [
          'Windows',
          'macOS',
          'Linux',
          'installation',
          'command line',
          'features',
        ],
      },
      {
        id: 'st',
        name: 'Security & Troubleshooting',
        weight: '25%',
        topics: [
          'security threats',
          'security best practices',
          'troubleshooting methodology',
          'hardware troubleshooting',
        ],
      },
      {
        id: 'op',
        name: 'Operational Procedures',
        weight: '18%',
        topics: [
          'documentation',
          'change management',
          'disaster recovery',
          'scripting',
          'remote access',
          'professionalism',
        ],
      },
    ],
  },
  cisa: {
    slug: 'cisa',
    name: 'CISA (Certified Information Systems Auditor)',
    issuer: 'ISACA',
    domains: [
      {
        id: 'isp',
        name: 'Information Systems Auditing Process',
        weight: '18%',
        topics: [
          'audit planning',
          'audit execution',
          'audit governance',
          'reporting',
          'follow-up',
        ],
      },
      {
        id: 'git',
        name: 'Governance and Management of IT',
        weight: '18%',
        topics: [
          'IT governance',
          'IT management frameworks',
          'IT resource management',
          'IT service management',
          'quality assurance',
        ],
      },
      {
        id: 'isd',
        name: 'Information Systems Acquisition, Development and Implementation',
        weight: '12%',
        topics: [
          'project governance',
          'project management',
          'IS development methodologies',
          'IS maintenance',
        ],
      },
      {
        id: 'iso',
        name: 'Information Systems Operations and Business Resilience',
        weight: '26%',
        topics: [
          'IS operations',
          'hardware',
          'IS architecture',
          'data governance',
          'BCP/DRP',
        ],
      },
      {
        id: 'pia',
        name: 'Protection of Information Assets',
        weight: '26%',
        topics: [
          'security frameworks',
          'access control',
          'network security',
          'data classification',
          'physical security',
          'encryption',
        ],
      },
    ],
  },
  cism: {
    slug: 'cism',
    name: 'CISM (Certified Information Security Manager)',
    issuer: 'ISACA',
    domains: [
      {
        id: 'isg',
        name: 'Information Security Governance',
        weight: '17%',
        topics: [
          'governance framework',
          'security strategy',
          'governance metrics',
          'resource management',
        ],
      },
      {
        id: 'irm',
        name: 'Information Risk Management',
        weight: '20%',
        topics: [
          'risk identification',
          'risk assessment',
          'risk response',
          'risk monitoring',
          'risk reporting',
        ],
      },
      {
        id: 'isdm',
        name: 'Information Security Program Development and Management',
        weight: '33%',
        topics: [
          'program development',
          'program management',
          'program resources',
          'security architectures',
        ],
      },
      {
        id: 'isim',
        name: 'Information Security Incident Management',
        weight: '30%',
        topics: [
          'incident classification',
          'incident management',
          'investigation',
          'response planning',
          'recovery',
        ],
      },
    ],
  },
  'aws-saa': {
    slug: 'aws-saa',
    name: 'AWS Solutions Architect Associate (SAA-C03)',
    issuer: 'AWS',
    domains: [
      {
        id: 'sra',
        name: 'Design Secure Architectures',
        weight: '30%',
        topics: [
          'IAM',
          'VPC',
          'security groups',
          'NACLs',
          'encryption',
          'AWS Organizations',
          'WAF',
          'Shield',
        ],
      },
      {
        id: 'hra',
        name: 'Design Resilient Architectures',
        weight: '26%',
        topics: [
          'multi-tier architectures',
          'high availability',
          'fault tolerance',
          'decoupling',
          'auto scaling',
          'disaster recovery',
        ],
      },
      {
        id: 'hpa',
        name: 'Design High-Performing Architectures',
        weight: '24%',
        topics: [
          'compute',
          'storage',
          'databases',
          'networking',
          'caching',
          'content delivery',
        ],
      },
      {
        id: 'coa',
        name: 'Design Cost-Optimized Architectures',
        weight: '20%',
        topics: [
          'cost-effective resources',
          'pricing models',
          'reserved instances',
          'spot instances',
          'storage tiering',
        ],
      },
    ],
  },
  'az-900': {
    slug: 'az-900',
    name: 'Microsoft Azure Fundamentals (AZ-900)',
    issuer: 'Microsoft',
    domains: [
      {
        id: 'cc',
        name: 'Cloud Concepts',
        weight: '25%',
        topics: [
          'cloud computing benefits',
          'service types (IaaS, PaaS, SaaS)',
          'cloud models (public, private, hybrid)',
        ],
      },
      {
        id: 'aa',
        name: 'Azure Architecture and Services',
        weight: '35%',
        topics: [
          'core resources',
          'compute',
          'networking',
          'storage',
          'identity & security',
          'governance',
        ],
      },
      {
        id: 'am',
        name: 'Azure Management and Governance',
        weight: '30%',
        topics: [
          'cost management',
          'governance tools',
          'monitoring',
          'Azure Resource Manager',
          'Azure Arc',
        ],
      },
      {
        id: 'as',
        name: 'Azure Security',
        weight: '10%',
        topics: ['Azure AD', 'MFA', 'RBAC', 'Azure Policy', 'network security'],
      },
    ],
  },
};

// Aliases for flexible topic matching
const CERT_ALIASES: Record<string, string> = {
  cissp: 'cissp',
  cc: 'cc',
  sscp: 'sscp',
  ccsp: 'ccsp',
  'security+': 'security+',
  securityplus: 'security+',
  'sec+': 'security+',
  'comptia security+': 'security+',
  'sy0-701': 'security+',
  'network+': 'network+',
  networkplus: 'network+',
  'net+': 'network+',
  'n10-009': 'network+',
  'a+': 'a+',
  aplus: 'a+',
  'comptia a+': 'a+',
  enem: 'enem',
  cisa: 'cisa',
  cism: 'cism',
  'aws saa': 'aws-saa',
  'aws solutions architect': 'aws-saa',
  'saa-c03': 'aws-saa',
  'az-900': 'az-900',
  'azure fundamentals': 'az-900',
};

// ── Thorough validation (ported from CLI question-validator.ts) ──

function validateQuestion(
  q: GeneratedQuestion,
  index: number
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const prefix = `Q${index + 1}`;

  if (!q.text || typeof q.text !== 'string') {
    errors.push(`${prefix}: Missing or invalid text`);
    return { valid: false, errors, warnings };
  }
  if (q.text.length < 20) {
    errors.push(`${prefix}: Stem too short (${q.text.length} chars, min 20)`);
  }
  if (/\*\*[^*]+\*\*/.test(q.text)) {
    warnings.push(`${prefix}: Stem contains **bold** markdown`);
  }

  if (!Array.isArray(q.options) || q.options.length !== 4) {
    errors.push(`${prefix}: Must have exactly 4 options`);
  } else {
    const optionTexts = q.options.map((o) => o.text?.toLowerCase().trim());
    if (new Set(optionTexts).size < 4) {
      errors.push(`${prefix}: Duplicate option text detected`);
    }
    for (let i = 0; i < q.options.length; i++) {
      if (!q.options[i].text || q.options[i].text.trim().length < 2) {
        errors.push(
          `${prefix}: Option ${q.options[i].label || i} is empty or too short`
        );
      }
    }
    for (const opt of q.options) {
      const lower = opt.text?.toLowerCase() || '';
      if (
        lower.includes('all of the above') ||
        lower.includes('none of the above')
      ) {
        errors.push(`${prefix}: Contains "all/none of the above"`);
      }
    }
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

  if (
    typeof q.correctOptionIndex !== 'number' ||
    q.correctOptionIndex < 0 ||
    q.correctOptionIndex > 3
  ) {
    errors.push(`${prefix}: correctOptionIndex must be 0–3`);
  }
  if (!VALID_DIFFICULTIES.has(q.difficulty)) {
    errors.push(`${prefix}: Invalid difficulty "${q.difficulty}"`);
  }
  if (!Array.isArray(q.domainIds) || q.domainIds.length === 0) {
    errors.push(`${prefix}: domainIds must be a non-empty array`);
  }

  if (!q.explanation?.short) {
    errors.push(`${prefix}: Missing explanation.short`);
  } else {
    const sentences = q.explanation.short
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 5);
    if (sentences.length < 2) {
      errors.push(
        `${prefix}: Explanation needs 2+ sentences, got ${sentences.length}`
      );
    }
  }

  if (
    !q.explanation?.whyOthersWrong ||
    typeof q.explanation.whyOthersWrong !== 'object'
  ) {
    errors.push(`${prefix}: Missing whyOthersWrong`);
  } else {
    const labels = ['A', 'B', 'C', 'D'];
    const correctLabel = labels[q.correctOptionIndex];
    for (const label of labels) {
      if (label !== correctLabel && !q.explanation.whyOthersWrong[label]) {
        errors.push(
          `${prefix}: whyOthersWrong missing entry for option ${label}`
        );
      }
    }
  }

  const fullText = `${q.text} ${q.explanation?.short || ''}`;
  for (const fake of FAKE_NIST_NUMBERS) {
    if (fullText.includes(`SP ${fake}`)) {
      warnings.push(`${prefix}: Possibly fabricated NIST SP ${fake}`);
    }
  }
  for (const term of BIAS_TERMS) {
    const regex = new RegExp(`\\b${term}\\b`, 'i');
    if (regex.test(q.text)) {
      warnings.push(`${prefix}: Stem contains bias term "${term}"`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ── Post-process: strip markdown from text ──

function cleanQuestion(q: GeneratedQuestion): GeneratedQuestion {
  const strip = (s: string) =>
    s.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1');
  return {
    ...q,
    text: strip(q.text),
    options: q.options.map((o) => ({ ...o, text: strip(o.text) })),
    explanation: {
      ...q.explanation,
      short: strip(q.explanation.short || ''),
      examTip: q.explanation.examTip ? strip(q.explanation.examTip) : undefined,
    },
  };
}

// ── Deduplication: load existing question stems ──

async function loadExistingQuestions(
  db: FirebaseFirestore.Firestore,
  studyId: string,
  domainId?: string
): Promise<string[]> {
  let query: FirebaseFirestore.Query = db
    .collection('marketplace_questions')
    .where('studyId', '==', studyId)
    .where('isActive', '==', true);

  if (domainId) {
    query = query.where('domainIds', 'array-contains', domainId);
  }

  // Limit to 100 most recent to avoid huge context
  query = query.orderBy('createdAt', 'desc').limit(100);

  const snap = await query.get();
  return snap.docs.map((d) => {
    const data = d.data();
    return (data.text || '').slice(0, 120);
  });
}

// ── Enrich domains with hardcoded cert data ──

function enrichDomains(
  studyName: string,
  firestoreDomains: DomainInfo[]
): { domains: DomainInfo[]; issuer: string } {
  const normalized = studyName.toLowerCase().trim();

  // Try alias match
  const aliasKey = CERT_ALIASES[normalized];
  const cert = aliasKey ? KNOWN_CERTS[aliasKey] : undefined;

  // Try fuzzy match on cert name
  if (!cert) {
    for (const c of Object.values(KNOWN_CERTS)) {
      if (
        normalized.includes(c.slug) ||
        c.name.toLowerCase().includes(normalized)
      ) {
        return { domains: c.domains, issuer: c.issuer };
      }
    }
  }

  if (cert) {
    return { domains: cert.domains, issuer: cert.issuer };
  }

  // Fallback: use Firestore domains as-is
  return { domains: firestoreDomains, issuer: 'Unknown' };
}

// ── Build production-grade prompt ──

function buildSystemPrompt(
  studyName: string,
  issuer: string,
  domains: DomainInfo[],
  targetDomainId: string | undefined,
  count: number,
  lang: string,
  existingQuestions: string[]
): string {
  const targetDomain = targetDomainId
    ? domains.find((d) => d.id === targetDomainId)
    : null;

  const domainContext = domains
    .map((d) => {
      const weight = d.weight ? ` (${d.weight})` : '';
      const topics = d.topics?.length
        ? ` — Topics: ${d.topics.join(', ')}`
        : '';
      return `  • ${d.id}: ${d.name}${weight}${topics}`;
    })
    .join('\n');

  const focusInstruction = targetDomain
    ? `Focus ALL questions on domain "${targetDomain.name}" (${targetDomain.id}).`
    : `Spread questions across ALL domains listed above — cover maximum breadth.`;

  const langInstruction =
    lang !== 'en'
      ? `\n\nLANGUAGE REQUIREMENT (CRITICAL):
All question text, options, explanations, whyOthersWrong, and examTip MUST be written in ${LANG_NAMES[lang] || lang}.
Keep technical terms, acronyms, and well-known proper names in their original form.
The JSON keys (text, options, label, etc.) stay in English — only the VALUES are translated.`
      : '';

  const isSecurityCert = SECURITY_ISSUERS.some((s) => issuer.includes(s));
  const referencesSection = isSecurityCert
    ? `\nReferences to cite in explanations (use REAL ones only):
- NIST SP 800-53, SP 800-61, SP 800-37, SP 800-175B, SP 800-30, SP 800-171
- ISO 27001/27002, ISO 27005, ISO 27017/27018, ISO 31000
- GDPR, HIPAA, SOX, PCI DSS, FERPA, GLBA
- ISC2 CBK, CompTIA exam objectives, COBIT, ITIL
- CSA CCM, OWASP Top 10, CIS Controls, MITRE ATT&CK`
    : `\nReferences to cite in explanations:
- Use REAL, well-known academic references, textbooks, laws, or official sources relevant to ${studyName}
- Cite specific authors, theories, laws, or frameworks when applicable
- Do NOT invent fake references or publication numbers`;

  // Deduplication context
  const dedupSection =
    existingQuestions.length > 0
      ? `\n\nEXISTING QUESTIONS (DO NOT REPEAT THESE — generate entirely new questions):
${existingQuestions.map((t, i) => `  ${i + 1}. ${t}...`).join('\n')}`
      : '';

  const easyCount = Math.round(count * 0.2);
  const mediumCount = Math.round(count * 0.5);
  const hardCount = count - easyCount - mediumCount;

  return `You are an expert exam question author for "${studyName}" (${issuer}).${langInstruction}

Available domains:
${domainContext}

${focusInstruction}

Use your training knowledge of this exam's official content to generate high-quality questions.

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
    "domainIds": ["domain-id"],
    "tags": ["topic-tag"]
  }
]}

RULES (ALL MANDATORY):
1. Generate exactly ${count} questions
2. 4 options per question, labeled A–D
3. Difficulty distribution: ~${easyCount} easy, ~${mediumCount} medium, ~${hardCount} hard
4. explanation.short: 2+ complete sentences, must cite a REAL source
5. whyOthersWrong: one entry for EACH incorrect option (skip the correct letter), 1–3 sentences each
6. examTip: REQUIRED — a practical, actionable study/exam tip
7. PLAIN TEXT ONLY: Do NOT use markdown, bold (**), italic (*), caps-lock emphasis, or any formatting in question text, options, or explanations. Write naturally.
8. tags: lowercase, hyphenated topic tags (at least 1)
9. domainIds: use domain IDs from the list above
10. correctOptionIndex: distribute evenly across 0,1,2,3. Never cluster in one position.
${referencesSection}

QUALITY REQUIREMENTS:
- OPTION LENGTH: All 4 options MUST be similar length (±20% character count). The correct answer must NOT be systematically longer than distractors.
- DISTRACTOR QUALITY: Wrong options must be plausible real concepts from the subject, never absurd.
- No "All of the above" or "None of the above"
- No questions answerable without reading options
- No two options that are effectively the same concept
- No trick questions or overly ambiguous stems
- No hedging language only in distractors ("may", "could") while correct answer uses definitive language

QUESTION TYPES:
- Easy: Direct recall — "What is the primary objective of..."
- Medium: Applied scenario with clear answer, 2-5 sentence stem
- Hard: Complex scenario, 4-10 sentence stem, all options partially correct but one is best
${dedupSection}

Output ONLY the JSON object. No markdown fences, no explanation outside JSON.`;
}

// ── AI domain discovery for free-form topics ──

interface DiscoveredCert {
  slug: string;
  name: string;
  issuer: string;
  description: string;
  domains: Array<{
    id: string;
    name: string;
    weight: string;
    topics: string[];
  }>;
}

async function discoverDomains(
  apiKey: string,
  model: string,
  topic: string
): Promise<DiscoveredCert> {
  // Try known certs first
  const normalized = topic.toLowerCase().trim();
  const aliasKey = CERT_ALIASES[normalized];
  if (aliasKey && KNOWN_CERTS[aliasKey]) {
    const cert = KNOWN_CERTS[aliasKey];
    return {
      ...cert,
      description: `Official ${cert.name} certification exam by ${cert.issuer}`,
    };
  }

  // Fuzzy match
  for (const cert of Object.values(KNOWN_CERTS)) {
    if (
      normalized.includes(cert.slug) ||
      cert.name.toLowerCase().includes(normalized)
    ) {
      return {
        ...cert,
        description: `Official ${cert.name} certification exam by ${cert.issuer}`,
      };
    }
  }

  // Unknown — ask AI
  const prompt = `You are an expert on professional certifications and exams.

I need the FULL domain structure for the following certification/exam/topic:
"${topic}"

Return a JSON object with this EXACT schema:
{
  "slug": "lowercase-hyphenated-short-id",
  "name": "Full Official Name of the Certification or Exam",
  "issuer": "Issuing Organization",
  "description": "A 1-2 sentence description",
  "domains": [
    {
      "id": "short-id",
      "name": "Domain Full Name",
      "weight": "XX%",
      "topics": ["topic 1", "topic 2", "topic 3"]
    }
  ]
}

Rules:
- Use the REAL, OFFICIAL exam domains from the latest version
- If not a real certification, create logical domains/areas
- Each domain must have 3-8 key topics
- slug must be lowercase, letters and hyphens only
- domain id must be a short 2-4 letter lowercase abbreviation

Output ONLY the JSON. No markdown, no explanation.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(
      `OpenAI error during domain discovery (${response.status}): ${err}`
    );
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content)
    throw new Error('Empty response from OpenAI during domain discovery');

  const cert = JSON.parse(content) as DiscoveredCert;
  if (
    !cert.slug ||
    !cert.name ||
    !Array.isArray(cert.domains) ||
    cert.domains.length === 0
  ) {
    throw new Error('AI returned invalid structure. Try a more specific name.');
  }

  return cert;
}

// ── OpenAI question generation ──

async function generateWithOpenAI(
  apiKey: string,
  model: string,
  studyName: string,
  issuer: string,
  domains: DomainInfo[],
  targetDomainId: string | undefined,
  count: number,
  lang: string,
  existingQuestions: string[]
): Promise<GeneratedQuestion[]> {
  const systemPrompt = buildSystemPrompt(
    studyName,
    issuer,
    domains,
    targetDomainId,
    count,
    lang,
    existingQuestions
  );

  const langNote =
    lang !== 'en' ? ` Write all content in ${LANG_NAMES[lang] || lang}.` : '';
  const userPrompt = `Generate ${count} high-quality "${studyName}" exam questions. Follow ALL rules in the system prompt.${langNote} Output valid JSON only.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from OpenAI');

  const parsed = JSON.parse(content);
  return parsed.questions || [];
}

// ── Auto-create marketplace study from discovered cert ──

async function autoCreateStudy(
  db: FirebaseFirestore.Firestore,
  cert: DiscoveredCert,
  adminUid: string
): Promise<string> {
  const now = FieldValue.serverTimestamp();
  const docRef = db.collection('marketplace_studies').doc();

  await docRef.set({
    abbreviation: cert.slug.toUpperCase().slice(0, 20),
    name: cert.name,
    description: cert.description || `Auto-generated study for ${cert.name}`,
    domains: cert.domains.map((d, i) => ({
      id: d.id,
      name: d.name,
      order: i,
    })),
    questionCount: 0,
    domainQuestionCounts: {},
    importCount: 0,
    tags: [],
    isActive: true,
    createdAt: now,
    updatedAt: now,
    createdBy: adminUid,
  });

  return docRef.id;
}

// ── Handler: Generate (preview only — does NOT import) ──

export const POST = withAdmin(
  async (request: Request, { user, log }: RouteContext) => {
    const body = await request.json();
    const parsed = bodySchema.parse(body);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY not configured on server' },
        { status: 500 }
      );
    }

    const db = getAdminDb();
    let ctx: StudyContext;

    // ── Resolve study context ──

    if (parsed.studyId) {
      const studySnap = await db
        .collection('marketplace_studies')
        .doc(parsed.studyId)
        .get();
      if (!studySnap.exists) {
        return NextResponse.json({ error: 'Study not found' }, { status: 404 });
      }
      const study = studySnap.data()!;
      const firestoreDomains: DomainInfo[] = study.domains || [];

      // Enrich with hardcoded cert data if available
      const enriched = enrichDomains(study.name || '', firestoreDomains);

      ctx = {
        studyId: parsed.studyId,
        studyName: study.name || 'Unknown Study',
        issuer:
          enriched.issuer !== 'Unknown'
            ? enriched.issuer
            : study.issuer || study.createdBy || 'Unknown',
        domains:
          enriched.domains.length > 0 ? enriched.domains : firestoreDomains,
        isNewStudy: false,
      };

      if (
        parsed.domainId &&
        !ctx.domains.some((d) => d.id === parsed.domainId)
      ) {
        return NextResponse.json(
          { error: `Domain "${parsed.domainId}" not found in study` },
          { status: 400 }
        );
      }
    } else {
      log.info('Discovering domains for topic', {
        meta: { topic: parsed.topic },
      });
      const cert = await discoverDomains(apiKey, parsed.model, parsed.topic!);
      const studyId = await autoCreateStudy(db, cert, user.uid);

      ctx = {
        studyId,
        studyName: cert.name,
        issuer: cert.issuer,
        domains: cert.domains,
        isNewStudy: true,
      };
    }

    // ── Load existing questions for deduplication ──
    const existingQuestions = await loadExistingQuestions(
      db,
      ctx.studyId,
      parsed.domainId
    );

    log.info('Admin generate start', {
      meta: {
        studyId: ctx.studyId,
        studyName: ctx.studyName,
        count: parsed.count,
        model: parsed.model,
        mode: parsed.studyId ? 'existing' : 'freeform',
        existingQuestionsCount: existingQuestions.length,
      },
    });

    // ── Generate questions ──
    const rawQuestions = await generateWithOpenAI(
      apiKey,
      parsed.model,
      ctx.studyName,
      ctx.issuer,
      ctx.domains,
      parsed.domainId,
      parsed.count,
      parsed.lang,
      existingQuestions
    );

    // ── Clean + validate ──
    const cleanedQuestions = rawQuestions.map(cleanQuestion);

    const validationResults = cleanedQuestions.map((q, i) => ({
      question: q,
      validation: validateQuestion(q, i),
    }));

    const validQuestions = validationResults
      .filter((r) => r.validation.valid)
      .map((r) => r.question);
    const allWarnings = validationResults.flatMap((r) => r.validation.warnings);
    const allErrors = validationResults.flatMap((r) => r.validation.errors);

    log.info('Admin generate complete (preview)', {
      meta: {
        generated: rawQuestions.length,
        valid: validQuestions.length,
        invalid: cleanedQuestions.length - validQuestions.length,
      },
    });

    // Return questions for PREVIEW — client must call /import to persist
    return {
      questions: validQuestions,
      generated: rawQuestions.length,
      valid: validQuestions.length,
      invalid: cleanedQuestions.length - validQuestions.length,
      model: parsed.model,
      studyId: ctx.studyId,
      studyName: ctx.studyName,
      isNewStudy: ctx.isNewStudy,
      warnings: allWarnings,
      errors: allErrors,
    };
  }
);

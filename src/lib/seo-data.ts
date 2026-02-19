/**
 * SEO slug registry — single source of truth for all public SEO pages.
 * Maps URL slugs → cert/domain metadata used by (seo) route group templates.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CertSeoData {
    slug: string;
    name: string;
    abbreviation: string;
    metaTitle: string;
    metaDescription: string;
    examDetails: {
        duration: string;
        questions: string;
        format: string;
        passingScore: string;
        cost: string;
        prerequisites: string;
    };
    domains: DomainSeoData[];
    faqItems: FaqItem[];
}

export interface DomainSeoData {
    slug: string;
    name: string;
    domainNumber: number;
    examWeight: string;
    metaTitle: string;
    metaDescription: string;
    keyTopics: string[];
}

export interface FaqItem {
    question: string;
    answer: string;
}

/* ------------------------------------------------------------------ */
/*  CISSP                                                              */
/* ------------------------------------------------------------------ */

const CISSP: CertSeoData = {
    slug: 'cissp',
    name: 'Certified Information Systems Security Professional',
    abbreviation: 'CISSP',
    metaTitle: 'CISSP Practice Questions & Study Guide 2026',
    metaDescription:
        'Free CISSP practice exam questions covering all 8 domains. Adaptive exams, spaced repetition, and performance analytics to pass the CISSP on your first attempt.',
    examDetails: {
        duration: '3 hours',
        questions: '100–150 (CAT)',
        format: 'Computerized Adaptive Testing',
        passingScore: '700 / 1000',
        cost: '$749 USD',
        prerequisites: '5 years cumulative paid experience in 2+ of 8 domains',
    },
    domains: [
        {
            slug: 'domain-1-security-and-risk-management',
            name: 'Security and Risk Management',
            domainNumber: 1,
            examWeight: '16%',
            metaTitle: 'CISSP Domain 1: Security and Risk Management',
            metaDescription:
                'Study guide for CISSP Domain 1 – Security and Risk Management. Key concepts, exam weight (16%), sample questions, and study tips.',
            keyTopics: [
                'Security governance principles',
                'Risk management frameworks (NIST, ISO 27001)',
                'Security policies and procedures',
                'Business continuity requirements',
                'Personnel security',
                'Threat modeling (STRIDE, DREAD, PASTA)',
                'Supply chain risk management',
            ],
        },
        {
            slug: 'domain-2-asset-security',
            name: 'Asset Security',
            domainNumber: 2,
            examWeight: '10%',
            metaTitle: 'CISSP Domain 2: Asset Security',
            metaDescription:
                'Study guide for CISSP Domain 2 – Asset Security. Data classification, ownership, privacy protection, and retention policies.',
            keyTopics: [
                'Information and asset classification',
                'Data ownership and roles',
                'Privacy protection',
                'Asset retention and destruction',
                'Data security controls',
                'Data handling requirements',
            ],
        },
        {
            slug: 'domain-3-security-architecture-and-engineering',
            name: 'Security Architecture and Engineering',
            domainNumber: 3,
            examWeight: '13%',
            metaTitle: 'CISSP Domain 3: Security Architecture and Engineering',
            metaDescription:
                'Study guide for CISSP Domain 3 – Security Architecture and Engineering. Secure design principles, cryptography, and physical security.',
            keyTopics: [
                'Secure design principles',
                'Security models (Bell-LaPadula, Biba, Clark-Wilson)',
                'Cryptography concepts and techniques',
                'Site and facility security',
                'Vulnerabilities in web-based systems',
                'Cloud and IoT security considerations',
            ],
        },
        {
            slug: 'domain-4-communication-and-network-security',
            name: 'Communication and Network Security',
            domainNumber: 4,
            examWeight: '13%',
            metaTitle: 'CISSP Domain 4: Communication and Network Security',
            metaDescription:
                'Study guide for CISSP Domain 4 – Communication and Network Security. Network architecture, protocols, and secure communication channels.',
            keyTopics: [
                'OSI and TCP/IP models',
                'Secure network architecture',
                'Network protocols and services',
                'Wireless security',
                'VPN and remote access',
                'Network attacks and countermeasures',
            ],
        },
        {
            slug: 'domain-5-identity-and-access-management',
            name: 'Identity and Access Management',
            domainNumber: 5,
            examWeight: '13%',
            metaTitle: 'CISSP Domain 5: Identity and Access Management (IAM)',
            metaDescription:
                'Study guide for CISSP Domain 5 – Identity and Access Management. Authentication, authorization, identity federation, and access control models.',
            keyTopics: [
                'Physical and logical access control',
                'Authentication and identity management',
                'Identity as a Service (IDaaS)',
                'Access control attacks and countermeasures',
                'Identity and access provisioning lifecycle',
                'Federated identity management',
            ],
        },
        {
            slug: 'domain-6-security-assessment-and-testing',
            name: 'Security Assessment and Testing',
            domainNumber: 6,
            examWeight: '12%',
            metaTitle: 'CISSP Domain 6: Security Assessment and Testing',
            metaDescription:
                'Study guide for CISSP Domain 6 – Security Assessment and Testing. Vulnerability assessment, penetration testing, audits, and security metrics.',
            keyTopics: [
                'Assessment and test strategies',
                'Security process data collection',
                'Internal and external audits',
                'Vulnerability assessment and penetration testing',
                'Log reviews and management',
                'Security metrics and KPIs',
            ],
        },
        {
            slug: 'domain-7-security-operations',
            name: 'Security Operations',
            domainNumber: 7,
            examWeight: '13%',
            metaTitle: 'CISSP Domain 7: Security Operations',
            metaDescription:
                'Study guide for CISSP Domain 7 – Security Operations. Incident management, disaster recovery, forensics, and change management.',
            keyTopics: [
                'Incident management and response',
                'Disaster recovery planning',
                'Business continuity operations',
                'Digital forensics',
                'Change and configuration management',
                'Physical security operations',
            ],
        },
        {
            slug: 'domain-8-software-development-security',
            name: 'Software Development Security',
            domainNumber: 8,
            examWeight: '10%',
            metaTitle: 'CISSP Domain 8: Software Development Security',
            metaDescription:
                'Study guide for CISSP Domain 8 – Software Development Security. SDLC security, code review, application vulnerabilities, and DevSecOps.',
            keyTopics: [
                'Secure software development lifecycle (SDLC)',
                'Software development methodologies',
                'Application security controls',
                'Software vulnerabilities (OWASP Top 10)',
                'Code review and testing',
                'DevSecOps integration',
            ],
        },
    ],
    faqItems: [
        {
            question: 'How many domains does the CISSP exam cover?',
            answer:
                'The CISSP exam covers 8 domains: Security and Risk Management, Asset Security, Security Architecture and Engineering, Communication and Network Security, Identity and Access Management, Security Assessment and Testing, Security Operations, and Software Development Security.',
        },
        {
            question: 'How long should I study for CISSP?',
            answer:
                'Most candidates study for 3 to 6 months, depending on their experience level. A typical study plan allocates 2-3 hours per day with focused practice on weak domains.',
        },
        {
            question: 'What is the CISSP CAT format?',
            answer:
                'CISSP uses Computerized Adaptive Testing (CAT). The exam adjusts question difficulty based on your performance. You will answer between 100 and 150 questions in 3 hours.',
        },
        {
            question: 'Is CISSP the hardest cybersecurity certification?',
            answer:
                'CISSP is considered one of the most challenging cybersecurity certifications due to its breadth covering 8 domains and the 5-year experience requirement. However, with structured study and practice, it is very achievable.',
        },
        {
            question: "What's the pass rate for CISSP?",
            answer:
                'ISC2 does not publish official pass rates. Industry estimates suggest a first-attempt pass rate of around 50-60%. Using adaptive practice exams and focusing on weak domains significantly improves your chances.',
        },
        {
            question: 'How much does the CISSP exam cost?',
            answer:
                'The CISSP exam costs $749 USD. There are no free retakes — if you fail, you must pay the full fee again, making thorough preparation essential.',
        },
    ],
};

/* ------------------------------------------------------------------ */
/*  CC (Certified in Cybersecurity)                                    */
/* ------------------------------------------------------------------ */

const CC: CertSeoData = {
    slug: 'cc',
    name: 'Certified in Cybersecurity',
    abbreviation: 'CC',
    metaTitle: 'CC Practice Questions & Study Guide 2026',
    metaDescription:
        'Free ISC2 CC practice exam questions covering all 5 domains. The entry-level cybersecurity certification — no experience required.',
    examDetails: {
        duration: '2 hours',
        questions: '100',
        format: 'Linear',
        passingScore: '700 / 1000',
        cost: 'Free (ISC2 member benefit)',
        prerequisites: 'None — entry-level certification',
    },
    domains: [
        {
            slug: 'domain-1-security-principles',
            name: 'Security Principles',
            domainNumber: 1,
            examWeight: '26%',
            metaTitle: 'CC Domain 1: Security Principles',
            metaDescription: 'Study guide for ISC2 CC Domain 1 – Security Principles. CIA triad, authentication, authorization, and security concepts.',
            keyTopics: ['CIA triad', 'Authentication and authorization', 'Non-repudiation', 'Privacy', 'Security governance', 'Risk management basics'],
        },
        {
            slug: 'domain-2-business-continuity',
            name: 'Business Continuity, Disaster Recovery & Incident Response',
            domainNumber: 2,
            examWeight: '10%',
            metaTitle: 'CC Domain 2: Business Continuity & DR',
            metaDescription: 'Study guide for ISC2 CC Domain 2 – Business Continuity, Disaster Recovery, and Incident Response concepts.',
            keyTopics: ['Business continuity planning', 'Disaster recovery', 'Incident response process', 'Backup strategies', 'Recovery objectives (RTO/RPO)'],
        },
        {
            slug: 'domain-3-access-controls',
            name: 'Access Controls Concepts',
            domainNumber: 3,
            examWeight: '22%',
            metaTitle: 'CC Domain 3: Access Controls Concepts',
            metaDescription: 'Study guide for ISC2 CC Domain 3 – Access Controls. Physical and logical access, role-based access control, and least privilege.',
            keyTopics: ['Physical access controls', 'Logical access controls', 'Role-based access control', 'Least privilege principle', 'Segregation of duties'],
        },
        {
            slug: 'domain-4-network-security',
            name: 'Network Security',
            domainNumber: 4,
            examWeight: '24%',
            metaTitle: 'CC Domain 4: Network Security',
            metaDescription: 'Study guide for ISC2 CC Domain 4 – Network Security. Networking concepts, firewalls, VPNs, and wireless security.',
            keyTopics: ['Network fundamentals', 'Network threats and attacks', 'Network security infrastructure', 'Firewalls and IDS/IPS', 'Wireless security'],
        },
        {
            slug: 'domain-5-security-operations',
            name: 'Security Operations',
            domainNumber: 5,
            examWeight: '18%',
            metaTitle: 'CC Domain 5: Security Operations',
            metaDescription: 'Study guide for ISC2 CC Domain 5 – Security Operations. Data security, system hardening, and security policies.',
            keyTopics: ['Data security and encryption', 'System hardening', 'Security policies and procedures', 'Security awareness training', 'Physical security'],
        },
    ],
    faqItems: [
        { question: 'What is the ISC2 CC certification?', answer: 'The Certified in Cybersecurity (CC) is ISC2\'s entry-level certification. It requires no prior experience and covers 5 foundational security domains.' },
        { question: 'Is the CC exam free?', answer: 'Yes, ISC2 currently offers the CC exam and training at no cost as part of their "One Million Certified in Cybersecurity" initiative.' },
        { question: 'How long should I study for CC?', answer: 'Most candidates study for 2 to 4 weeks. The CC is designed for beginners, so the content is more accessible than CISSP or SSCP.' },
    ],
};

/* ------------------------------------------------------------------ */
/*  SSCP                                                               */
/* ------------------------------------------------------------------ */

const SSCP: CertSeoData = {
    slug: 'sscp',
    name: 'Systems Security Certified Practitioner',
    abbreviation: 'SSCP',
    metaTitle: 'SSCP Practice Questions & Study Guide 2026',
    metaDescription:
        'Free ISC2 SSCP practice exam questions covering all 7 domains. Hands-on security operations certification.',
    examDetails: {
        duration: '3 hours',
        questions: '125',
        format: 'Linear',
        passingScore: '700 / 1000',
        cost: '$249 USD',
        prerequisites: '1 year cumulative paid work experience in 1+ of 7 domains',
    },
    domains: [
        { slug: 'domain-1-security-operations-and-administration', name: 'Security Operations and Administration', domainNumber: 1, examWeight: '16%', metaTitle: 'SSCP Domain 1: Security Operations and Administration', metaDescription: 'Study guide for SSCP Domain 1 – Security Operations and Administration.', keyTopics: ['Security administration', 'Security operations concepts', 'Asset management', 'Change management'] },
        { slug: 'domain-2-access-controls', name: 'Access Controls', domainNumber: 2, examWeight: '15%', metaTitle: 'SSCP Domain 2: Access Controls', metaDescription: 'Study guide for SSCP Domain 2 – Access Controls.', keyTopics: ['Access control models', 'Authentication mechanisms', 'Trust architectures', 'Identity management'] },
        { slug: 'domain-3-risk-identification-monitoring-and-analysis', name: 'Risk Identification, Monitoring, and Analysis', domainNumber: 3, examWeight: '15%', metaTitle: 'SSCP Domain 3: Risk Identification, Monitoring, and Analysis', metaDescription: 'Study guide for SSCP Domain 3 – Risk Identification, Monitoring, and Analysis.', keyTopics: ['Risk management', 'Security assessment', 'Vulnerability management', 'Security monitoring'] },
        { slug: 'domain-4-incident-response-and-recovery', name: 'Incident Response and Recovery', domainNumber: 4, examWeight: '14%', metaTitle: 'SSCP Domain 4: Incident Response and Recovery', metaDescription: 'Study guide for SSCP Domain 4 – Incident Response and Recovery.', keyTopics: ['Incident handling', 'Forensics support', 'Business continuity', 'Disaster recovery'] },
        { slug: 'domain-5-cryptography', name: 'Cryptography', domainNumber: 5, examWeight: '9%', metaTitle: 'SSCP Domain 5: Cryptography', metaDescription: 'Study guide for SSCP Domain 5 – Cryptography.', keyTopics: ['Cryptographic concepts', 'Symmetric and asymmetric encryption', 'PKI', 'Hash functions', 'Digital signatures'] },
        { slug: 'domain-6-network-and-communications-security', name: 'Network and Communications Security', domainNumber: 6, examWeight: '16%', metaTitle: 'SSCP Domain 6: Network and Communications Security', metaDescription: 'Study guide for SSCP Domain 6 – Network and Communications Security.', keyTopics: ['Network fundamentals', 'Network protocols', 'Network attacks', 'Wireless security', 'VPN technologies'] },
        { slug: 'domain-7-systems-and-application-security', name: 'Systems and Application Security', domainNumber: 7, examWeight: '15%', metaTitle: 'SSCP Domain 7: Systems and Application Security', metaDescription: 'Study guide for SSCP Domain 7 – Systems and Application Security.', keyTopics: ['Malware protection', 'Endpoint security', 'Cloud security', 'Secure SDLC', 'Virtual environments'] },
    ],
    faqItems: [
        { question: 'What is the SSCP certification?', answer: 'The SSCP is an ISC2 certification for hands-on security practitioners. It covers 7 domains and requires 1 year of experience.' },
        { question: 'How does SSCP compare to CISSP?', answer: 'SSCP is more technical and hands-on, while CISSP is broader and more managerial. SSCP requires 1 year experience vs 5 years for CISSP.' },
    ],
};

/* ------------------------------------------------------------------ */
/*  CCSP                                                               */
/* ------------------------------------------------------------------ */

const CCSP: CertSeoData = {
    slug: 'ccsp',
    name: 'Certified Cloud Security Professional',
    abbreviation: 'CCSP',
    metaTitle: 'CCSP Practice Questions & Study Guide 2026',
    metaDescription:
        'Free ISC2 CCSP practice exam questions covering all 6 domains. Cloud security certification for experienced professionals.',
    examDetails: {
        duration: '4 hours',
        questions: '150',
        format: 'Linear',
        passingScore: '700 / 1000',
        cost: '$599 USD',
        prerequisites: '5 years IT experience, 3 years in information security, 1 year in cloud security',
    },
    domains: [
        { slug: 'domain-1-cloud-concepts-architecture-and-design', name: 'Cloud Concepts, Architecture and Design', domainNumber: 1, examWeight: '17%', metaTitle: 'CCSP Domain 1: Cloud Concepts, Architecture and Design', metaDescription: 'Study guide for CCSP Domain 1 – Cloud Concepts, Architecture and Design.', keyTopics: ['Cloud computing concepts', 'Cloud reference architecture', 'Security concepts for cloud', 'Design principles', 'Cloud service models'] },
        { slug: 'domain-2-cloud-data-security', name: 'Cloud Data Security', domainNumber: 2, examWeight: '20%', metaTitle: 'CCSP Domain 2: Cloud Data Security', metaDescription: 'Study guide for CCSP Domain 2 – Cloud Data Security.', keyTopics: ['Data lifecycle', 'Cloud data storage architectures', 'Data security strategies', 'Data discovery', 'Data rights management'] },
        { slug: 'domain-3-cloud-platform-and-infrastructure-security', name: 'Cloud Platform and Infrastructure Security', domainNumber: 3, examWeight: '17%', metaTitle: 'CCSP Domain 3: Cloud Platform and Infrastructure Security', metaDescription: 'Study guide for CCSP Domain 3 – Cloud Platform and Infrastructure Security.', keyTopics: ['Cloud infrastructure components', 'Cloud infrastructure risk', 'Security controls', 'Disaster recovery', 'Business continuity'] },
        { slug: 'domain-4-cloud-application-security', name: 'Cloud Application Security', domainNumber: 4, examWeight: '17%', metaTitle: 'CCSP Domain 4: Cloud Application Security', metaDescription: 'Study guide for CCSP Domain 4 – Cloud Application Security.', keyTopics: ['Application security in cloud', 'Secure SDLC', 'Identity and access management', 'Application security testing'] },
        { slug: 'domain-5-cloud-security-operations', name: 'Cloud Security Operations', domainNumber: 5, examWeight: '17%', metaTitle: 'CCSP Domain 5: Cloud Security Operations', metaDescription: 'Study guide for CCSP Domain 5 – Cloud Security Operations.', keyTopics: ['Infrastructure operations', 'Logical operations', 'Communication operations', 'Incident management'] },
        { slug: 'domain-6-legal-risk-and-compliance', name: 'Legal, Risk and Compliance', domainNumber: 6, examWeight: '12%', metaTitle: 'CCSP Domain 6: Legal, Risk and Compliance', metaDescription: 'Study guide for CCSP Domain 6 – Legal, Risk and Compliance.', keyTopics: ['Legal requirements', 'Privacy issues', 'Audit processes', 'Cloud compliance frameworks', 'Risk management'] },
    ],
    faqItems: [
        { question: 'What is the CCSP certification?', answer: 'The CCSP is an ISC2 certification focused on cloud security. It covers 6 domains and is designed for experienced security professionals working with cloud environments.' },
        { question: 'Is CCSP harder than CISSP?', answer: 'CCSP is more focused on cloud-specific topics while CISSP is broader. Many professionals find CCSP easier if they have cloud experience, but harder if their background is in traditional IT security.' },
    ],
};

/* ------------------------------------------------------------------ */
/*  CGRC                                                               */
/* ------------------------------------------------------------------ */

const CGRC: CertSeoData = {
    slug: 'cgrc',
    name: 'Certified in Governance, Risk and Compliance',
    abbreviation: 'CGRC',
    metaTitle: 'CGRC Practice Questions & Study Guide 2026',
    metaDescription:
        'Free ISC2 CGRC practice exam questions covering all 7 domains. Governance, risk management, and compliance certification.',
    examDetails: {
        duration: '3 hours',
        questions: '125',
        format: 'Linear',
        passingScore: '700 / 1000',
        cost: '$599 USD',
        prerequisites: '2 years cumulative paid experience in 1+ of 7 domains',
    },
    domains: [
        { slug: 'domain-1-information-security-risk-management-program', name: 'Information Security Risk Management Program', domainNumber: 1, examWeight: '16%', metaTitle: 'CGRC Domain 1: Information Security Risk Management Program', metaDescription: 'Study guide for CGRC Domain 1 – Information Security Risk Management Program.', keyTopics: ['Risk management program', 'Risk framework', 'Security requirements', 'Risk management activities'] },
        { slug: 'domain-2-scope-of-the-information-system', name: 'Scope of the Information System', domainNumber: 2, examWeight: '11%', metaTitle: 'CGRC Domain 2: Scope of the Information System', metaDescription: 'Study guide for CGRC Domain 2 – Scope of the Information System.', keyTopics: ['System boundaries', 'System categorization', 'Information types', 'System architecture'] },
        { slug: 'domain-3-selection-and-approval-of-controls', name: 'Selection and Approval of Controls', domainNumber: 3, examWeight: '15%', metaTitle: 'CGRC Domain 3: Selection and Approval of Controls', metaDescription: 'Study guide for CGRC Domain 3 – Selection and Approval of Controls.', keyTopics: ['Control selection', 'Control baselines', 'Compensating controls', 'Control documentation'] },
        { slug: 'domain-4-implementation-of-controls', name: 'Implementation of Controls', domainNumber: 4, examWeight: '15%', metaTitle: 'CGRC Domain 4: Implementation of Controls', metaDescription: 'Study guide for CGRC Domain 4 – Implementation of Controls.', keyTopics: ['Control implementation', 'Security documentation', 'Implementation evidence', 'Control configuration'] },
        { slug: 'domain-5-assessment-audit-of-controls', name: 'Assessment/Audit of Controls', domainNumber: 5, examWeight: '16%', metaTitle: 'CGRC Domain 5: Assessment/Audit of Controls', metaDescription: 'Study guide for CGRC Domain 5 – Assessment/Audit of Controls.', keyTopics: ['Assessment planning', 'Assessment methods', 'Audit procedures', 'Assessment reporting'] },
        { slug: 'domain-6-authorization-approval-of-information-system', name: 'Authorization/Approval of Information System', domainNumber: 6, examWeight: '13%', metaTitle: 'CGRC Domain 6: Authorization/Approval of Information System', metaDescription: 'Study guide for CGRC Domain 6 – Authorization/Approval of Information System.', keyTopics: ['Authorization process', 'Risk determination', 'Authorization decisions', 'Ongoing authorization'] },
        { slug: 'domain-7-continuous-monitoring', name: 'Continuous Monitoring', domainNumber: 7, examWeight: '14%', metaTitle: 'CGRC Domain 7: Continuous Monitoring', metaDescription: 'Study guide for CGRC Domain 7 – Continuous Monitoring.', keyTopics: ['Monitoring strategy', 'Control effectiveness', 'Change monitoring', 'Reporting and documentation'] },
    ],
    faqItems: [
        { question: 'What is the CGRC certification?', answer: 'The CGRC (formerly CAP) is an ISC2 certification for professionals who authorize and maintain information systems with a focus on governance, risk, and compliance frameworks.' },
        { question: 'What is the difference between CGRC and CISSP?', answer: 'CGRC is focused on GRC (governance, risk, and compliance) while CISSP is a broad cybersecurity management certification. CGRC requires 2 years experience vs 5 for CISSP.' },
    ],
};

/* ------------------------------------------------------------------ */
/*  Exports                                                            */
/* ------------------------------------------------------------------ */

/** All certifications in display order. */
export const CERTS: CertSeoData[] = [CISSP, CC, SSCP, CCSP, CGRC];

/** Look up a cert by its URL slug. Returns undefined if not found. */
export function getCertBySlug(slug: string): CertSeoData | undefined {
    return CERTS.find((c) => c.slug === slug);
}

/** Look up a domain within a cert by its URL slug. */
export function getDomainBySlug(certSlug: string, domainSlug: string): DomainSeoData | undefined {
    const cert = getCertBySlug(certSlug);
    return cert?.domains.find((d) => d.slug === domainSlug);
}

/** All cert slugs — used by generateStaticParams. */
export function getAllCertSlugs(): string[] {
    return CERTS.map((c) => c.slug);
}

/** All cert+domain slug pairs — used by generateStaticParams. */
export function getAllDomainParams(): Array<{ cert: string; domain: string }> {
    return CERTS.flatMap((cert) =>
        cert.domains.map((domain) => ({
            cert: cert.slug,
            domain: domain.slug,
        })),
    );
}

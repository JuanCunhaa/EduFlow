/**
 * POST /api/admin/generate/bulk
 *
 * Generates a large number of questions for a known cert or existing study
 * by running multiple AI batches in parallel (up to 5 concurrent).
 *
 * Auto-imports questions directly into the marketplace without preview step.
 *
 * Body:
 *   certSlug    — one of the KNOWN_CERTS keys OR a studyId
 *   studyId     — (optional) use an existing marketplace study instead of certSlug
 *   totalCount  — total questions to generate (1–2000)
 *   batchSize   — questions per OpenAI call (default 25, max 30)
 *   concurrency — parallel calls (default 5, max 8)
 *   lang        — "en" | "pt-BR" | etc.
 *   model       — openai model (default "gpt-4o-mini")
 *   autoImport  — if true, imports directly; if false, returns preview only
 *   domainId    — optional: restrict to one domain
 *
 * Returns:
 *   { generated, imported, failed, skipped, batches, durationMs }
 *
 * Admin-only.
 */

import { withAdmin, type RouteContext } from '@/lib/api-middleware';
import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { NextResponse } from 'next/server';

// ── Schema ──

const bodySchema = z.object({
    certSlug: z.string().optional(),
    studyId: z.string().optional(),
    totalCount: z.number().int().min(1).max(2000).default(100),
    batchSize: z.number().int().min(5).max(30).default(25),
    concurrency: z.number().int().min(1).max(8).default(5),
    lang: z.string().default('en'),
    model: z.string().default('gpt-4o-mini'),
    autoImport: z.boolean().default(true),
    domainId: z.string().optional(),
}).refine((d) => d.certSlug || d.studyId, {
    message: 'Either certSlug or studyId is required',
});

// ── Known certs registry (mirrors generate/route.ts, kept in sync) ──
// Lightweight version: just slug → name + issuer + domains for prompt building.

interface CertDomain { id: string; name: string; weight?: string; topics?: string[] }
interface CertInfo { name: string; issuer: string; domains: CertDomain[] }

const CERT_CATALOG: Record<string, CertInfo> = {
    // ── ISC2 ──
    cissp: {
        name: 'CISSP (Certified Information Systems Security Professional)',
        issuer: 'ISC2',
        domains: [
            { id: 'sam', name: 'Security and Risk Management', weight: '15%' },
            { id: 'as', name: 'Asset Security', weight: '10%' },
            { id: 'se', name: 'Security Architecture and Engineering', weight: '13%' },
            { id: 'cns', name: 'Communication and Network Security', weight: '13%' },
            { id: 'iam', name: 'Identity and Access Management', weight: '13%' },
            { id: 'sa', name: 'Security Assessment and Testing', weight: '12%' },
            { id: 'so', name: 'Security Operations', weight: '13%' },
            { id: 'ssd', name: 'Software Development Security', weight: '11%' },
        ],
    },
    cc: {
        name: 'CC (Certified in Cybersecurity)',
        issuer: 'ISC2',
        domains: [
            { id: 'sp', name: 'Security Principles', weight: '26%' },
            { id: 'bc', name: 'Business Continuity, DR & Incident Response', weight: '10%' },
            { id: 'ac', name: 'Access Controls Concepts', weight: '22%' },
            { id: 'ns', name: 'Network Security', weight: '24%' },
            { id: 'so', name: 'Security Operations', weight: '18%' },
        ],
    },
    sscp: {
        name: 'SSCP (Systems Security Certified Practitioner)',
        issuer: 'ISC2',
        domains: [
            { id: 'sao', name: 'Security Operations and Administration', weight: '16%' },
            { id: 'ac', name: 'Access Controls', weight: '15%' },
            { id: 'ria', name: 'Risk Identification, Monitoring, and Analysis', weight: '15%' },
            { id: 'ir', name: 'Incident Response and Recovery', weight: '14%' },
            { id: 'cry', name: 'Cryptography', weight: '9%' },
            { id: 'ns', name: 'Network and Communications Security', weight: '16%' },
            { id: 'sse', name: 'Systems and Application Security', weight: '15%' },
        ],
    },
    ccsp: {
        name: 'CCSP (Certified Cloud Security Professional)',
        issuer: 'ISC2',
        domains: [
            { id: 'cc', name: 'Cloud Concepts, Architecture and Design', weight: '17%' },
            { id: 'cds', name: 'Cloud Data Security', weight: '20%' },
            { id: 'cps', name: 'Cloud Platform & Infrastructure Security', weight: '17%' },
            { id: 'cas', name: 'Cloud Application Security', weight: '17%' },
            { id: 'co', name: 'Cloud Security Operations', weight: '16%' },
            { id: 'lr', name: 'Legal, Risk and Compliance', weight: '13%' },
        ],
    },
    cgrc: {
        name: 'CGRC (Certified in Governance, Risk and Compliance)',
        issuer: 'ISC2',
        domains: [
            { id: 'is', name: 'Information Security Risk Management Program', weight: '16%' },
            { id: 'sc', name: 'Scope of the Information System', weight: '11%' },
            { id: 'sg', name: 'Selection and Approval of Security and Privacy Controls', weight: '15%' },
            { id: 'si', name: 'Implementation of Security and Privacy Controls', weight: '16%' },
            { id: 'as', name: 'Assessment/Audit of Security and Privacy Controls', weight: '15%' },
            { id: 'ar', name: 'Authorization/Approval of Information System', weight: '10%' },
            { id: 'cm', name: 'Continuous Monitoring', weight: '17%' },
        ],
    },
    hcispp: {
        name: 'HCISPP (HealthCare Information Security and Privacy Practitioner)',
        issuer: 'ISC2',
        domains: [
            { id: 'hc', name: 'Healthcare Industry', weight: '12%' },
            { id: 'ir', name: 'Information Governance in Healthcare', weight: '12%' },
            { id: 'tf', name: 'Information Technologies in Healthcare', weight: '12%' },
            { id: 'rr', name: 'Regulatory and Standards Environment', weight: '15%' },
            { id: 'pp', name: 'Privacy and Security in Healthcare', weight: '22%' },
            { id: 'rm', name: 'Risk Management and Risk Assessment', weight: '17%' },
            { id: 'tpc', name: 'Third-Party Management', weight: '10%' },
        ],
    },
    // ── CompTIA ──
    'security+': {
        name: 'CompTIA Security+ (SY0-701)',
        issuer: 'CompTIA',
        domains: [
            { id: 'gc', name: 'General Security Concepts', weight: '12%' },
            { id: 'ta', name: 'Threats, Vulnerabilities, and Mitigations', weight: '22%' },
            { id: 'sa', name: 'Security Architecture', weight: '18%' },
            { id: 'so', name: 'Security Operations', weight: '28%' },
            { id: 'pm', name: 'Security Program Management and Oversight', weight: '20%' },
        ],
    },
    'network+': {
        name: 'CompTIA Network+ (N10-009)',
        issuer: 'CompTIA',
        domains: [
            { id: 'nf', name: 'Networking Fundamentals', weight: '24%' },
            { id: 'ni', name: 'Network Implementation', weight: '19%' },
            { id: 'no', name: 'Network Operations', weight: '16%' },
            { id: 'ns', name: 'Network Security', weight: '19%' },
            { id: 'nt', name: 'Network Troubleshooting', weight: '22%' },
        ],
    },
    'a+': {
        name: 'CompTIA A+ (220-1101 & 220-1102)',
        issuer: 'CompTIA',
        domains: [
            { id: 'mh', name: 'Mobile Devices, Hardware & Networking', weight: '30%' },
            { id: 'os', name: 'Operating Systems', weight: '27%' },
            { id: 'st', name: 'Security & Troubleshooting', weight: '25%' },
            { id: 'op', name: 'Operational Procedures', weight: '18%' },
        ],
    },
    'linux+': {
        name: 'CompTIA Linux+ (XK0-005)',
        issuer: 'CompTIA',
        domains: [
            { id: 'sa', name: 'System Management', weight: '32%' },
            { id: 'sc', name: 'Security', weight: '21%' },
            { id: 'str', name: 'Scripting, Containers & Automation', weight: '19%' },
            { id: 'ts', name: 'Troubleshooting', weight: '28%' },
        ],
    },
    'cloud+': {
        name: 'CompTIA Cloud+ (CV0-004)',
        issuer: 'CompTIA',
        domains: [
            { id: 'cc', name: 'Cloud Architecture and Design', weight: '13%' },
            { id: 'ds', name: 'Data Center Infrastructure', weight: '10%' },
            { id: 'ms', name: 'Storage Solutions', weight: '11%' },
            { id: 'ni', name: 'Network Infrastructure', weight: '11%' },
            { id: 'si', name: 'Security', weight: '22%' },
            { id: 'mig', name: 'Cloud Migration', weight: '10%' },
            { id: 'ts', name: 'Troubleshooting', weight: '23%' },
        ],
    },
    'cysa+': {
        name: 'CompTIA CySA+ (CS0-003)',
        issuer: 'CompTIA',
        domains: [
            { id: 'sm', name: 'Security Operations', weight: '33%' },
            { id: 'vam', name: 'Vulnerability Management', weight: '30%' },
            { id: 'ir', name: 'Incident Response Management', weight: '20%' },
            { id: 'rc', name: 'Reporting and Communication', weight: '17%' },
        ],
    },
    'pentest+': {
        name: 'CompTIA PenTest+ (PT0-003)',
        issuer: 'CompTIA',
        domains: [
            { id: 'pp', name: 'Engagement Management', weight: '22%' },
            { id: 'ra', name: 'Reconnaissance and Enumeration', weight: '18%' },
            { id: 'av', name: 'Attacks and Exploits', weight: '30%' },
            { id: 'rp', name: 'Reporting and Communication', weight: '16%' },
            { id: 'to', name: 'Tools and Code Analysis', weight: '14%' },
        ],
    },
    'casp+': {
        name: 'CompTIA CASP+ (CAS-003)',
        issuer: 'CompTIA',
        domains: [
            { id: 'se', name: 'Security Engineering', weight: '29%' },
            { id: 'so', name: 'Security Operations', weight: '30%' },
            { id: 'gcrc', name: 'Governance, Risk, Compliance', weight: '20%' },
            { id: 'cr', name: 'Cryptography and PKI', weight: '21%' },
        ],
    },
    // ── ISACA ──
    cisa: {
        name: 'CISA (Certified Information Systems Auditor)',
        issuer: 'ISACA',
        domains: [
            { id: 'isp', name: 'Information Systems Auditing Process', weight: '18%' },
            { id: 'git', name: 'Governance and Management of IT', weight: '18%' },
            { id: 'isd', name: 'IS Acquisition, Development and Implementation', weight: '12%' },
            { id: 'iso', name: 'IS Operations and Business Resilience', weight: '26%' },
            { id: 'pia', name: 'Protection of Information Assets', weight: '26%' },
        ],
    },
    cism: {
        name: 'CISM (Certified Information Security Manager)',
        issuer: 'ISACA',
        domains: [
            { id: 'isg', name: 'Information Security Governance', weight: '17%' },
            { id: 'irm', name: 'Information Security Risk Management', weight: '20%' },
            { id: 'isp', name: 'Information Security Program', weight: '33%' },
            { id: 'ii', name: 'Incident Management', weight: '30%' },
        ],
    },
    crisc: {
        name: 'CRISC (Certified in Risk and Information Systems Control)',
        issuer: 'ISACA',
        domains: [
            { id: 'grc', name: 'Governance, Risk, and Control', weight: '26%' },
            { id: 'it', name: 'IT Risk Assessment', weight: '20%' },
            { id: 'rr', name: 'Risk Response and Reporting', weight: '32%' },
            { id: 'ti', name: 'Technology and Security', weight: '22%' },
        ],
    },
    cgeit: {
        name: 'CGEIT (Certified in the Governance of Enterprise IT)',
        issuer: 'ISACA',
        domains: [
            { id: 'gf', name: 'Governance of Enterprise IT Framework', weight: '25%' },
            { id: 'sm', name: 'Strategic Management', weight: '20%' },
            { id: 'bm', name: 'Benefits Realization', weight: '16%' },
            { id: 'ro', name: 'Risk Optimization', weight: '24%' },
            { id: 'ro2', name: 'Resource Optimization', weight: '15%' },
        ],
    },
    // ── EC-Council ──
    ceh: {
        name: 'CEH (Certified Ethical Hacker) v13',
        issuer: 'EC-Council',
        domains: [
            { id: 'ie', name: 'Introduction to Ethical Hacking', weight: '6%' },
            { id: 'fr', name: 'Footprinting and Reconnaissance', weight: '9%' },
            { id: 'se', name: 'Scanning Networks and Enumeration', weight: '9%' },
            { id: 'va', name: 'Vulnerability Analysis', weight: '7%' },
            { id: 'sh', name: 'System Hacking', weight: '12%' },
            { id: 'mal', name: 'Malware Threats', weight: '9%' },
            { id: 'sn', name: 'Sniffing & Social Engineering', weight: '10%' },
            { id: 'wd', name: 'Hacking Web Servers & Web Apps', weight: '11%' },
            { id: 'wl', name: 'Wireless & IoT Hacking', weight: '8%' },
            { id: 'cr', name: 'Cryptography', weight: '9%' },
            { id: 'ch', name: 'Cloud & Session Hijacking', weight: '10%' },
        ],
    },
    chfi: {
        name: 'CHFI (Computer Hacking Forensic Investigator) v11',
        issuer: 'EC-Council',
        domains: [
            { id: 'cf', name: 'Computer Forensics Fundamentals', weight: '10%' },
            { id: 'fi', name: 'Forensics Investigation Process', weight: '12%' },
            { id: 'hdf', name: 'Hard Disk and File Systems Forensics', weight: '15%' },
            { id: 'of', name: 'Operating System Forensics', weight: '15%' },
            { id: 'nf', name: 'Network and Cloud Forensics', weight: '15%' },
            { id: 'mf', name: 'Malware Forensics', weight: '10%' },
            { id: 'wf', name: 'Web Forensics', weight: '8%' },
            { id: 'df', name: 'Database Forensics', weight: '8%' },
            { id: 'ef', name: 'Email and Mobile Forensics', weight: '7%' },
        ],
    },
    // ── AWS ──
    'aws-saa': {
        name: 'AWS Solutions Architect Associate (SAA-C03)',
        issuer: 'Amazon Web Services',
        domains: [
            { id: 'ra', name: 'Design Resilient Architectures', weight: '26%' },
            { id: 'hp', name: 'Design High-Performing Architectures', weight: '24%' },
            { id: 'sa', name: 'Design Secure Applications and Architectures', weight: '30%' },
            { id: 'coa', name: 'Design Cost-Optimized Architectures', weight: '20%' },
        ],
    },
    'aws-dev': {
        name: 'AWS Certified Developer Associate (DVA-C02)',
        issuer: 'Amazon Web Services',
        domains: [
            { id: 'dc', name: 'Development with AWS Services', weight: '32%' },
            { id: 'sc', name: 'Security', weight: '26%' },
            { id: 'di', name: 'Deployment', weight: '24%' },
            { id: 'tr', name: 'Troubleshooting and Optimization', weight: '18%' },
        ],
    },
    'aws-sysops': {
        name: 'AWS SysOps Administrator Associate (SOA-C02)',
        issuer: 'Amazon Web Services',
        domains: [
            { id: 'mo', name: 'Monitoring, Logging, and Remediation', weight: '20%' },
            { id: 'rel', name: 'Reliability and Business Continuity', weight: '16%' },
            { id: 'dep', name: 'Deployment, Provisioning, and Automation', weight: '18%' },
            { id: 'sec', name: 'Security and Compliance', weight: '16%' },
            { id: 'net', name: 'Networking and Content Delivery', weight: '18%' },
            { id: 'co', name: 'Cost and Performance Optimization', weight: '12%' },
        ],
    },
    'aws-security': {
        name: 'AWS Certified Security Specialty (SCS-C02)',
        issuer: 'Amazon Web Services',
        domains: [
            { id: 'ti', name: 'Threat Detection and Incident Response', weight: '14%' },
            { id: 'sl', name: 'Security Logging and Monitoring', weight: '18%' },
            { id: 'im', name: 'Infrastructure Security', weight: '20%' },
            { id: 'iac', name: 'Identity and Access Management', weight: '16%' },
            { id: 'dp', name: 'Data Protection', weight: '18%' },
            { id: 'mp', name: 'Management and Security Governance', weight: '14%' },
        ],
    },
    'aws-cloud-practitioner': {
        name: 'AWS Cloud Practitioner (CLF-C02)',
        issuer: 'Amazon Web Services',
        domains: [
            { id: 'cc', name: 'Cloud Concepts', weight: '24%' },
            { id: 'sc', name: 'Security and Compliance', weight: '30%' },
            { id: 'ct', name: 'Cloud Technology and Services', weight: '34%' },
            { id: 'cb', name: 'Billing, Pricing, and Support', weight: '12%' },
        ],
    },
    // ── Azure ──
    'az-900': {
        name: 'Microsoft Azure Fundamentals (AZ-900)',
        issuer: 'Microsoft',
        domains: [
            { id: 'cc', name: 'Cloud Concepts', weight: '25%' },
            { id: 'aa', name: 'Azure Architecture and Services', weight: '35%' },
            { id: 'am', name: 'Azure Management and Governance', weight: '30%' },
            { id: 'as', name: 'Azure Security', weight: '10%' },
        ],
    },
    'az-104': {
        name: 'Microsoft Azure Administrator (AZ-104)',
        issuer: 'Microsoft',
        domains: [
            { id: 'im', name: 'Manage Azure Identities and Governance', weight: '20-25%' },
            { id: 'str', name: 'Implement and Manage Storage', weight: '15-20%' },
            { id: 'vm', name: 'Deploy and Manage Azure Compute Resources', weight: '20-25%' },
            { id: 'net', name: 'Implement and Manage Virtual Networking', weight: '15-20%' },
            { id: 'mon', name: 'Monitor and Maintain Azure Resources', weight: '10-15%' },
        ],
    },
    'az-204': {
        name: 'Microsoft Azure Developer Associate (AZ-204)',
        issuer: 'Microsoft',
        domains: [
            { id: 'ac', name: 'Develop Azure Compute Solutions', weight: '25-30%' },
            { id: 'as', name: 'Develop for Azure Storage', weight: '15-20%' },
            { id: 'ai', name: 'Implement Azure Security', weight: '20-25%' },
            { id: 'mo', name: 'Monitor, Troubleshoot, and Optimize', weight: '15-20%' },
            { id: 'cs', name: 'Connect to and Consume Azure Services', weight: '15-20%' },
        ],
    },
    'az-305': {
        name: 'Microsoft Azure Solutions Architect Expert (AZ-305)',
        issuer: 'Microsoft',
        domains: [
            { id: 'id', name: 'Design Identity, Governance, and Monitoring', weight: '25-30%' },
            { id: 'ds', name: 'Design Data Storage Solutions', weight: '25-30%' },
            { id: 'bc', name: 'Design Business Continuity Solutions', weight: '10-15%' },
            { id: 'inf', name: 'Design Infrastructure Solutions', weight: '25-30%' },
        ],
    },
    'sc-900': {
        name: 'Microsoft Security, Compliance & Identity Fundamentals (SC-900)',
        issuer: 'Microsoft',
        domains: [
            { id: 'sc', name: 'Security, Compliance, Identity Concepts', weight: '10-15%' },
            { id: 'ms', name: 'Microsoft Entra (Azure AD)', weight: '25-30%' },
            { id: 'df', name: 'Microsoft Defender & Security Solutions', weight: '25-30%' },
            { id: 'pc', name: 'Microsoft Purview Compliance', weight: '25-30%' },
        ],
    },
    'ai-900': {
        name: 'Microsoft Azure AI Fundamentals (AI-900)',
        issuer: 'Microsoft',
        domains: [
            { id: 'ai', name: 'AI and Machine Learning Concepts', weight: '15-20%' },
            { id: 'cv', name: 'Computer Vision Workloads', weight: '15-20%' },
            { id: 'nl', name: 'Natural Language Processing Workloads', weight: '15-20%' },
            { id: 'ga', name: 'Generative AI Workloads', weight: '15-20%' },
            { id: 'sr', name: 'Document Intelligence and Knowledge Mining', weight: '15-20%' },
        ],
    },
    // ── GCP ──
    'gcp-pca': {
        name: 'Google Professional Cloud Architect',
        issuer: 'Google Cloud',
        domains: [
            { id: 'cd', name: 'Designing Cloud Solutions', weight: '30%' },
            { id: 'ma', name: 'Managing and Provisioning Cloud Infrastructure', weight: '26%' },
            { id: 'co', name: 'Designing for Security and Compliance', weight: '22%' },
            { id: 'ao', name: 'Analyzing and Optimizing Technical Processes', weight: '22%' },
        ],
    },
    'gcp-ace': {
        name: 'Google Associate Cloud Engineer',
        issuer: 'Google Cloud',
        domains: [
            { id: 'sp', name: 'Setting Up a Cloud Solution Environment', weight: '20%' },
            { id: 'pi', name: 'Planning and Configuring a Cloud Solution', weight: '15%' },
            { id: 'dc', name: 'Deploying and Implementing a Cloud Solution', weight: '25%' },
            { id: 'sc', name: 'Ensuring Successful Operation of Cloud Solution', weight: '20%' },
            { id: 'co', name: 'Configuring Access and Security', weight: '20%' },
        ],
    },
    // ── PMI ──
    pmp: {
        name: 'PMP (Project Management Professional)',
        issuer: 'PMI',
        domains: [
            { id: 'pe', name: 'People (Leadership)', weight: '42%' },
            { id: 'pr', name: 'Process', weight: '50%' },
            { id: 'be', name: 'Business Environment', weight: '8%' },
        ],
    },
    capm: {
        name: 'CAPM (Certified Associate in Project Management)',
        issuer: 'PMI',
        domains: [
            { id: 'pm', name: 'Project Management Fundamentals', weight: '17%' },
            { id: 'pp', name: 'Predictive Plan-Based Methodologies', weight: '26%' },
            { id: 'ag', name: 'Agile Frameworks/Methodologies', weight: '20%' },
            { id: 'ba', name: 'Business Analysis Frameworks', weight: '37%' },
        ],
    },
    // ── Kubernetes & DevOps ──
    cka: {
        name: 'CKA (Certified Kubernetes Administrator)',
        issuer: 'Linux Foundation / CNCF',
        domains: [
            { id: 'ca', name: 'Cluster Architecture, Installation & Configuration', weight: '25%' },
            { id: 'wl', name: 'Workloads & Scheduling', weight: '15%' },
            { id: 'sn', name: 'Services & Networking', weight: '20%' },
            { id: 'str', name: 'Storage', weight: '10%' },
            { id: 'ts', name: 'Troubleshooting', weight: '30%' },
        ],
    },
    ckad: {
        name: 'CKAD (Certified Kubernetes Application Developer)',
        issuer: 'Linux Foundation / CNCF',
        domains: [
            { id: 'ac', name: 'Application Design and Build', weight: '20%' },
            { id: 'ad', name: 'Application Deployment', weight: '20%' },
            { id: 'ao', name: 'Application Observability and Maintenance', weight: '15%' },
            { id: 'ae', name: 'Application Environment, Configuration & Security', weight: '25%' },
            { id: 'sn', name: 'Services and Networking', weight: '20%' },
        ],
    },
    terraform: {
        name: 'HashiCorp Terraform Associate (003)',
        issuer: 'HashiCorp',
        domains: [
            { id: 'ic', name: 'IaC Concepts', weight: '14%' },
            { id: 'tf', name: 'Terraform Purpose', weight: '9%' },
            { id: 'ba', name: 'Terraform Basics', weight: '32%' },
            { id: 'co', name: 'Terraform Core Workflow', weight: '14%' },
            { id: 'ms', name: 'Modules and State', weight: '21%' },
            { id: 'cs', name: 'Configuration Sharing', weight: '10%' },
        ],
    },
    // ── Scrum ──
    psm: {
        name: 'PSM I (Professional Scrum Master)',
        issuer: 'Scrum.org',
        domains: [
            { id: 'sf', name: 'Scrum Framework', weight: '30%' },
            { id: 'st', name: 'Scrum Theory and Principles', weight: '25%' },
            { id: 'sm', name: 'Scrum Master Role', weight: '25%' },
            { id: 'sp', name: 'Scrum Practices', weight: '20%' },
        ],
    },
    // ── Compliance & Frameworks ──
    'iso-27001-la': {
        name: 'ISO 27001 Lead Auditor',
        issuer: 'PECB / BSI',
        domains: [
            { id: 'isms', name: 'ISMS Fundamentals and Standards', weight: '25%' },
            { id: 'pa', name: 'Planning an ISO 27001 Audit', weight: '20%' },
            { id: 'ca', name: 'Conducting an ISO 27001 Audit', weight: '30%' },
            { id: 'cra', name: 'Closing and Reporting the Audit', weight: '15%' },
            { id: 'ma', name: 'Managing an Internal Audit Program', weight: '10%' },
        ],
    },
    'gdpr-practitioner': {
        name: 'GDPR Practitioner',
        issuer: 'BCS / IAPP',
        domains: [
            { id: 'gf', name: 'GDPR Foundations and Scope', weight: '20%' },
            { id: 'lr', name: 'Lawful Bases and Rights', weight: '25%' },
            { id: 'dc', name: 'Data Controller Obligations', weight: '25%' },
            { id: 'dp', name: 'Data Protection by Design', weight: '15%' },
            { id: 'ir', name: 'Incidents and Breaches', weight: '15%' },
        ],
    },
    hipaa: {
        name: 'HIPAA Compliance Training',
        issuer: 'HHS / AHIMA',
        domains: [
            { id: 'pr', name: 'Privacy Rule', weight: '30%' },
            { id: 'sr', name: 'Security Rule', weight: '30%' },
            { id: 'br', name: 'Breach Notification Rule', weight: '15%' },
            { id: 'en', name: 'Enforcement and Penalties', weight: '10%' },
            { id: 'co', name: 'Covered Entities and Business Associates', weight: '15%' },
        ],
    },
    // ── Brasil ──
    enem: {
        name: 'Exame Nacional do Ensino Médio (ENEM)',
        issuer: 'INEP',
        domains: [
            { id: 'ling', name: 'Linguagens, Códigos e suas Tecnologias', weight: '25%' },
            { id: 'mat', name: 'Matemática e suas Tecnologias', weight: '25%' },
            { id: 'ci1', name: 'Ciências da Natureza e suas Tecnologias', weight: '25%' },
            { id: 'ci2', name: 'Ciências Humanas e suas Tecnologias', weight: '25%' },
        ],
    },
    'oab-primeira-fase': {
        name: 'OAB Primeira Fase',
        issuer: 'Conselho Federal da OAB',
        domains: [
            { id: 'cc', name: 'Direito Constitucional', weight: '12%' },
            { id: 'cp', name: 'Direito Penal e Processual Penal', weight: '16%' },
            { id: 'cv', name: 'Direito Civil e Processual Civil', weight: '18%' },
            { id: 'ct', name: 'Direito do Trabalho e Processual do Trabalho', weight: '14%' },
            { id: 'et', name: 'Ética e Estatuto da OAB', weight: '15%' },
            { id: 'ta', name: 'Direito Tributário e Administrativo', weight: '12%' },
            { id: 'em', name: 'Direito Empresarial', weight: '8%' },
            { id: 'ou', name: 'Direito do Consumidor e outros', weight: '5%' },
        ],
    },
    'residencia-medica': {
        name: 'Residência Médica (FAMERP / USP / UNIFESP)',
        issuer: 'Diversas Instituições BR',
        domains: [
            { id: 'cl', name: 'Clínica Médica', weight: '30%' },
            { id: 'cg', name: 'Cirurgia Geral', weight: '20%' },
            { id: 'ob', name: 'Obstetrícia e Ginecologia', weight: '15%' },
            { id: 'pe', name: 'Pediatria', weight: '15%' },
            { id: 'pm', name: 'Medicina Preventiva e Saúde Pública', weight: '10%' },
            { id: 'ou', name: 'Outras especialidades', weight: '10%' },
        ],
    },
};

// ── Helpers (kept minimal — main validation logic lives in generate/route.ts) ──

function pLimit(concurrency: number) {
    let active = 0;
    const queue: Array<() => void> = [];

    const run = <T>(fn: () => Promise<T>): Promise<T> =>
        new Promise((resolve, reject) => {
            const exec = async () => {
                active++;
                try { resolve(await fn()); } catch (e) { reject(e); } finally {
                    active--;
                    if (queue.length > 0) queue.shift()!();
                }
            };
            if (active < concurrency) exec();
            else queue.push(exec);
        });

    return run;
}

async function generateBatch(
    apiKey: string,
    model: string,
    cert: CertInfo,
    batchSize: number,
    lang: string,
    domainId: string | undefined,
    existingStems: string[],
): Promise<GeneratedQuestion[]> {
    const targetDomain = domainId ? cert.domains.find((d) => d.id === domainId) : null;
    const domainLines = cert.domains
        .map((d) => `- ${d.name}${d.weight ? ` (${d.weight})` : ''}`)
        .join('\n');

    const recentStemsBlock =
        existingStems.length > 0
            ? `\nAVOID duplicating these existing question topics (stems):\n${existingStems.slice(0, 60).map((s) => `- "${s}"`).join('\n')}`
            : '';

    const focusLine = targetDomain
        ? `Focus ONLY on domain: "${targetDomain.name}".`
        : 'Distribute questions across all domains proportionally to their exam weights.';

    const langName: Record<string, string> = {
        en: 'English',
        'pt-BR': 'Brazilian Portuguese',
        es: 'Spanish',
        fr: 'French',
        de: 'German',
    };

    const systemPrompt = `You are an expert ${cert.name} certification exam question author for ${cert.issuer}.

Exam domains:
${domainLines}

${focusLine}

Write ${batchSize} unique multiple-choice questions in ${langName[lang] ?? lang}.
Each question must have EXACTLY 4 options (A–D), one correct answer, and a thorough explanation.
${recentStemsBlock}

Return ONLY a JSON object: { "questions": [ ...${batchSize} questions... ] }

Each question must follow this exact schema:
{
  "text": "...",
  "options": [{"label":"A","text":"..."},{"label":"B","text":"..."},{"label":"C","text":"..."},{"label":"D","text":"..."}],
  "correctOptionIndex": 0,
  "explanation": {
    "short": "...",
    "whyOthersWrong": {"A":"...","B":"...","C":"...","D":"..."},
    "examTip": "..."
  },
  "difficulty": "easy|medium|hard",
  "domainIds": ["${domainId ?? cert.domains[0]?.id ?? 'domain'}"],
  "tags": ["tag1","tag2"]
}`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Generate ${batchSize} high-quality exam questions now.` },
            ],
            temperature: 0.75,
            response_format: { type: 'json_object' },
        }),
    });

    if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty OpenAI response');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed.questions) ? parsed.questions : [];
}

function isValidQuestion(q: GeneratedQuestion): boolean {
    if (!q?.text || q.text.length < 10) return false;
    if (!Array.isArray(q.options) || q.options.length !== 4) return false;
    if (typeof q.correctOptionIndex !== 'number') return false;
    if (!q.explanation?.short || q.explanation.short.length < 10) return false;
    if (!['easy', 'medium', 'hard'].includes(q.difficulty)) return false;
    return true;
}

function stripMarkdown(s: string) {
    return s.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1');
}

function cleanQ(q: GeneratedQuestion): GeneratedQuestion {
    return {
        ...q,
        text: stripMarkdown(q.text),
        options: q.options.map((o) => ({ ...o, text: stripMarkdown(o.text) })),
        explanation: { ...q.explanation, short: stripMarkdown(q.explanation.short ?? '') },
    };
}

interface GeneratedQuestion {
    text: string;
    options: Array<{ label: string; text: string }>;
    correctOptionIndex: number;
    explanation: { short: string; whyOthersWrong: Record<string, string>; examTip?: string };
    difficulty: string;
    domainIds: string[];
    tags: string[];
}

// ── Import batch to Firestore ──

async function importToFirestore(
    db: FirebaseFirestore.Firestore,
    studyId: string,
    questions: GeneratedQuestion[],
): Promise<number> {
    const BATCH_SIZE = 400; // Firestore batch limit
    let imported = 0;

    for (let i = 0; i < questions.length; i += BATCH_SIZE) {
        const chunk = questions.slice(i, i + BATCH_SIZE);
        const batch = db.batch();
        for (const q of chunk) {
            const ref = db.collection('marketplace_questions').doc();
            batch.set(ref, {
                studyId,
                text: q.text,
                options: q.options,
                correctOptionIndex: q.correctOptionIndex,
                explanation: q.explanation,
                difficulty: q.difficulty,
                domainIds: Array.isArray(q.domainIds) && q.domainIds.length > 0 ? q.domainIds : ['general'],
                tags: q.tags ?? [],
                isActive: true,
                source: 'bulk-generator',
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });
            imported++;
        }
        batch.update(db.collection('marketplace_studies').doc(studyId), {
            questionCount: FieldValue.increment(chunk.length),
            updatedAt: FieldValue.serverTimestamp(),
        });
        await batch.commit();
    }
    return imported;
}

// ── Main handler ──

export const POST = withAdmin(
    async (request: Request, { user, log }: RouteContext) => {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
        }

        const body = await request.json();
        const parsed = bodySchema.parse(body);
        const { totalCount, batchSize, lang, model, autoImport, domainId } = parsed;
        const concurrency = Math.min(parsed.concurrency, 8);

        const db = getAdminDb();
        const startMs = Date.now();

        // ── Resolve cert + study ──

        let cert: CertInfo;
        let studyId: string;

        if (parsed.studyId) {
            const snap = await db.collection('marketplace_studies').doc(parsed.studyId).get();
            if (!snap.exists) {
                return NextResponse.json({ error: 'Study not found' }, { status: 404 });
            }
            const data = snap.data()!;
            studyId = parsed.studyId;

            // Build cert info from Firestore study data
            cert = {
                name: data.name ?? 'Study',
                issuer: data.issuer ?? 'Unknown',
                domains: (data.domains ?? []) as CertDomain[],
            };

            // Enrich with catalog if name matches
            const nameKey = data.name?.toLowerCase().replace(/\s+/g, '-') ?? '';
            const catalogMatch = CERT_CATALOG[nameKey] ?? CERT_CATALOG[parsed.certSlug ?? ''];
            if (catalogMatch) cert = catalogMatch;

        } else {
            // certSlug mode — find or auto-create study
            const certSlug = parsed.certSlug!;
            cert = CERT_CATALOG[certSlug];
            if (!cert) {
                return NextResponse.json(
                    { error: `Unknown cert slug "${certSlug}". Use studyId instead or add to CERT_CATALOG.` },
                    { status: 400 }
                );
            }

            // Find existing study for this cert or create one
            const existingSnap = await db
                .collection('marketplace_studies')
                .where('abbreviation', '==', certSlug.toUpperCase().slice(0, 20))
                .where('isActive', '==', true)
                .limit(1)
                .get();

            if (!existingSnap.empty) {
                studyId = existingSnap.docs[0].id;
            } else {
                // Auto-create
                const ref = db.collection('marketplace_studies').doc();
                await ref.set({
                    abbreviation: certSlug.toUpperCase().slice(0, 20),
                    name: cert.name,
                    issuer: cert.issuer,
                    description: `Practice questions for ${cert.name} — generated by ExamFlow AI.`,
                    domains: cert.domains.map((d, i) => ({ id: d.id, name: d.name, order: i })),
                    questionCount: 0,
                    domainQuestionCounts: {},
                    importCount: 0,
                    tags: [cert.issuer, certSlug],
                    isActive: true,
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                    createdBy: user.uid,
                });
                studyId = ref.id;
                log.info('Bulk generator: auto-created study', { meta: { studyId, certSlug } });
            }
        }

        // ── Load existing question stems for deduplication ──

        const existingSnap = await db
            .collection('marketplace_questions')
            .where('studyId', '==', studyId)
            .orderBy('createdAt', 'desc')
            .limit(120)
            .get();

        const existingStems = existingSnap.docs.map((d) =>
            ((d.data().text ?? '') as string).slice(0, 120)
        );

        // ── Calculate batches ──

        const numBatches = Math.ceil(totalCount / batchSize);
        const limit = pLimit(concurrency);

        log.info('Bulk generate start', {
            meta: { studyId, totalCount, numBatches, concurrency, model, autoImport },
        });

        // ── Run batches in parallel ──

        const batchResults = await Promise.allSettled(
            Array.from({ length: numBatches }, (_, i) => {
                const thisBatchSize = i === numBatches - 1
                    ? totalCount - i * batchSize  // last batch may be smaller
                    : batchSize;
                return limit(() =>
                    generateBatch(apiKey, model, cert, thisBatchSize, lang, domainId, existingStems)
                );
            })
        );

        // ── Aggregate results ──

        const allValid: GeneratedQuestion[] = [];
        let failed = 0;

        for (const result of batchResults) {
            if (result.status === 'fulfilled') {
                const cleaned = result.value.map(cleanQ).filter(isValidQuestion);
                allValid.push(...cleaned);
            } else {
                failed++;
                log.warn('Batch failed', { meta: { error: String(result.reason) } });
            }
        }

        // ── Import or return preview ──

        let imported = 0;
        if (autoImport && allValid.length > 0) {
            imported = await importToFirestore(db, studyId, allValid);
        }

        const durationMs = Date.now() - startMs;

        log.info('Bulk generate complete', {
            meta: {
                studyId,
                totalCount,
                generated: allValid.length,
                imported,
                failedBatches: failed,
                durationMs,
            },
        });

        return {
            data: {
                studyId,
                studyName: cert.name,
                totalRequested: totalCount,
                generated: allValid.length,
                imported,
                failedBatches: failed,
                skipped: totalCount - allValid.length,
                batches: numBatches,
                durationMs,
                // In preview mode, return the first 50 questions as sample
                preview: autoImport ? [] : allValid.slice(0, 50),
            },
        };
    }
);

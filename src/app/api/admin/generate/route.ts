/**
 * POST /api/admin/generate
 * AI question generator for the admin panel.
 *
 * Two modes:
 *   1. Existing study → studyId + optional domainId
 *   2. Free-form topic → topic string → AI discovers domains → auto-creates study
 *
 * Generates questions using OpenAI, validates them thoroughly, imports to marketplace.
 * Admin-only endpoint.
 */

import { NextResponse } from 'next/server';
import { withAdmin, type RouteContext } from '@/lib/api-middleware';
import { getAdminDb } from '@/lib/firebase/admin';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';

// ── Input schema ──

const bodySchema = z.object({
    // Mode 1: existing study
    studyId: z.string().min(1).optional(),
    domainId: z.string().optional(),
    // Mode 2: free-form topic
    topic: z.string().min(2).max(200).optional(),
    // Shared
    count: z.number().int().min(1).max(30).default(5),
    model: z.string().default('gpt-4o-mini'),
    lang: z.string().default('en'),
}).refine(d => d.studyId || d.topic, {
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

interface GeneratedQuestion {
    text: string;
    options: Array<{ label: string; text: string }>;
    correctOptionIndex: number;
    explanation: {
        short: string;
        whyOthersWrong: Record<string, string>;
        examTip?: string;
    };
    difficulty: string;
    domainIds: string[];
    tags: string[];
}

interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

// ── Constants ──

const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const BIAS_TERMS = ['always', 'never', 'impossible', 'guaranteed', 'obviously', 'clearly', 'simply'];
const FAKE_NIST_NUMBERS = [
    '800-12', '800-14', '800-16', '800-18', '800-22',
    '800-24', '800-26', '800-29', '800-31', '800-33',
    '800-91', '800-95', '800-99', '800-101', '800-102',
    '800-150', '800-175A',
];

const LANG_NAMES: Record<string, string> = {
    'en': 'English',
    'pt-BR': 'Brazilian Portuguese (Português Brasileiro)',
    'es': 'Spanish (Español)',
    'fr': 'French (Français)',
    'de': 'German (Deutsch)',
};

const SECURITY_ISSUERS = ['ISC2', 'CompTIA', 'ISACA', 'EC-Council', 'SANS', 'AWS', 'Microsoft', 'Google', 'Cisco'];

// ── Thorough validation (ported from CLI question-validator.ts) ──

function validateQuestion(q: GeneratedQuestion, index: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const prefix = `Q${index + 1}`;

    // Structure
    if (!q.text || typeof q.text !== 'string') {
        errors.push(`${prefix}: Missing or invalid text`);
        return { valid: false, errors, warnings };
    }
    if (q.text.length < 20) {
        errors.push(`${prefix}: Stem too short (${q.text.length} chars, min 20)`);
    }

    // Markdown/formatting check
    if (/\*\*[^*]+\*\*/.test(q.text)) {
        warnings.push(`${prefix}: Stem contains **bold** markdown`);
    }

    // Options
    if (!Array.isArray(q.options) || q.options.length !== 4) {
        errors.push(`${prefix}: Must have exactly 4 options`);
    } else {
        const optionTexts = q.options.map(o => o.text?.toLowerCase().trim());
        if (new Set(optionTexts).size < 4) {
            errors.push(`${prefix}: Duplicate option text detected`);
        }
        for (let i = 0; i < q.options.length; i++) {
            if (!q.options[i].text || q.options[i].text.trim().length < 2) {
                errors.push(`${prefix}: Option ${q.options[i].label || i} is empty or too short`);
            }
        }
        // "All/none of the above"
        for (const opt of q.options) {
            const lower = opt.text?.toLowerCase() || '';
            if (lower.includes('all of the above') || lower.includes('none of the above')) {
                errors.push(`${prefix}: Contains "all/none of the above"`);
            }
        }
        // Correct answer is the longest
        const lengths = q.options.map(o => o.text?.length || 0);
        const maxLen = Math.max(...lengths);
        if (typeof q.correctOptionIndex === 'number' &&
            lengths[q.correctOptionIndex] === maxLen &&
            lengths.filter(l => l === maxLen).length === 1) {
            warnings.push(`${prefix}: Correct answer is the longest option (test-taking cue)`);
        }
    }

    if (typeof q.correctOptionIndex !== 'number' || q.correctOptionIndex < 0 || q.correctOptionIndex > 3) {
        errors.push(`${prefix}: correctOptionIndex must be 0–3`);
    }

    if (!VALID_DIFFICULTIES.has(q.difficulty)) {
        errors.push(`${prefix}: Invalid difficulty "${q.difficulty}"`);
    }

    if (!Array.isArray(q.domainIds) || q.domainIds.length === 0) {
        errors.push(`${prefix}: domainIds must be a non-empty array`);
    }

    // Explanation
    if (!q.explanation?.short) {
        errors.push(`${prefix}: Missing explanation.short`);
    } else {
        const sentences = q.explanation.short.split(/[.!?]+/).filter(s => s.trim().length > 5);
        if (sentences.length < 2) {
            errors.push(`${prefix}: Explanation needs 2+ sentences, got ${sentences.length}`);
        }
    }

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

    // Hallucination: fake NIST numbers
    const fullText = `${q.text} ${q.explanation?.short || ''}`;
    for (const fake of FAKE_NIST_NUMBERS) {
        if (fullText.includes(`SP ${fake}`)) {
            warnings.push(`${prefix}: Possibly fabricated NIST SP ${fake}`);
        }
    }

    // Bias terms in stem
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
    return {
        ...q,
        text: q.text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1'),
        options: q.options.map(o => ({
            ...o,
            text: o.text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1'),
        })),
        explanation: {
            ...q.explanation,
            short: q.explanation.short?.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1') || '',
            examTip: q.explanation.examTip?.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1'),
        },
    };
}

// ── Build production-grade prompt ──

function buildSystemPrompt(
    studyName: string,
    issuer: string,
    domains: DomainInfo[],
    targetDomainId: string | undefined,
    count: number,
    lang: string,
): string {
    const targetDomain = targetDomainId ? domains.find(d => d.id === targetDomainId) : null;

    const domainContext = domains.map(d => {
        const weight = d.weight ? ` (${d.weight})` : '';
        const topics = d.topics?.length ? ` — Topics: ${d.topics.join(', ')}` : '';
        return `  • ${d.id}: ${d.name}${weight}${topics}`;
    }).join('\n');

    const focusInstruction = targetDomain
        ? `Focus ALL questions on domain "${targetDomain.name}" (${targetDomain.id}).`
        : `Spread questions across ALL domains listed above — cover maximum breadth.`;

    const langInstruction = lang !== 'en'
        ? `\n\nLANGUAGE REQUIREMENT (CRITICAL):
All question text, options, explanations, whyOthersWrong, and examTip MUST be written in ${LANG_NAMES[lang] || lang}.
Keep technical terms, acronyms, and well-known proper names in their original form.
The JSON keys (text, options, label, etc.) stay in English — only the VALUES are translated.`
        : '';

    const isSecurityCert = SECURITY_ISSUERS.some(s => issuer.includes(s));
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
7. PLAIN TEXT ONLY: Do NOT use markdown, bold (**), italic (*), caps-lock emphasis, or any formatting in question text, options, or explanations. Write naturally. Example: "What is the primary consequence..." NOT "What is the **PRIMARY** consequence..."
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
    topic: string,
): Promise<DiscoveredCert> {
    const prompt = `You are an expert on professional certifications and exams.

I need the FULL domain structure for the following certification/exam/topic:
"${topic}"

Return a JSON object with this EXACT schema:
{
  "slug": "lowercase-hyphenated-short-id",
  "name": "Full Official Name of the Certification or Exam",
  "issuer": "Issuing Organization",
  "description": "A 1-2 sentence description of this certification/exam",
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
- Use the REAL, OFFICIAL exam domains from the latest version of this certification
- If it's not a real certification but a general topic, create logical domains/areas
- Each domain must have 3-8 key topics
- slug must be lowercase, letters and hyphens only
- domain id must be a short 2-4 letter lowercase abbreviation

Output ONLY the JSON. No markdown, no explanation.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
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
        throw new Error(`OpenAI API error during domain discovery (${response.status}): ${err}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from OpenAI during domain discovery');

    const cert = JSON.parse(content) as DiscoveredCert;

    if (!cert.slug || !cert.name || !Array.isArray(cert.domains) || cert.domains.length === 0) {
        throw new Error('AI returned invalid structure for topic. Try a more specific name.');
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
): Promise<GeneratedQuestion[]> {
    const systemPrompt = buildSystemPrompt(studyName, issuer, domains, targetDomainId, count, lang);

    const langNote = lang !== 'en' ? ` Write all content in ${LANG_NAMES[lang] || lang}.` : '';
    const userPrompt = `Generate ${count} high-quality "${studyName}" exam questions. Follow ALL rules in the system prompt.${langNote} Output valid JSON only.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
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

// ── Import to Firestore ──

async function importToMarketplace(
    db: FirebaseFirestore.Firestore,
    studyId: string,
    questions: GeneratedQuestion[],
): Promise<number> {
    const batch = db.batch();
    let imported = 0;

    for (const q of questions) {
        const docRef = db.collection('marketplace_questions').doc();
        batch.set(docRef, {
            studyId,
            text: q.text,
            options: q.options,
            correctOptionIndex: q.correctOptionIndex,
            explanation: q.explanation,
            difficulty: q.difficulty,
            domainIds: q.domainIds,
            tags: q.tags || [],
            isActive: true,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            source: 'admin-generator',
        });
        imported++;
    }

    if (imported > 0) {
        batch.update(db.collection('marketplace_studies').doc(studyId), {
            questionCount: FieldValue.increment(imported),
            updatedAt: FieldValue.serverTimestamp(),
        });
        await batch.commit();
    }

    return imported;
}

// ── Auto-create marketplace study from discovered cert ──

async function autoCreateStudy(
    db: FirebaseFirestore.Firestore,
    cert: DiscoveredCert,
    adminUid: string,
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

// ── Handler ──

export const POST = withAdmin(async (request: Request, { user, log }: RouteContext) => {
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
        // Mode 1: existing study
        const studySnap = await db.collection('marketplace_studies').doc(parsed.studyId).get();
        if (!studySnap.exists) {
            return NextResponse.json({ error: 'Study not found' }, { status: 404 });
        }
        const study = studySnap.data()!;
        ctx = {
            studyId: parsed.studyId,
            studyName: study.name || 'Unknown Study',
            issuer: study.issuer || study.createdBy || 'Unknown',
            domains: study.domains || [],
            isNewStudy: false,
        };

        if (parsed.domainId && !ctx.domains.some(d => d.id === parsed.domainId)) {
            return NextResponse.json(
                { error: `Domain "${parsed.domainId}" not found in study` },
                { status: 400 }
            );
        }
    } else {
        // Mode 2: free-form topic → discover domains → create study
        log.info('Discovering domains for topic', { meta: { topic: parsed.topic } });

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

    log.info('Admin generate start', {
        meta: {
            studyId: ctx.studyId,
            studyName: ctx.studyName,
            count: parsed.count,
            model: parsed.model,
            mode: parsed.studyId ? 'existing' : 'freeform',
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
    );

    // ── Clean markdown from generated text ──
    const cleanedQuestions = rawQuestions.map(cleanQuestion);

    // ── Validate thoroughly ──
    const validationResults = cleanedQuestions.map((q, i) => ({
        question: q,
        validation: validateQuestion(q, i),
    }));

    const validQuestions = validationResults
        .filter(r => r.validation.valid)
        .map(r => r.question);
    const allWarnings = validationResults.flatMap(r => r.validation.warnings);
    const allErrors = validationResults.flatMap(r => r.validation.errors);
    const invalidCount = cleanedQuestions.length - validQuestions.length;

    // ── Import valid questions ──
    let importedCount = 0;
    if (validQuestions.length > 0) {
        importedCount = await importToMarketplace(db, ctx.studyId, validQuestions);
    }

    log.info('Admin generate complete', {
        meta: {
            generated: rawQuestions.length,
            valid: validQuestions.length,
            invalid: invalidCount,
            imported: importedCount,
            warnings: allWarnings.length,
        },
    });

    return {
        generated: rawQuestions.length,
        valid: validQuestions.length,
        invalid: invalidCount,
        imported: importedCount,
        model: parsed.model,
        studyId: ctx.studyId,
        studyName: ctx.studyName,
        isNewStudy: ctx.isNewStudy,
        warnings: allWarnings,
        errors: allErrors,
    };
});

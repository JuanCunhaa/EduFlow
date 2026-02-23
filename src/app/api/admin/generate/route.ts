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
 *   - Shared cert catalog with rich domain topics for all known exams
 *   - Certification-specific exam style prompts (ISC2, CompTIA, AWS, etc.)
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
import {
  type GeneratedQuestion,
  type CertDomain,
  LANG_NAMES,
  validateQuestion,
  cleanQ,
  buildPrompt,
} from '@/lib/generator-utils';
import { KNOWN_CERTS, CERT_ALIASES } from '@/lib/cert-catalog';

export const maxDuration = 120; // 2 minutes max execution time for AI generation

// ── Input schema ──

const bodySchema = z
  .object({
    studyId: z.string().min(1).optional(),
    domainId: z.string().optional(),
    topic: z.string().min(2).max(200).optional(),
    count: z.number().int().min(1).max(30).default(5),
    model: z.string().default('gpt-4o-mini'),
    lang: z.string().default('en'),
  })
  .refine((d) => d.studyId || d.topic, {
    message: 'Either studyId or topic is required',
  });

// ── Types ──

interface StudyContext {
  studyId: string;
  studyName: string;
  issuer: string;
  domains: CertDomain[];
  isNewStudy: boolean;
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
  firestoreDomains: CertDomain[]
): { domains: CertDomain[]; issuer: string } {
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

  return { domains: firestoreDomains, issuer: 'Unknown' };
}

// ── AI domain discovery for free-form topics ──

interface DiscoveredCert {
  slug: string;
  name: string;
  issuer: string;
  description: string;
  domains: CertDomain[];
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
    throw new Error(`OpenAI error during domain discovery (${response.status}): ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from OpenAI during domain discovery');

  const cert = JSON.parse(content) as DiscoveredCert;
  if (!cert.slug || !cert.name || !Array.isArray(cert.domains) || cert.domains.length === 0) {
    throw new Error('AI returned invalid structure. Try a more specific name.');
  }

  return cert;
}

// ── OpenAI question generation (using shared prompt builder) ──

async function generateWithOpenAI(
  apiKey: string,
  model: string,
  studyName: string,
  issuer: string,
  domains: CertDomain[],
  targetDomainId: string | undefined,
  count: number,
  lang: string,
  existingQuestions: string[]
): Promise<GeneratedQuestion[]> {
  const { system, user } = buildPrompt({
    certName: studyName,
    issuer,
    domains,
    targetDomainId,
    batchSize: count,
    lang,
    existingStems: existingQuestions,
  });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
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
      const firestoreDomains: CertDomain[] = study.domains || [];

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

      if (parsed.domainId && !ctx.domains.some((d) => d.id === parsed.domainId)) {
        return NextResponse.json(
          { error: `Domain "${parsed.domainId}" not found in study` },
          { status: 400 }
        );
      }
    } else {
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

    // ── Load existing questions for deduplication ──
    const existingQuestions = await loadExistingQuestions(db, ctx.studyId, parsed.domainId);

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
    const cleanedQuestions = rawQuestions.map(cleanQ);

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

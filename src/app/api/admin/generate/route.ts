/**
 * POST /api/admin/generate
 * AI question generator for the admin panel.
 * Generates questions using OpenAI, validates them, and imports to marketplace.
 * Admin-only endpoint.
 */

import { NextResponse } from 'next/server';
import { withAdmin, type RouteContext } from '@/lib/api-middleware';
import { getAdminDb } from '@/lib/firebase/admin';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';

const bodySchema = z.object({
    studyId: z.string().min(1),
    domainId: z.string().optional(),
    count: z.number().int().min(1).max(20).default(5),
    model: z.string().default('gpt-4o-mini'),
});

// ── Inline validation (mirrors content/generator/question-validator.ts) ──

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

function validateQuestion(q: GeneratedQuestion): boolean {
    if (!q.text || q.text.length < 20) return false;
    if (!Array.isArray(q.options) || q.options.length !== 4) return false;
    if (typeof q.correctOptionIndex !== 'number' || q.correctOptionIndex < 0 || q.correctOptionIndex > 3) return false;
    if (!['easy', 'medium', 'hard'].includes(q.difficulty)) return false;
    if (!Array.isArray(q.domainIds) || q.domainIds.length === 0) return false;
    if (!q.explanation?.short) return false;

    // Check for duplicate or empty options
    const texts = q.options.map(o => o.text?.toLowerCase().trim());
    if (new Set(texts).size < 4) return false;
    if (q.options.some(o => !o.text || o.text.trim().length < 2)) return false;

    return true;
}

// ── OpenAI call ──

async function generateWithOpenAI(
    apiKey: string,
    model: string,
    studyName: string,
    domains: Array<{ id: string; name: string }>,
    targetDomainId: string | undefined,
    count: number,
): Promise<GeneratedQuestion[]> {
    const domainContext = domains.map(d => `- ${d.id}: ${d.name}`).join('\n');
    const targetDomain = targetDomainId
        ? domains.find(d => d.id === targetDomainId)
        : null;

    const systemPrompt = `You are an expert exam question writer for "${studyName}".

Available domains:
${domainContext}

Generate ${count} high-quality multiple-choice questions${targetDomain ? ` focused on the "${targetDomain.name}" domain` : ' across different domains'}.

RULES:
- Each question must have exactly 4 answer options (A, B, C, D)
- Only one correct answer per question
- Include a detailed explanation with "short" (2+ sentences) and "whyOthersWrong" (explain why each wrong option is wrong)
- Mix difficulty levels: easy, medium, hard
- Use practical, scenario-based questions when possible
- Do NOT use "All of the above" or "None of the above"
- The correct answer should NOT always be the longest option
- Assign relevant domainIds from the available domains
- Include 2-4 relevant tags per question

Respond with a JSON object: { "questions": [...] }

Each question object:
{
  "text": "Question stem",
  "options": [
    { "label": "A", "text": "Option A text" },
    { "label": "B", "text": "Option B text" },
    { "label": "C", "text": "Option C text" },
    { "label": "D", "text": "Option D text" }
  ],
  "correctOptionIndex": 0,
  "explanation": {
    "short": "Why this is correct...",
    "whyOthersWrong": { "A": "...", "B": "...", "C": "..." },
    "examTip": "A short exam tip"
  },
  "difficulty": "medium",
  "domainIds": ["domain-id"],
  "tags": ["tag1", "tag2"]
}`;

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
                { role: 'user', content: `Generate ${count} questions now. Respond ONLY with valid JSON.` },
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
        // Update study question count
        batch.update(db.collection('marketplace_studies').doc(studyId), {
            questionCount: FieldValue.increment(imported),
            updatedAt: FieldValue.serverTimestamp(),
        });

        await batch.commit();
    }

    return imported;
}

// ── Handler ──

export const POST = withAdmin(async (request: Request, { log }: RouteContext) => {
    const body = await request.json();
    const parsed = bodySchema.parse(body);

    // Check API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return NextResponse.json(
            { error: 'OPENAI_API_KEY not configured on server' },
            { status: 500 }
        );
    }

    const db = getAdminDb();

    // Load the study metadata
    const studySnap = await db.collection('marketplace_studies').doc(parsed.studyId).get();
    if (!studySnap.exists) {
        return NextResponse.json({ error: 'Study not found' }, { status: 404 });
    }

    const study = studySnap.data()!;
    const studyName = study.name || 'Unknown Study';
    const domains: Array<{ id: string; name: string }> = study.domains || [];

    if (parsed.domainId && !domains.some(d => d.id === parsed.domainId)) {
        return NextResponse.json(
            { error: `Domain "${parsed.domainId}" not found in study` },
            { status: 400 }
        );
    }

    log.info('Admin generate start', {
        meta: { studyId: parsed.studyId, count: parsed.count, model: parsed.model },
    });

    // Generate questions
    const rawQuestions = await generateWithOpenAI(
        apiKey,
        parsed.model,
        studyName,
        domains,
        parsed.domainId,
        parsed.count,
    );

    // Validate
    const validQuestions = rawQuestions.filter(q => validateQuestion(q));
    const invalidCount = rawQuestions.length - validQuestions.length;

    // Import to marketplace
    let importedCount = 0;
    if (validQuestions.length > 0) {
        importedCount = await importToMarketplace(db, parsed.studyId, validQuestions);
    }

    log.info('Admin generate complete', {
        meta: {
            generated: rawQuestions.length,
            valid: validQuestions.length,
            invalid: invalidCount,
            imported: importedCount,
        },
    });

    return {
        generated: rawQuestions.length,
        valid: validQuestions.length,
        invalid: invalidCount,
        imported: importedCount,
        model: parsed.model,
    };
});

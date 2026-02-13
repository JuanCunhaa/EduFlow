#!/usr/bin/env npx tsx
/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   ExamFlow Content Generator — 100% AI-driven              ║
 * ║                                                             ║
 * ║   Zero JSON files, zero templates, zero mappings.           ║
 * ║   Just pass the cert name and go.                           ║
 * ║                                                             ║
 * ║   Standalone subsystem. NOT part of build or dev server.    ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Usage:
 *   npx tsx content/generator/generate.ts --cert cissp --count 10
 *   npx tsx content/generator/generate.ts --cert cc --domain sp --count 10
 *   npx tsx content/generator/generate.ts --cert "CompTIA Security+" --count 5
 *   npx tsx content/generator/generate.ts --cert "AWS Cloud Practitioner" --count 10
 *
 * Required env:
 *   GROQ_API_KEY — Free key from https://console.groq.com/keys
 *
 * Output:
 *   content/{cert-slug}/domain-{N}-{id}/batch-{NNN}.json
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createInterface } from 'readline';

import { GroqClient } from './groq-client';
import { OpenAIClient } from './openai-client';
import {
    resolveCert,
    getDomainMeta,
    listDomains,
    listKnownCerts,
    buildSystemPrompt,
    buildUserPrompt,
    loadExistingQuestionTexts,
    type DomainMeta,
    type CertInfo,
    type AIClient,
} from './prompt-builder';
import {
    validateBatch,
    type GeneratedQuestion,
} from './question-validator';
import { StudyManager, type StudyMetadata } from './study-manager';
import { importBatchToMarketplace } from './import-to-marketplace';

// ── CLI Args ─────────────────────────────────────

interface CliArgs {
    cert: string;
    domain: string | null;   // domain ID, number, or null = all
    count: number;
    lang: string;            // question language (en, pt-BR, es, etc.)
    model: string;
    temperature: number;
    dryRun: boolean;
    studyFile: string | null;
    noImport: boolean;
    autoApprove: boolean;
}

function parseArgs(): CliArgs {
    const args = process.argv.slice(2);
    const map = new Map<string, string>();

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--dry-run') {
            map.set('dry-run', 'true');
        } else if (args[i] === '--no-import') {
            map.set('no-import', 'true');
        } else if (args[i] === '--auto-approve') {
            map.set('auto-approve', 'true');
        } else if (args[i].startsWith('--') && i + 1 < args.length) {
            map.set(args[i].slice(2), args[i + 1]);
            i++;
        }
    }

    const cert = map.get('cert');
    const domain = map.get('domain') || null;
    const count = parseInt(map.get('count') || '10', 10);
    const lang = map.get('lang') || 'en';
    const model = map.get('model') || 'llama-3.3-70b-versatile';
    const temperature = parseFloat(map.get('temperature') || '0.7');
    const dryRun = map.get('dry-run') === 'true';
    const studyFile = map.get('study-file') || null;
    const noImport = map.get('no-import') === 'true';
    const autoApprove = map.get('auto-approve') === 'true';

    if (!cert && !studyFile) {
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║   ExamFlow Content Generator — 100% AI-driven              ║
╚══════════════════════════════════════════════════════════════╝

Usage:
  npx tsx content/generator/generate.ts --cert <name> [options]
  npx tsx content/generator/generate.ts --study-file <path> [options]

Arguments:
  --cert          Cert name or topic (e.g., cissp, "security+")
  --study-file    Use an existing study metadata file (e.g., content/cissp/cissp-study.json)
  --domain        Domain ID or number (optional — omit = generate ALL domains)
  --count         Questions per domain (default: 10)
  --lang          Language (default: en)
  --model         Groq model
  --dry-run       Show prompt without calling API
  --no-import     Skip the automatic import step
  --auto-approve  Skip the pause/confirmation before import

Examples:
  npx tsx content/generator/generate.ts --cert cissp --count 10
  npx tsx content/generator/generate.ts --study-file content/cissp/cissp-study.json --count 5
`);
        process.exit(2);
    }

    return { cert: cert || '', domain, count, lang, model, temperature, dryRun, studyFile, noImport, autoApprove };
}

// ── Main ─────────────────────────────────────────

async function main() {
    const args = parseArgs();

    // ── Init Client ──
    let client: AIClient | null = null;
    const isOpenAI = args.model.startsWith('gpt-') || args.model.startsWith('o1-') || args.model.startsWith('o3-');

    if (isOpenAI) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey && !args.dryRun) {
            console.error('❌ OPENAI_API_KEY not set.');
            process.exit(1);
        }
        if (apiKey) {
            client = new OpenAIClient({ apiKey, model: args.model, temperature: args.temperature });
            console.log(`   🤖 Provider: OpenAI (${args.model})`);
        }
    } else {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey && !args.dryRun) {
            console.error('❌ GROQ_API_KEY not set.');
            process.exit(1);
        }
        if (apiKey) {
            client = new GroqClient({ apiKey, model: args.model, temperature: args.temperature, maxTokens: 8192, responseFormat: 'json_object' });
            console.log(`   ⚡ Provider: Groq (${args.model})`);
        }
    }

    // ── 1. Resolve Context (Cert/Domains) ──
    let cert: CertInfo;
    let domainsToGenerate: DomainMeta[];
    let studyMetadata: StudyMetadata | null = null;

    if (args.studyFile) {
        // Load from file
        const fullPath = path.resolve(process.cwd(), args.studyFile);
        if (!fs.existsSync(fullPath)) {
            console.error(`❌ Study file not found: ${fullPath}`);
            process.exit(1);
        }
        console.log(`📂 Loading study from: ${args.studyFile}`);
        studyMetadata = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));

        cert = {
            slug: studyMetadata!.certSlug,
            name: studyMetadata!.certName,
            issuer: studyMetadata!.issuer,
            domains: studyMetadata!.domains.map(d => ({
                id: d.domainId,
                number: d.domainNumber,
                name: d.domainName,
                weight: '0%', // Not stored in study metadata usually, but needed for types
                topics: d.topics
            }))
        };
        args.lang = studyMetadata!.lang; // Override lang from file
    } else {
        // Resolve normally
        try {
            cert = await resolveCert(args.cert, client ?? undefined);
        } catch (err) {
            console.error(`❌ ${(err as Error).message}`);
            process.exit(1);
        }
    }

    console.log(`\n🎓 ${cert.name} (${cert.issuer})`);
    if (args.lang !== 'en') {
        console.log(`🌐 Language: ${args.lang}`);
    }

    // Filter Domains
    if (args.domain && args.domain !== 'all') {
        domainsToGenerate = [getDomainMeta(cert, args.domain)];
    } else {
        domainsToGenerate = listDomains(cert);
    }

    console.log(`🎯 Generating ${args.count} per domain for ${domainsToGenerate.length} domains`);

    // ── 2. Ensure Study Exists (Auto-Create) ──
    const studyManager = new StudyManager();
    let studyId = studyMetadata?.studyId || '';

    // Auto-detect existing study file to reuse ID
    if (!studyId && cert.slug) {
        const defaultPath = path.resolve(process.cwd(), 'content', cert.slug, `${cert.slug}-study.json`);
        if (fs.existsSync(defaultPath)) {
            try {
                const saved = JSON.parse(fs.readFileSync(defaultPath, 'utf-8'));
                if (saved.studyId) {
                    console.log(`   📂 Found existing study file: ${path.relative(process.cwd(), defaultPath)}`);
                    console.log(`   ♻️  Reusing Study ID: ${saved.studyId}`);
                    studyId = saved.studyId;
                    if (!studyMetadata) studyMetadata = saved;
                }
            } catch (e) {
                // components/generator/generate.ts:25
                // ignore error
            }
        }
    }

    // If dry-run, we mock a study ID if none exists
    if (args.dryRun) {
        if (!studyId) studyId = 'dry-run-study-id';
    } else {
        // Construct metadata if we didn't load it
        if (!studyMetadata) {
            studyMetadata = {
                studyId: '',
                certSlug: cert.slug,
                certName: cert.name,
                issuer: cert.issuer,
                domains: domainsToGenerate.map(d => ({
                    domainId: d.domainId,
                    domainName: d.domainName,
                    domainNumber: d.domainNumber,
                    topics: d.topics
                })),
                lang: args.lang
            };
        }

        try {
            studyId = await studyManager.findOrCreateStudy(studyMetadata);
            studyMetadata.studyId = studyId; // Update in memory

            // Save/Update local study file with new ID
            const studyFilePath = args.studyFile
                ? path.resolve(process.cwd(), args.studyFile)
                : path.resolve(__dirname, '..', cert.slug, `${cert.slug}-study.json`);

            fs.mkdirSync(path.dirname(studyFilePath), { recursive: true });
            fs.writeFileSync(studyFilePath, JSON.stringify(studyMetadata, null, 2), 'utf-8');
            console.log(`   💾 Updated study metadata: ${path.relative(process.cwd(), studyFilePath)}`);
        } catch (err) {
            console.error(`❌ Study creation failed: ${(err as Error).message}`);
            process.exit(1);
        }
    }

    // ── 3. Generate Questions (Loop domains) ──

    let totalGenerated = 0;
    let totalErrors = 0;
    const batchFiles: string[] = [];

    for (const domain of domainsToGenerate) {
        if (args.dryRun) {
            console.log(`\n${'═'.repeat(60)}`);
            console.log(`📚 Domain ${domain.domainNumber}: ${domain.domainName} (${domain.domainWeight}%)`);
            console.log(`   Topics: ${domain.topics.join(', ')}`);
            console.log(`${'═'.repeat(60)}`);
        }

        // Generate in batches of 5 to avoid context limits
        const BATCH_SIZE = 5;
        const totalNeeded = args.count;
        let generatedForDomain = 0;

        while (generatedForDomain < totalNeeded) {
            const count = Math.min(BATCH_SIZE, totalNeeded - generatedForDomain);

            // Deduplication
            const existing = loadExistingQuestionTexts(cert.slug, domain);

            const systemPrompt = buildSystemPrompt(domain, count, existing, args.lang);
            const userPrompt = buildUserPrompt(count, domain, args.lang);

            try {
                if (args.dryRun) {
                    console.log(`   🚀 Calling ${isOpenAI ? 'OpenAI' : 'Groq'} (${args.model})...`);
                    // Simulate delay
                    await new Promise(r => setTimeout(r, 500));
                    generatedForDomain += count;
                    continue;
                }

                if (!client) throw new Error("Client not initialized");

                const response = await client.chatJSON<{ questions: GeneratedQuestion[] }>([
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ]);
                const questions = response.data.questions || [];

                // Validate
                const validation = validateBatch(questions);
                const validQuestions = questions.filter((_, i) => validation.results[i].valid);
                const invalidCount = questions.length - validQuestions.length;
                console.log(`   📊 Difficulty: easy=${validation.difficultyDistribution.easy} medium=${validation.difficultyDistribution.medium} hard=${validation.difficultyDistribution.hard}`);

                if (validQuestions.length > 0) {
                    const batchPath = saveBatch(cert, domain, validQuestions, args.model, args.lang, studyId);
                    batchFiles.push(batchPath);
                    totalGenerated += validQuestions.length;
                    generatedForDomain += validQuestions.length;
                    console.log(`   💾 Saved batch: ${path.relative(process.cwd(), batchPath)}`);
                }

                if (invalidCount > 0) {
                    console.log(`   ⚠️  Dropped ${invalidCount} invalid question(s)`);
                }
            } catch (err) {
                console.error(`   ❌ Error: ${(err as Error).message}`);
                totalErrors++;
                break; // Stop domain generation on error
            }
        }
    }



    // ── Summary ──
    console.log(`\n${'═'.repeat(60)}`);
    console.log('📊 GENERATION SUMMARY');
    console.log(`${'═'.repeat(60)}`);
    console.log(`   Cert: ${cert.name}`);
    console.log(`   Total questions generated: ${totalGenerated}`);
    console.log(`   Domains processed: ${domainsToGenerate.length}`);
    console.log(`   Errors: ${totalErrors}`);
    console.log(`   Batch files created: ${batchFiles.length}`);

    if (batchFiles.length === 0 && (!args.dryRun || client)) {
        console.log('No batches generated.');
        return;
    }

    // ── 4. Pause for Review ──
    if (!args.noImport && !args.dryRun && batchFiles.length > 0) {
        console.log(`\n${'═'.repeat(60)}`);
        console.log('✋ GENERATION COMPLETE - PAUSED FOR REVIEW');
        console.log(`${'═'.repeat(60)}`);
        console.log(`   Generated: ${totalGenerated} questions`);
        console.log(`   Files: ${batchFiles.length}`);
        console.log(`   Study ID: ${studyId}`);

        if (!args.autoApprove) {
            const rl = createInterface({ input: process.stdin, output: process.stdout });
            const answer = await new Promise<string>(resolve => {
                rl.question('\n   👉 Proceed to import to Marketplace? (Y/n) ', resolve);
            });
            rl.close();

            if (answer.toLowerCase() === 'n') {
                console.log('   🛑 Import skipped. You can import manually later.');
                return;
            }
        }

        // ── 5. Import ──
        await importBatchToMarketplace(batchFiles, studyId, false);
    }
}

function saveBatch(
    cert: CertInfo,
    domain: DomainMeta,
    questions: GeneratedQuestion[],
    model: string,
    lang: string,
    studyId: string
): string {
    const dirName = `domain-${domain.domainNumber}-${domain.domainId}`;
    const dirPath = path.resolve(__dirname, '..', cert.slug, dirName);
    fs.mkdirSync(dirPath, { recursive: true });

    // Find next batch number
    const existingFiles = fs.existsSync(dirPath)
        ? fs.readdirSync(dirPath).filter(f => /^batch-\d{3}\.json$/.test(f))
        : [];
    const maxBatch = existingFiles.reduce((max, f) => {
        const num = parseInt(f.match(/batch-(\d{3})/)?.[1] || '0', 10);
        return Math.max(max, num);
    }, 0);
    const batchNumber = maxBatch + 1;
    const fileName = `batch-${String(batchNumber).padStart(3, '0')}.json`;

    const batch = {
        metadata: {
            certId: cert.slug,
            certName: cert.name,
            issuer: cert.issuer,
            domainId: domain.domainId,
            domainName: domain.domainName,
            domainNumber: domain.domainNumber,
            studyId,
            lang,
            batchNumber,
            generatedAt: new Date().toISOString(),
            generatedBy: `groq/${model}`,
            reviewedBy: null,
            reviewedAt: null,
            qaResult: null,
        },
        questions,
    };

    const filePath = path.join(dirPath, fileName);
    fs.writeFileSync(filePath, JSON.stringify(batch, null, 2), 'utf-8');
    return filePath;
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});

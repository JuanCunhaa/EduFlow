#!/usr/bin/env npx tsx
/**
 * Import Generated Batch → Marketplace (via Firebase Admin SDK)
 *
 * Reads generated batch JSON files and bulk-imports the questions
 * into the marketplace_questions Firestore collection.
 *
 * This bypasses the HTTP API and writes directly to Firestore,
 * same pattern as the existing migration scripts.
 *
 * Usage:
 *   npx tsx content/generator/import-to-marketplace.ts --file <batch.json> --study-id <studyId>
 *   npx tsx content/generator/import-to-marketplace.ts --file <batch.json> --study-id <studyId> --dry-run
 *   npx tsx content/generator/import-to-marketplace.ts --dir content/cissp/domain-1-sam --study-id <studyId>
 *
 * Required env (from .env.local):
 *   FIREBASE_ADMIN_PROJECT_ID
 *   FIREBASE_ADMIN_CLIENT_EMAIL
 *   FIREBASE_ADMIN_PRIVATE_KEY
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  cert as adminCert,
  getApps,
  initializeApp,
  type ServiceAccount,
} from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// ── Types ────────────────────────────────────────

interface BatchQuestion {
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
  questionType?: string;
}

interface BatchFile {
  metadata: {
    certId: string;
    certName?: string;
    issuer?: string;
    domainId: string;
    domainName?: string;
    domainNumber?: number;
    studyId?: string;
    lang?: string;
    batchNumber: number;
    generatedAt: string;
    generatedBy: string;
    reviewedBy: string | null;
    reviewedAt: string | null;
    qaResult?: string | null;
  };
  questions: BatchQuestion[];
}

interface MarketplaceStudy {
  name: string;
  abbreviation: string;
  isActive: boolean;
  domains: Array<{ id: string; name: string }>;
  questionCount: number;
}

// ── CLI ──────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const map = new Map<string, string>();

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') {
      map.set('dry-run', 'true');
    } else if (args[i].startsWith('--') && i + 1 < args.length) {
      map.set(args[i].slice(2), args[i + 1]);
      i++;
    }
  }

  const file = map.get('file');
  const dir = map.get('dir');
  const studyId = map.get('study-id');
  const dryRun = map.get('dry-run') === 'true';

  if ((!file && !dir) || !studyId) {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║   ExamFlow Batch Import → Marketplace                       ║
╚══════════════════════════════════════════════════════════════╝

Usage:
  npx tsx content/generator/import-to-marketplace.ts --file <batch.json> --study-id <id>
  npx tsx content/generator/import-to-marketplace.ts --dir <directory> --study-id <id>

Arguments:
  --file        Path to a single batch JSON file
  --dir         Path to a directory (imports all batch-*.json files)
  --study-id    Marketplace study Firestore document ID
  --dry-run     Validate without writing to Firestore

Environment (from .env.local):
  FIREBASE_ADMIN_PROJECT_ID
  FIREBASE_ADMIN_CLIENT_EMAIL
  FIREBASE_ADMIN_PRIVATE_KEY

Examples:
  npx tsx content/generator/import-to-marketplace.ts --file content/cissp/domain-1-sam/batch-001.json --study-id abc123
  npx tsx content/generator/import-to-marketplace.ts --dir content/cissp/domain-1-sam --study-id abc123 --dry-run
`);
    process.exit(2);
  }

  return { file, dir, studyId, dryRun };
}

// ── Firebase ─────────────────────────────────────

function initFirebase() {
  if (getApps().length > 0) return;

  const serviceAccount: ServiceAccount = {
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  if (
    !serviceAccount.projectId ||
    !serviceAccount.clientEmail ||
    !serviceAccount.privateKey
  ) {
    console.error('❌ Missing Firebase Admin credentials in .env.local');
    console.error(
      '   Required: FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY'
    );
    process.exit(1);
  }

  initializeApp({ credential: adminCert(serviceAccount) });
}

// ── Exported Function ────────────────────────────

export async function importBatchToMarketplace(
  files: string[],
  studyId: string,
  dryRun: boolean
): Promise<void> {
  initFirebase();
  const db = getFirestore();

  // ── Verify study exists ──
  const studyRef = db.collection('marketplace_studies').doc(studyId);
  const studySnap = await studyRef.get();

  if (!studySnap.exists) {
    console.error(`❌ Marketplace study "${studyId}" not found in Firestore.`);
    throw new Error('Study not found');
  }

  const study = studySnap.data() as MarketplaceStudy;
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📦 IMPORT TO MARKETPLACE`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`   📚 Study: ${study.name} (${study.abbreviation})`);
  console.log(`   🆔 Study ID: ${studyId}`);
  console.log(`   📁 Files to process: ${files.length}`);
  if (dryRun) console.log(`   🧪 DRY RUN — no writes will be made`);

  // ── Pre-fetch existing questions for deduplication ──
  const existingQuestionsSnap = await db
    .collection('marketplace_questions')
    .where('studyId', '==', studyId)
    .select('text')
    .get();

  const existingTexts = new Set<string>();
  existingQuestionsSnap.forEach((doc) => {
    const data = doc.data();
    if (data.text) existingTexts.add(data.text.trim().toLowerCase());
  });

  console.log(`   📊 Existing questions in study: ${existingTexts.size}`);

  // ── Collect valid domain IDs from the study ──
  const validDomainIds = new Set(study.domains.map((d) => d.id));

  // ── Process each batch file ──
  let totalImported = 0;
  let totalSkippedDuplicate = 0;
  let totalSkippedInvalid = 0;
  const domainCounts = new Map<string, number>();

  for (const filePath of files) {
    const relativePath = path.relative(process.cwd(), filePath);

    // Read and parse the batch file
    if (!fs.existsSync(filePath)) {
      console.warn(`   ⚠️  File not found, skipping: ${relativePath}`);
      continue;
    }

    let batch: BatchFile;
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      batch = JSON.parse(raw) as BatchFile;
    } catch (err) {
      console.warn(
        `   ⚠️  Failed to parse ${relativePath}: ${(err as Error).message}`
      );
      continue;
    }

    if (
      !batch.questions ||
      !Array.isArray(batch.questions) ||
      batch.questions.length === 0
    ) {
      console.warn(`   ⚠️  No questions in ${relativePath}, skipping`);
      continue;
    }

    // Filter questions: dedup + validate structure
    const questionsToImport: BatchQuestion[] = [];

    for (const q of batch.questions) {
      // Deduplication check
      const normalizedText = q.text?.trim().toLowerCase();
      if (!normalizedText) {
        totalSkippedInvalid++;
        continue;
      }

      if (existingTexts.has(normalizedText)) {
        totalSkippedDuplicate++;
        continue;
      }

      // Basic structure validation
      if (!q.options || q.options.length < 4) {
        totalSkippedInvalid++;
        continue;
      }
      if (
        typeof q.correctOptionIndex !== 'number' ||
        q.correctOptionIndex < 0 ||
        q.correctOptionIndex >= q.options.length
      ) {
        totalSkippedInvalid++;
        continue;
      }
      if (!q.explanation?.short) {
        totalSkippedInvalid++;
        continue;
      }

      // Fix domainIds: if they use "d1", "d2" format, map them to actual study domain IDs
      let domainIds = q.domainIds || [];
      if (domainIds.length > 0) {
        const mappedIds = domainIds.map((id) => {
          // If the domainId is like "d1", "d2", etc., map to actual domain ID
          const match = /^d(\d+)$/.exec(id);
          if (match) {
            const domainNumber = Number.parseInt(match[1], 10);
            const domain = study.domains.find(
              (d: any) => d.order === domainNumber
            );
            return domain ? domain.id : id;
          }
          return id;
        });
        domainIds = mappedIds;
      }

      // If domainIds is empty, use the batch metadata's domainId
      if (domainIds.length === 0 && batch.metadata.domainId) {
        domainIds = [batch.metadata.domainId];
      }

      // Validate domainIds against study domains
      const validIds = domainIds.filter((id) => validDomainIds.has(id));
      if (validIds.length === 0) {
        // Try batch metadata domainId as fallback
        if (
          batch.metadata.domainId &&
          validDomainIds.has(batch.metadata.domainId)
        ) {
          domainIds = [batch.metadata.domainId];
        } else {
          console.warn(
            `   ⚠️  Question skipped — no valid domainIds: [${domainIds.join(', ')}]`
          );
          totalSkippedInvalid++;
          continue;
        }
      } else {
        domainIds = validIds;
      }

      // Update the question with corrected domainIds
      q.domainIds = domainIds;

      // Mark as seen for dedup within the current run
      existingTexts.add(normalizedText);
      questionsToImport.push(q);
    }

    if (questionsToImport.length === 0) {
      console.log(
        `   ⏭️  ${relativePath}: 0 new questions (all duplicates/invalid)`
      );
      continue;
    }

    console.log(
      `   📄 ${relativePath}: ${questionsToImport.length} questions to import`
    );

    if (dryRun) {
      totalImported += questionsToImport.length;
      for (const q of questionsToImport) {
        for (const dId of q.domainIds) {
          domainCounts.set(dId, (domainCounts.get(dId) || 0) + 1);
        }
      }
      continue;
    }

    // ── Write to Firestore in batches of 498 ──
    const BATCH_LIMIT = 498;
    const now = FieldValue.serverTimestamp();

    for (let i = 0; i < questionsToImport.length; i += BATCH_LIMIT) {
      const chunk = questionsToImport.slice(i, i + BATCH_LIMIT);
      const writeBatch = db.batch();

      for (const q of chunk) {
        const ref = db.collection('marketplace_questions').doc();
        writeBatch.set(ref, {
          studyId,
          text: q.text,
          options: q.options,
          correctOptionIndex: q.correctOptionIndex,
          explanation: {
            short: q.explanation.short,
            whyOthersWrong: q.explanation.whyOthersWrong || {},
          },
          difficulty: q.difficulty || 'medium',
          domainIds: q.domainIds,
          tags: q.tags || [],
          questionType: q.questionType || 'mcq',
          isActive: true,
          createdAt: now,
          updatedAt: now,
          createdBy: 'system-generator',
        });

        // Track domain counts for study counter update
        for (const dId of q.domainIds) {
          domainCounts.set(dId, (domainCounts.get(dId) || 0) + 1);
        }
      }

      await writeBatch.commit();
      totalImported += chunk.length;
      console.log(`      ✅ Committed batch: ${chunk.length} questions`);
    }
  }

  // ── Update study counters ──
  if (!dryRun && totalImported > 0) {
    const counterUpdates: Record<string, unknown> = {
      questionCount: FieldValue.increment(totalImported),
      updatedAt: FieldValue.serverTimestamp(),
    };
    for (const [domainId, count] of domainCounts) {
      counterUpdates[`domainQuestionCounts.${domainId}`] =
        FieldValue.increment(count);
    }
    await studyRef.update(counterUpdates);
    console.log(`   📈 Updated study counters: +${totalImported} total`);
  }

  // ── Summary ──
  console.log(`\n${'═'.repeat(60)}`);
  console.log('📊 IMPORT SUMMARY');
  console.log(`${'═'.repeat(60)}`);
  console.log(`   ✅ Imported: ${totalImported}`);
  console.log(`   ⏭️  Skipped (duplicate): ${totalSkippedDuplicate}`);
  console.log(`   ❌ Skipped (invalid): ${totalSkippedInvalid}`);
  if (domainCounts.size > 0) {
    console.log(`   📚 Per domain:`);
    for (const [dId, count] of domainCounts) {
      console.log(`      ${dId}: +${count}`);
    }
  }
  if (dryRun) {
    console.log(`   🧪 DRY RUN — no data was written`);
  }
}

// ── Main (CLI) ───────────────────────────────────

import { fileURLToPath } from 'url';

async function main() {
  const args = parseArgs();

  // Resolve files
  let batchFiles: string[] = [];
  if (args.file) {
    const fullPath = path.resolve(process.cwd(), args.file);
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ File not found: ${args.file}`);
      process.exit(1);
    }
    batchFiles = [fullPath];
  } else if (args.dir) {
    const fullDir = path.resolve(process.cwd(), args.dir);
    if (!fs.existsSync(fullDir)) {
      console.error(`❌ Directory not found: ${args.dir}`);
      process.exit(1);
    }

    const findBatchFiles = (dir: string): string[] => {
      let results: string[] = [];
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
          results = results.concat(findBatchFiles(filePath));
        } else if (/^batch-\d{3}\.json$/.test(file)) {
          results.push(filePath);
        }
      }
      return results;
    };
    batchFiles = findBatchFiles(fullDir).sort();
  }

  if (batchFiles.length === 0) {
    console.error('❌ No batch files found.');
    process.exit(1);
  }

  console.log(`\n📁 Found ${batchFiles.length} batch file(s)`);
  await importBatchToMarketplace(batchFiles, args.studyId, args.dryRun);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

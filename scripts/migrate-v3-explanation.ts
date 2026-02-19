/**
 * Migration script: v2 → v3 (structured explanation)
 *
 * Converts existing questions from the old flat explanation format:
 *   { explanation: string, whyOthersWrong: string | null }
 * to the new structured format:
 *   { explanation: { short: string, whyOthersWrong: Record<string, string> } }
 *
 * Features:
 * - Idempotent: skips questions already in the new format
 * - Batched writes: respects Firestore 500 ops/batch limit
 * - Dry-run mode: pass --dry-run to preview changes without writing
 *
 * Usage:
 *   npx ts-node scripts/migrate-v3-explanation.ts
 *   npx ts-node scripts/migrate-v3-explanation.ts --dry-run
 */

import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_SIZE = 400; // stay under Firestore's 500 limit

interface MigrationStats {
  total: number;
  migrated: number;
  skipped: number;
  errors: number;
}

async function migrateUserQuestions(uid: string): Promise<MigrationStats> {
  const stats: MigrationStats = {
    total: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
  };
  const questionsRef = db.collection(`users/${uid}/questions`);
  const snapshot = await questionsRef.get();

  let batch = db.batch();
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    stats.total++;
    const data = doc.data();

    // Already migrated — explanation is an object
    if (
      typeof data.explanation === 'object' &&
      data.explanation !== null &&
      'short' in data.explanation
    ) {
      stats.skipped++;
      continue;
    }

    // Build new structured explanation
    const shortExplanation: string =
      typeof data.explanation === 'string' ? data.explanation : '';
    const whyOthersWrong: Record<string, string> = {};

    // Attempt to parse old whyOthersWrong string if present
    if (typeof data.whyOthersWrong === 'string' && data.whyOthersWrong.trim()) {
      // Best-effort: put legacy text under a single key
      whyOthersWrong._legacy = data.whyOthersWrong;
    }

    const update: Record<string, unknown> = {
      explanation: { short: shortExplanation, whyOthersWrong },
    };

    // Remove the old top-level whyOthersWrong field
    if ('whyOthersWrong' in data) {
      update.whyOthersWrong = admin.firestore.FieldValue.delete();
    }

    if (!DRY_RUN) {
      batch.update(doc.ref, update);
      batchCount++;

      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }

    stats.migrated++;
  }

  // Commit remaining
  if (!DRY_RUN && batchCount > 0) {
    await batch.commit();
  }

  return stats;
}

async function main() {
  console.log(
    `\n🔄 Migration v3: Structured Explanation${DRY_RUN ? ' (DRY RUN)' : ''}\n`
  );

  // Get all user document IDs
  const usersSnap = await db.collection('users').get();
  const userIds = usersSnap.docs.map((d) => d.id);
  console.log(`Found ${userIds.length} users\n`);

  let globalStats: MigrationStats = {
    total: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
  };

  for (const uid of userIds) {
    try {
      const stats = await migrateUserQuestions(uid);
      globalStats.total += stats.total;
      globalStats.migrated += stats.migrated;
      globalStats.skipped += stats.skipped;
      globalStats.errors += stats.errors;

      if (stats.total > 0) {
        console.log(
          `  ✅ ${uid}: ${stats.migrated} migrated, ${stats.skipped} skipped (${stats.total} total)`
        );
      }
    } catch (err) {
      globalStats.errors++;
      console.error(`  ❌ ${uid}: ${err}`);
    }
  }

  console.log(`\n── Summary ──`);
  console.log(`  Total questions: ${globalStats.total}`);
  console.log(`  Migrated:        ${globalStats.migrated}`);
  console.log(`  Skipped:         ${globalStats.skipped}`);
  console.log(`  Errors:          ${globalStats.errors}`);
  console.log(
    `${DRY_RUN ? '\n⚠️  DRY RUN — no changes were written\n' : '\n✅ Migration complete\n'}`
  );
}

main().catch(console.error);

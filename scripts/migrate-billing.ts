/**
 * Migration script: Backfill `plan: 'free'` on all existing UserProfile docs.
 *
 * This is non-destructive — uses merge: true and skips docs that already have a plan field.
 * Safe to run multiple times (idempotent).
 *
 * Usage:
 *   npx tsx scripts/migrate-billing.ts [--dry-run]
 *
 * Requires FIREBASE_ADMIN_* env vars.
 */

import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const DRY_RUN = process.argv.includes('--dry-run');

function initFirebase() {
    if (getApps().length > 0) return;

    const serviceAccount: ServiceAccount = {
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    initializeApp({ credential: cert(serviceAccount) });
}

interface MigrationLog {
    uid: string;
    action: 'updated' | 'skipped';
    hadPlan: boolean;
    existingPlan?: string;
}

async function main() {
    initFirebase();
    const db = getFirestore();

    console.log(`\n🔄 Billing Migration — Backfill plan: 'free'`);
    console.log(`   Mode: ${DRY_RUN ? '🔍 DRY RUN (no writes)' : '✏️  LIVE'}`);
    console.log('');

    const usersSnap = await db.collection('users').get();
    console.log(`   Found ${usersSnap.size} user documents.\n`);

    const logs: MigrationLog[] = [];
    let updated = 0;
    let skipped = 0;

    for (const doc of usersSnap.docs) {
        const data = doc.data();
        const uid = doc.id;

        // Skip if already has a plan field
        if (data.plan) {
            logs.push({
                uid,
                action: 'skipped',
                hadPlan: true,
                existingPlan: data.plan,
            });
            skipped++;
            continue;
        }

        if (!DRY_RUN) {
            await doc.ref.set(
                {
                    plan: 'free',
                    stripeCustomerId: null,
                    stripeSubscriptionId: null,
                    stripeSubscriptionStatus: null,
                    planPeriodEnd: null,
                    trialEndsAt: null,
                },
                { merge: true }
            );
        }

        logs.push({
            uid,
            action: 'updated',
            hadPlan: false,
        });
        updated++;
    }

    // Summary
    console.log('── Results ─────────────────────────');
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped} (already had plan field)`);
    console.log(`   Total:   ${usersSnap.size}`);
    console.log('');

    // Detail log
    if (logs.length <= 50) {
        for (const entry of logs) {
            const icon = entry.action === 'updated' ? '✅' : '⏭️';
            const detail = entry.hadPlan ? `(existing: ${entry.existingPlan})` : '';
            console.log(`   ${icon} ${entry.uid} — ${entry.action} ${detail}`);
        }
    } else {
        console.log(`   (${logs.length} entries — showing first 20)`);
        for (const entry of logs.slice(0, 20)) {
            const icon = entry.action === 'updated' ? '✅' : '⏭️';
            const detail = entry.hadPlan ? `(existing: ${entry.existingPlan})` : '';
            console.log(`   ${icon} ${entry.uid} — ${entry.action} ${detail}`);
        }
    }

    console.log('\n✅ Migration complete.\n');
}

main().catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});

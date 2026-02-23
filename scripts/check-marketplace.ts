/**
 * Quick diagnostic script to check marketplace_studies in Firestore.
 * Run with: npx tsx scripts/check-marketplace.ts
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Init Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
            clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

const db = admin.firestore();

async function main() {
    console.log('\n=== MARKETPLACE DIAGNOSTIC ===\n');

    // 1. List ALL docs in marketplace_studies (no filter)
    console.log('1. All docs in marketplace_studies (unfiltered):');
    const allDocs = await db.collection('marketplace_studies').get();
    console.log(`   Total documents: ${allDocs.size}`);
    allDocs.forEach(doc => {
        const d = doc.data();
        console.log(`   - [${doc.id}] "${d.name}" | isActive=${d.isActive} | createdAt type=${typeof d.createdAt} | createdAt=${JSON.stringify(d.createdAt)}`);
    });

    // 2. Try filtered query (isActive == true, orderBy createdAt desc)
    console.log('\n2. Filtered query (isActive==true, orderBy createdAt desc):');
    try {
        const filtered = await db.collection('marketplace_studies')
            .where('isActive', '==', true)
            .orderBy('createdAt', 'desc')
            .get();
        console.log(`   Results: ${filtered.size}`);
        filtered.forEach(doc => {
            const d = doc.data();
            console.log(`   - [${doc.id}] "${d.name}"`);
        });
    } catch (err) {
        console.error('   ❌ QUERY FAILED:', err);
    }

    // 3. Check Firestore indexes
    console.log('\n3. Testing simple query (isActive==true, no orderBy):');
    try {
        const simple = await db.collection('marketplace_studies')
            .where('isActive', '==', true)
            .get();
        console.log(`   Results: ${simple.size}`);
    } catch (err) {
        console.error('   ❌ SIMPLE QUERY FAILED:', err);
    }

    console.log('\n=== DONE ===\n');
    process.exit(0);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});

/**
 * One-off script to set a user as admin via Firebase custom claims.
 * Usage: npx tsx scripts/set-admin.ts <UID>
 */
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from 'dotenv';

config({ path: '.env.local' });

if (!getApps().length) {
    initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
            clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

const uid = process.argv[2];
if (!uid) {
    console.error('Usage: npx tsx scripts/set-admin.ts <UID>');
    process.exit(1);
}

async function main() {
    const auth = getAuth();
    const db = getFirestore();

    const user = await auth.getUser(uid);
    console.log(`User: ${user.email} (${uid})`);

    await auth.setCustomUserClaims(uid, { roles: ['admin'] });
    console.log('✅ Admin custom claims set');

    await db.collection('users').doc(uid).set(
        { roles: ['admin'] },
        { merge: true }
    );
    console.log('✅ Firestore user doc updated');
    console.log('\n⚠  User must log out and back in for changes to take effect.');
}

main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});

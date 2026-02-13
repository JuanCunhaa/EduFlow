import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getApps, initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

export interface StudyMetadata {
    studyId?: string;
    certSlug: string;
    certName: string;
    issuer: string;
    domains: {
        domainId: string;
        domainName: string;
        domainNumber: number;
        topics: string[];
    }[];
    lang: string;
}

export class StudyManager {
    private db;

    constructor() {
        this.initFirebase();
        this.db = getFirestore();
    }

    private initFirebase() {
        if (getApps().length > 0) return;

        const serviceAccount: ServiceAccount = {
            projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
            clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        };

        if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
            throw new Error('Missing Firebase Admin credentials in .env.local');
        }

        initializeApp({ credential: cert(serviceAccount) });
    }

    async findOrCreateStudy(meta: StudyMetadata): Promise<string> {
        // 1. If studyId is explicitly provided in metadata, verify it exists
        if (meta.studyId) {
            const doc = await this.db.collection('marketplace_studies').doc(meta.studyId).get();
            if (doc.exists) {
                console.log(`   ✅ Using existing study: ${meta.studyId}`);
                // Patch: Backfill tags if missing (for legacy studies)
                const data = doc.data();
                if (!data?.tags || data.tags.length === 0) {
                    const allTopics = new Set<string>();
                    meta.domains.forEach(d => d.topics.forEach(t => allTopics.add(t)));
                    await doc.ref.update({ tags: Array.from(allTopics) });
                    console.log(`   ✨ Backfilled missing tags for study: ${meta.studyId}`);
                }
                return meta.studyId;
            }
            console.warn(`   ⚠️  Study ID ${meta.studyId} from file not found in Firestore. Creating new one...`);
        }

        // 2. Try to find by slug/abbreviation matches to avoid duplicates?
        // Actually, for "Marketplace", we might want unique studies per cert?
        // Let's search by abbreviation == certSlug
        const snapshot = await this.db.collection('marketplace_studies')
            .where('abbreviation', '==', meta.certSlug)
            .limit(1)
            .get();

        if (!snapshot.empty) {
            const existingId = snapshot.docs[0].id;
            console.log(`   ✅ Found existing study for ${meta.certSlug}: ${existingId}`);
            return existingId;
        }

        // 3. Create new study
        console.log(`   ✨ Creating new Marketplace Study for ${meta.certName}...`);

        const now = FieldValue.serverTimestamp();

        const domains = meta.domains.map(d => ({
            id: d.domainId,
            name: d.domainName,
            abbreviation: d.domainId.toUpperCase(),
            order: d.domainNumber
        }));

        const domainQuestionCounts: Record<string, number> = {};
        const allTopics = new Set<string>();

        meta.domains.forEach(d => {
            domainQuestionCounts[d.domainId] = 0;
            d.topics.forEach(t => allTopics.add(t));
        });

        const newStudy = {
            name: meta.certName,
            abbreviation: meta.certSlug,
            description: `Exam preparation for ${meta.certName} (${meta.issuer})`,
            domains,
            questionCount: 0,
            domainQuestionCounts,
            importCount: 0,
            tags: Array.from(allTopics), // Populate tags from topics
            isActive: true,
            createdAt: now,
            updatedAt: now,
            createdBy: 'system',
            accentColor: '#3b82f6', // Default blue accent
        };

        const docRef = await this.db.collection('marketplace_studies').add(newStudy);
        console.log(`   🚀 Created study ID: ${docRef.id}`);

        return docRef.id;
    }
}

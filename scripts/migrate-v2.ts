/**
 * Migration script: v1 (certification-based) → v2 (study-based)
 *
 * This script converts existing data from the old schema to the new one:
 * 1. Creates Study documents from existing certifications
 * 2. Migrates questions (certification → studyId, domain+domainNumber → domainIds)
 * 3. Moves exams from top-level to user-scoped subcollection
 * 4. Initializes UserStats documents
 *
 * Features:
 * - Idempotent: safe to re-run
 * - Zero-downtime: backward-compatible reads still work via deprecated fields
 * - Batched writes: respects Firestore 500 ops/batch limit
 *
 * Usage: npx ts-node scripts/migrate-v2.ts
 * (or via API route for Vercel deployment)
 */

// This script is meant to be run server-side with firebase-admin credentials.
// In production, import from your admin SDK setup.

import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// ── Certification → Study mapping ────────────────

interface CertDomain {
  id: string;
  abbreviation: string;
  name: string;
  order: number;
}

/** Known certifications and their domain structures */
const CERT_TO_STUDY: Record<
  string,
  { abbreviation: string; name: string; domains: CertDomain[] }
> = {
  CISSP: {
    abbreviation: 'CISSP',
    name: 'Certified Information Systems Security Professional',
    domains: [
      {
        id: 'd1',
        abbreviation: 'SAM',
        name: 'Security and Risk Management',
        order: 0,
      },
      { id: 'd2', abbreviation: 'AS', name: 'Asset Security', order: 1 },
      {
        id: 'd3',
        abbreviation: 'SA',
        name: 'Security Architecture and Engineering',
        order: 2,
      },
      {
        id: 'd4',
        abbreviation: 'CNS',
        name: 'Communication and Network Security',
        order: 3,
      },
      {
        id: 'd5',
        abbreviation: 'IAM',
        name: 'Identity and Access Management',
        order: 4,
      },
      {
        id: 'd6',
        abbreviation: 'SAT',
        name: 'Security Assessment and Testing',
        order: 5,
      },
      { id: 'd7', abbreviation: 'SO', name: 'Security Operations', order: 6 },
      {
        id: 'd8',
        abbreviation: 'SSD',
        name: 'Software Development Security',
        order: 7,
      },
    ],
  },
  CC: {
    abbreviation: 'CC',
    name: 'Certified in Cybersecurity',
    domains: [
      { id: 'd1', abbreviation: 'SP', name: 'Security Principles', order: 0 },
      {
        id: 'd2',
        abbreviation: 'BC',
        name: 'Business Continuity, Disaster Recovery & Incident Response',
        order: 1,
      },
      {
        id: 'd3',
        abbreviation: 'AC',
        name: 'Access Controls Concepts',
        order: 2,
      },
      { id: 'd4', abbreviation: 'NS', name: 'Network Security', order: 3 },
      { id: 'd5', abbreviation: 'SO', name: 'Security Operations', order: 4 },
    ],
  },
  SSCP: {
    abbreviation: 'SSCP',
    name: 'Systems Security Certified Practitioner',
    domains: [
      {
        id: 'd1',
        abbreviation: 'SAC',
        name: 'Security Operations and Administration',
        order: 0,
      },
      { id: 'd2', abbreviation: 'AC', name: 'Access Controls', order: 1 },
      {
        id: 'd3',
        abbreviation: 'RIF',
        name: 'Risk Identification, Monitoring, and Analysis',
        order: 2,
      },
      {
        id: 'd4',
        abbreviation: 'IR',
        name: 'Incident Response and Recovery',
        order: 3,
      },
      { id: 'd5', abbreviation: 'CRY', name: 'Cryptography', order: 4 },
      {
        id: 'd6',
        abbreviation: 'NCS',
        name: 'Network and Communications Security',
        order: 5,
      },
      {
        id: 'd7',
        abbreviation: 'SSA',
        name: 'Systems and Application Security',
        order: 6,
      },
    ],
  },
  CCSP: {
    abbreviation: 'CCSP',
    name: 'Certified Cloud Security Professional',
    domains: [
      {
        id: 'd1',
        abbreviation: 'ARC',
        name: 'Cloud Concepts, Architecture and Design',
        order: 0,
      },
      { id: 'd2', abbreviation: 'DS', name: 'Cloud Data Security', order: 1 },
      {
        id: 'd3',
        abbreviation: 'PS',
        name: 'Cloud Platform and Infrastructure Security',
        order: 2,
      },
      {
        id: 'd4',
        abbreviation: 'AS',
        name: 'Cloud Application Security',
        order: 3,
      },
      {
        id: 'd5',
        abbreviation: 'SO',
        name: 'Cloud Security Operations',
        order: 4,
      },
      {
        id: 'd6',
        abbreviation: 'LR',
        name: 'Legal, Risk and Compliance',
        order: 5,
      },
    ],
  },
  CGRC: {
    abbreviation: 'CGRC',
    name: 'Certified in Governance, Risk and Compliance',
    domains: [
      {
        id: 'd1',
        abbreviation: 'IAP',
        name: 'Information Security Risk Management Program',
        order: 0,
      },
      {
        id: 'd2',
        abbreviation: 'SCO',
        name: 'Scope of the Information System',
        order: 1,
      },
      {
        id: 'd3',
        abbreviation: 'SEL',
        name: 'Selection and Approval of Security and Privacy Controls',
        order: 2,
      },
      {
        id: 'd4',
        abbreviation: 'IMP',
        name: 'Implementation of Security and Privacy Controls',
        order: 3,
      },
      {
        id: 'd5',
        abbreviation: 'ASS',
        name: 'Assessment/Audit of Security and Privacy Controls',
        order: 4,
      },
      {
        id: 'd6',
        abbreviation: 'AUT',
        name: 'Authorization/Approval of Information System',
        order: 5,
      },
      {
        id: 'd7',
        abbreviation: 'CMA',
        name: 'Continuous Monitoring',
        order: 6,
      },
    ],
  },
};

// ── Migration logic ──────────────────────────────

interface MigrationStats {
  studiesCreated: number;
  questionsMigrated: number;
  examsMigrated: number;
  statsDocs: number;
  errors: string[];
}

async function migrateUser(uid: string): Promise<MigrationStats> {
  const stats: MigrationStats = {
    studiesCreated: 0,
    questionsMigrated: 0,
    examsMigrated: 0,
    statsDocs: 0,
    errors: [],
  };

  console.log(`\n👤 Migrating user: ${uid}`);

  // Track certification → studyId mapping for this user
  const certToStudyId = new Map<string, string>();

  // Step 1: Create Study documents for each certification the user has used
  const questionsSnap = await db.collection(`users/${uid}/questions`).get();
  const usedCerts = new Set<string>();

  for (const doc of questionsSnap.docs) {
    const data = doc.data();
    if (data.certification) {
      usedCerts.add(data.certification);
    }
  }

  // Also check top-level exams
  const examsSnap = await db
    .collection('exams')
    .where('userId', '==', uid)
    .get();

  for (const doc of examsSnap.docs) {
    const data = doc.data();
    if (data.certification) {
      usedCerts.add(data.certification);
    }
  }

  for (const cert of usedCerts) {
    const studyInfo = CERT_TO_STUDY[cert];
    if (!studyInfo) {
      stats.errors.push(`Unknown certification: ${cert}`);
      continue;
    }

    // Check if study already exists (idempotency)
    const existingStudy = await db
      .collection(`users/${uid}/studies`)
      .where('abbreviation', '==', cert)
      .limit(1)
      .get();

    if (!existingStudy.empty) {
      certToStudyId.set(cert, existingStudy.docs[0].id);
      console.log(`  📋 Study for ${cert} already exists, skipping`);
      continue;
    }

    // Create new study
    const studyRef = await db.collection(`users/${uid}/studies`).add({
      abbreviation: studyInfo.abbreviation,
      name: studyInfo.name,
      domains: studyInfo.domains,
      questionCount: 0,
      examCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    certToStudyId.set(cert, studyRef.id);
    stats.studiesCreated++;
    console.log(`  ✅ Created study: ${cert} → ${studyRef.id}`);
  }

  // Step 2: Migrate questions
  const BATCH_SIZE = 500;
  let batch = db.batch();
  let batchCount = 0;
  let questionCountByCert = new Map<string, number>();

  for (const doc of questionsSnap.docs) {
    const data = doc.data();

    // Skip already migrated questions
    if (data.studyId && data.domainIds) {
      console.log(`  ⏭️  Question ${doc.id} already migrated, skipping`);
      continue;
    }

    const cert = data.certification;
    if (!cert || !certToStudyId.has(cert)) {
      stats.errors.push(
        `Question ${doc.id}: no studyId mapping for cert ${cert}`
      );
      continue;
    }

    const studyId = certToStudyId.get(cert)!;
    const domainIds = [`d${data.domainNumber || 1}`];

    batch.update(doc.ref, {
      studyId,
      domainIds,
      whyOthersWrong: data.whyOthersWrong ?? null,
      // Keep deprecated fields for backward compat
    });

    questionCountByCert.set(cert, (questionCountByCert.get(cert) || 0) + 1);
    stats.questionsMigrated++;
    batchCount++;

    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  // Update question counts on studies
  for (const [cert, count] of questionCountByCert) {
    const studyId = certToStudyId.get(cert)!;
    batch.update(db.doc(`users/${uid}/studies/${studyId}`), {
      questionCount: admin.firestore.FieldValue.increment(count),
    });
    batchCount++;
  }

  if (batchCount > 0) {
    await batch.commit();
    batch = db.batch();
    batchCount = 0;
  }

  console.log(`  📝 Migrated ${stats.questionsMigrated} questions`);

  // Step 3: Move exams from top-level to user-scoped subcollection
  let examCountByCert = new Map<string, number>();

  for (const doc of examsSnap.docs) {
    const data = doc.data();

    // Check if already exists in user-scoped collection
    const existingExam = await db.doc(`users/${uid}/exams/${doc.id}`).get();
    if (existingExam.exists) {
      console.log(`  ⏭️  Exam ${doc.id} already migrated, skipping`);
      continue;
    }

    const cert = data.certification;
    const studyId =
      cert && certToStudyId.has(cert) ? certToStudyId.get(cert)! : null;

    if (!studyId) {
      stats.errors.push(`Exam ${doc.id}: no studyId mapping for cert ${cert}`);
      continue;
    }

    // Convert old config format to new
    const oldConfig = data.config || {};
    const newConfig = {
      questionCount: oldConfig.questionCount || data.questionIds?.length || 0,
      timeLimitMinutes: oldConfig.timeLimitMinutes || 0,
      domainIds: (oldConfig.domains || []).map((d: number) => `d${d}`),
      difficulty: oldConfig.difficulty || 'all',
      mode: 'practice' as const,
    };

    // Convert domain scores — map old domain names to domainIds
    const newDomainScores: Record<string, unknown> = {};
    if (data.domainScores) {
      for (const [key, value] of Object.entries(data.domainScores)) {
        const ds = value as {
          domain: string;
          correct: number;
          total: number;
          percentage: number;
        };
        newDomainScores[key] = {
          ...ds,
          domainId: key,
        };
      }
    }

    // Copy exam to user-scoped subcollection with new fields
    batch.set(db.doc(`users/${uid}/exams/${doc.id}`), {
      ...data,
      studyId,
      config: newConfig,
      domainScores: newDomainScores,
    });

    examCountByCert.set(cert, (examCountByCert.get(cert) || 0) + 1);
    stats.examsMigrated++;
    batchCount++;

    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  // Update exam counts on studies
  for (const [cert, count] of examCountByCert) {
    const studyId = certToStudyId.get(cert)!;
    batch.update(db.doc(`users/${uid}/studies/${studyId}`), {
      examCount: admin.firestore.FieldValue.increment(count),
    });
    batchCount++;
  }

  if (batchCount > 0) {
    await batch.commit();
    batch = db.batch();
    batchCount = 0;
  }

  console.log(`  📋 Migrated ${stats.examsMigrated} exams`);

  // Step 4: Initialize stats document if it doesn't exist
  const statsDoc = await db.doc(`users/${uid}/stats/current`).get();
  if (!statsDoc.exists) {
    // Count existing exam history to pre-populate stats
    const historySnap = await db
      .collection(`users/${uid}/examHistory`)
      .orderBy('completedAt', 'desc')
      .limit(100)
      .get();

    let totalScore = 0;
    let examCount = 0;
    for (const doc of historySnap.docs) {
      const data = doc.data();
      if (typeof data.score === 'number') {
        totalScore += data.score;
        examCount++;
      }
    }

    await db.doc(`users/${uid}/stats/current`).set({
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: '',
      totalQuestionsAnswered: 0,
      totalExamsCompleted: examCount,
      dailyGoal: 10,
      badges: examCount > 0 ? ['first_exam'] : [],
      recentDays: [],
    });

    stats.statsDocs = 1;
    console.log(`  📊 Initialized stats document`);
  }

  // Step 5: Update user profile with activeStudyId
  const userDoc = await db.doc(`users/${uid}`).get();
  if (userDoc.exists) {
    const userData = userDoc.data()!;
    const targetCert = userData.targetCertification;
    const activeStudyId =
      targetCert && certToStudyId.has(targetCert)
        ? certToStudyId.get(targetCert)!
        : certToStudyId.values().next().value || null;

    await db.doc(`users/${uid}`).set(
      {
        activeStudyId,
      },
      { merge: true }
    );

    console.log(`  👤 Set activeStudyId: ${activeStudyId}`);
  }

  return stats;
}

// ── Main ─────────────────────────────────────────

async function main() {
  console.log('🚀 Starting v1 → v2 migration...\n');

  const usersSnap = await db.collection('users').get();
  const allStats: MigrationStats = {
    studiesCreated: 0,
    questionsMigrated: 0,
    examsMigrated: 0,
    statsDocs: 0,
    errors: [],
  };

  for (const userDoc of usersSnap.docs) {
    try {
      const userStats = await migrateUser(userDoc.id);
      allStats.studiesCreated += userStats.studiesCreated;
      allStats.questionsMigrated += userStats.questionsMigrated;
      allStats.examsMigrated += userStats.examsMigrated;
      allStats.statsDocs += userStats.statsDocs;
      allStats.errors.push(...userStats.errors);
    } catch (error) {
      console.error(`❌ Error migrating user ${userDoc.id}:`, error);
      allStats.errors.push(`User ${userDoc.id}: ${String(error)}`);
    }
  }

  console.log('\n═══════════════════════════════════════');
  console.log('📊 Migration Summary');
  console.log('═══════════════════════════════════════');
  console.log(`  Users processed:     ${usersSnap.size}`);
  console.log(`  Studies created:     ${allStats.studiesCreated}`);
  console.log(`  Questions migrated:  ${allStats.questionsMigrated}`);
  console.log(`  Exams migrated:      ${allStats.examsMigrated}`);
  console.log(`  Stats docs created:  ${allStats.statsDocs}`);
  console.log(`  Errors:              ${allStats.errors.length}`);

  if (allStats.errors.length > 0) {
    console.log('\n⚠️ Errors:');
    for (const err of allStats.errors) {
      console.log(`  - ${err}`);
    }
  }

  console.log('\n✅ Migration complete!');
}

main().catch(console.error);

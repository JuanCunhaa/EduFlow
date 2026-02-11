/**
 * StudyService — encapsulates all study-related business logic and data access.
 * Studies contain domains (embedded) and serve as the parent context for questions and exams.
 */

import { getAdminDb } from '@/lib/firebase/admin';
import {
    adminGetDoc,
    adminCreateDoc,
    adminUpdateDoc,
    adminDeleteDoc,
    serverTimestamp,
} from '@/lib/firebase/admin-firestore';
import { StudyNotFoundError } from '@/lib/errors';
import type { Study, StudyDomain } from '@/types';
import type { CreateStudyInput, UpdateStudyInput } from '@/lib/validators';

/** Returns the Firestore path for a user's studies collection */
function studiesPath(uid: string): string {
    return `users/${uid}/studies`;
}

// ── Read operations ──────────────────────────────

export async function listStudies(uid: string): Promise<Study[]> {
    const db = getAdminDb();
    const snap = await db
        .collection(studiesPath(uid))
        .orderBy('createdAt', 'desc')
        .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Study);
}

export async function getStudy(uid: string, studyId: string): Promise<Study> {
    const study = await adminGetDoc<Study>(studiesPath(uid), studyId);
    if (!study) throw new StudyNotFoundError();
    return study;
}

// ── Write operations ─────────────────────────────

export async function createStudy(uid: string, data: CreateStudyInput): Promise<string> {
    const now = serverTimestamp();

    // Auto-assign domain IDs if not provided with proper format
    const domains: StudyDomain[] = data.domains.map((d, i) => ({
        ...d,
        id: d.id || `d${i + 1}`,
        order: d.order ?? i,
    }));

    return adminCreateDoc(studiesPath(uid), {
        abbreviation: data.abbreviation,
        name: data.name,
        domains,
        questionCount: 0,
        examCount: 0,
        ...(data.accentColor ? { accentColor: data.accentColor } : {}),
        createdAt: now,
        updatedAt: now,
    });
}

export async function updateStudy(
    uid: string,
    studyId: string,
    data: UpdateStudyInput
): Promise<void> {
    const existing = await adminGetDoc<Study>(studiesPath(uid), studyId);
    if (!existing) throw new StudyNotFoundError();

    const update: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
    };

    if (data.abbreviation !== undefined) update.abbreviation = data.abbreviation;
    if (data.name !== undefined) update.name = data.name;
    if (data.accentColor !== undefined) update.accentColor = data.accentColor;
    if (data.domains !== undefined) {
        update.domains = data.domains.map((d, i) => ({
            ...d,
            id: d.id || `d${i + 1}`,
            order: d.order ?? i,
        }));
    }

    await adminUpdateDoc(studiesPath(uid), studyId, update);
}

export async function deleteStudy(uid: string, studyId: string): Promise<{ deletedQuestions: number; deletedExams: number }> {
    const existing = await adminGetDoc<Study>(studiesPath(uid), studyId);
    if (!existing) throw new StudyNotFoundError();

    const db = getAdminDb();

    // Count associated questions and exams for reporting
    const questionsSnap = await db
        .collection(`users/${uid}/questions`)
        .where('studyId', '==', studyId)
        .select()    // field-mask query — no data transfer
        .get();

    const examsSnap = await db
        .collection(`users/${uid}/exams`)
        .where('studyId', '==', studyId)
        .select()
        .get();

    // Delete in batches (max 500 per batch)
    const batchSize = 500;
    const allDocs = [...questionsSnap.docs, ...examsSnap.docs];

    for (let i = 0; i < allDocs.length; i += batchSize) {
        const batch = db.batch();
        const chunk = allDocs.slice(i, i + batchSize);
        for (const doc of chunk) {
            batch.delete(doc.ref);
        }
        await batch.commit();
    }

    // Delete the study itself
    await adminDeleteDoc(studiesPath(uid), studyId);

    return {
        deletedQuestions: questionsSnap.size,
        deletedExams: examsSnap.size,
    };
}

// ── Domain helpers ───────────────────────────────

/**
 * Validate that all given domainIds exist in the study's domains.
 * Returns the matching StudyDomain objects.
 */
export async function validateDomainIds(
    uid: string,
    studyId: string,
    domainIds: string[]
): Promise<StudyDomain[]> {
    const study = await getStudy(uid, studyId);
    const domainMap = new Map(study.domains.map((d) => [d.id, d]));

    const resolved: StudyDomain[] = [];
    const invalid: string[] = [];

    for (const id of domainIds) {
        const domain = domainMap.get(id);
        if (domain) {
            resolved.push(domain);
        } else {
            invalid.push(id);
        }
    }

    if (invalid.length > 0) {
        throw new Error(`Invalid domain IDs: ${invalid.join(', ')}`);
    }

    return resolved;
}

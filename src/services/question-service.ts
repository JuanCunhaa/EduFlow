/**
 * QuestionService — encapsulates all question-related business logic and data access.
 * v2: uses studyId + domainIds instead of certification + domain/domainNumber.
 */

import { getAdminDb } from '@/lib/firebase/admin';
import {
    adminGetDoc,
    adminCreateDoc,
    adminUpdateDoc,
    adminDeleteDoc,
    serverTimestamp,
} from '@/lib/firebase/admin-firestore';
import {
    QuestionNotFoundError,
} from '@/lib/errors';
import type { Question } from '@/types';
import type { CreateQuestionInput, UpdateQuestionInput } from '@/lib/validators';

/** Returns the Firestore path for a user's question bank */
function questionsPath(uid: string): string {
    return `users/${uid}/questions`;
}

// ── Read operations ──────────────────────────────

export interface ListQuestionsOptions {
    uid: string;
    studyId?: string;
    domainIds?: string[];
    difficulty?: string;
    search?: string;
    cursor?: string;
    limit?: number;
}

export interface ListQuestionsResult {
    questions: Question[];
    nextCursor: string | null;
}

export async function listQuestions(options: ListQuestionsOptions): Promise<ListQuestionsResult> {
    const {
        uid,
        studyId,
        domainIds,
        difficulty,
        search,
        cursor,
        limit: limitParam = 100,
    } = options;

    const limitCount = Math.min(Math.max(1, limitParam), 200);
    const db = getAdminDb();
    const path = questionsPath(uid);
    let q: FirebaseFirestore.Query = db.collection(path);

    if (studyId) q = q.where('studyId', '==', studyId);
    if (domainIds && domainIds.length > 0) {
        // Firestore array-contains-any supports up to 10 values
        q = q.where('domainIds', 'array-contains-any', domainIds.slice(0, 10));
    }
    if (difficulty && difficulty !== 'all') q = q.where('difficulty', '==', difficulty);

    q = q.orderBy('createdAt', 'desc');

    if (cursor) {
        const cursorDoc = await db.doc(`${path}/${cursor}`).get();
        if (cursorDoc.exists) {
            q = q.startAfter(cursorDoc);
        }
    }

    const snap = await q.limit(limitCount + 1).get();
    let questions = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Question);

    // Client-side text search (Firestore doesn't support full-text search)
    if (search) {
        const lower = search.toLowerCase();
        questions = questions.filter(q => {
            const explanationText = typeof q.explanation === 'string'
                ? q.explanation
                : q.explanation.short;
            return (
                q.text.toLowerCase().includes(lower) ||
                explanationText.toLowerCase().includes(lower) ||
                q.tags.some(t => t.toLowerCase().includes(lower))
            );
        });
    }

    const hasMore = questions.length > limitCount;
    const pageQuestions = hasMore ? questions.slice(0, limitCount) : questions;
    const nextCursor = hasMore ? pageQuestions.at(-1)?.id ?? null : null;

    return { questions: pageQuestions, nextCursor };
}

export async function getQuestion(uid: string, questionId: string): Promise<Question> {
    const question = await adminGetDoc<Question>(questionsPath(uid), questionId);
    if (!question) throw new QuestionNotFoundError();
    return question;
}

// ── Write operations ─────────────────────────────

export async function createQuestion(uid: string, data: CreateQuestionInput): Promise<string> {
    const now = serverTimestamp();
    const id = await adminCreateDoc(questionsPath(uid), {
        ...data,
        createdAt: now,
        updatedAt: now,
    });

    // Increment question count on the study
    const db = getAdminDb();
    const studyRef = db.doc(`users/${uid}/studies/${data.studyId}`);
    const { FieldValue } = await import('firebase-admin/firestore');
    await studyRef.update({ questionCount: FieldValue.increment(1) });

    return id;
}

export async function updateQuestion(
    uid: string,
    questionId: string,
    data: UpdateQuestionInput
): Promise<void> {
    const path = questionsPath(uid);
    const existing = await adminGetDoc<Question>(path, questionId);
    if (!existing) throw new QuestionNotFoundError();

    await adminUpdateDoc(path, questionId, {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

export async function deleteQuestion(uid: string, questionId: string): Promise<void> {
    const path = questionsPath(uid);
    const existing = await adminGetDoc<Question>(path, questionId);
    if (!existing) throw new QuestionNotFoundError();
    await adminDeleteDoc(path, questionId);

    // Decrement question count on the study
    const db = getAdminDb();
    const studyRef = db.doc(`users/${uid}/studies/${existing.studyId}`);
    const { FieldValue } = await import('firebase-admin/firestore');
    await studyRef.update({ questionCount: FieldValue.increment(-1) });
}

export async function importQuestions(
    uid: string,
    questions: CreateQuestionInput[]
): Promise<{ imported: number; ids: string[] }> {
    const now = serverTimestamp();
    const db = getAdminDb();
    const batch = db.batch();
    const ids: string[] = [];
    const questionsCol = db.collection(questionsPath(uid));
    const studyCounts = new Map<string, number>();

    for (const question of questions) {
        const ref = questionsCol.doc();
        batch.set(ref, {
            ...question,
            createdAt: now,
            updatedAt: now,
        });
        ids.push(ref.id);

        // Track count per study for denormalized counter
        studyCounts.set(question.studyId, (studyCounts.get(question.studyId) || 0) + 1);
    }

    // Update study counters in the same batch
    const { FieldValue } = await import('firebase-admin/firestore');
    for (const [studyId, count] of studyCounts) {
        const studyRef = db.doc(`users/${uid}/studies/${studyId}`);
        batch.update(studyRef, { questionCount: FieldValue.increment(count) });
    }

    await batch.commit();
    return { imported: ids.length, ids };
}

// ── Query for exam creation ──────────────────────

export interface FetchQuestionPoolOptions {
    uid: string;
    studyId: string;
    difficulty?: string;
    domainIds?: string[];
    limit?: number;
}

export async function fetchQuestionPool(options: FetchQuestionPoolOptions): Promise<Question[]> {
    const { uid, studyId, difficulty, domainIds, limit: fetchLimit = 500 } = options;
    const db = getAdminDb();
    const path = questionsPath(uid);

    let q: FirebaseFirestore.Query = db.collection(path)
        .where('studyId', '==', studyId);

    if (difficulty && difficulty !== 'all') {
        q = q.where('difficulty', '==', difficulty);
    }

    if (domainIds && domainIds.length > 0) {
        q = q.where('domainIds', 'array-contains-any', domainIds.slice(0, 10));
    }

    const snap = await q.limit(fetchLimit).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Question);
}

/**
 * Check if user has an in-progress exam containing a specific question.
 * Used to prevent cheating — strip correctOptionIndex if true.
 */
export async function isQuestionInActiveExam(uid: string, questionId: string): Promise<boolean> {
    const db = getAdminDb();
    const snap = await db
        .collection(`users/${uid}/exams`)
        .where('status', '==', 'in_progress')
        .where('questionIds', 'array-contains', questionId)
        .limit(1)
        .get();
    return !snap.empty;
}

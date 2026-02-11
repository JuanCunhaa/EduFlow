/**
 * QuestionService — encapsulates all question-related business logic and data access.
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
    certification?: string;
    domainNumber?: number;
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
        certification,
        domainNumber,
        difficulty,
        search,
        cursor,
        limit: limitParam = 100,
    } = options;

    const limitCount = Math.min(Math.max(1, limitParam), 200);
    const db = getAdminDb();
    const path = questionsPath(uid);
    let q: FirebaseFirestore.Query = db.collection(path);

    if (certification) q = q.where('certification', '==', certification);
    if (domainNumber) q = q.where('domainNumber', '==', domainNumber);
    if (difficulty && difficulty !== 'all') q = q.where('difficulty', '==', difficulty);

    q = q.orderBy('domainNumber', 'asc');

    if (cursor) {
        q = q.startAfter(db.doc(`${path}/${cursor}`));
    }

    const snap = await q.limit(limitCount + 1).get();
    let questions = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Question);

    // Client-side text search (Firestore doesn't support full-text search)
    // For production, consider Algolia/Typesense integration
    if (search) {
        const lower = search.toLowerCase();
        questions = questions.filter(q =>
            q.text.toLowerCase().includes(lower) ||
            q.domain.toLowerCase().includes(lower) ||
            q.explanation.toLowerCase().includes(lower) ||
            q.tags.some(t => t.toLowerCase().includes(lower))
        );
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
    return adminCreateDoc(questionsPath(uid), {
        ...data,
        createdAt: now,
        updatedAt: now,
    });
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

    for (const question of questions) {
        const ref = questionsCol.doc();
        batch.set(ref, {
            ...question,
            createdAt: now,
            updatedAt: now,
        });
        ids.push(ref.id);
    }

    await batch.commit();
    return { imported: ids.length, ids };
}

// ── Query for exam creation ──────────────────────

export interface FetchQuestionPoolOptions {
    uid: string;
    certification: string;
    difficulty?: string;
    domains?: number[];
    limit?: number;
}

export async function fetchQuestionPool(options: FetchQuestionPoolOptions): Promise<Question[]> {
    const { uid, certification, difficulty, domains, limit: fetchLimit = 500 } = options;
    const db = getAdminDb();
    const path = questionsPath(uid);

    let q: FirebaseFirestore.Query = db.collection(path)
        .where('certification', '==', certification);

    if (difficulty && difficulty !== 'all') {
        q = q.where('difficulty', '==', difficulty);
    }

    if (domains && domains.length > 0) {
        q = q.where('domainNumber', 'in', domains);
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
        .collection('exams')
        .where('userId', '==', uid)
        .where('status', '==', 'in_progress')
        .where('questionIds', 'array-contains', questionId)
        .limit(1)
        .get();
    return !snap.empty;
}

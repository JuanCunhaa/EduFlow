/**
 * ContentAuditService — audit trail for all content pipeline actions.
 *
 * Firestore collection: content_audit/{entryId}
 *
 * Logs every content action: created, reviewed, approved, rejected,
 * imported, archived, edited, flagged, reported.
 *
 * Day 1–60: git history is sufficient. This service adds structured
 * queryable audit data for when non-technical reviewers need visibility.
 */

import { getAdminDb } from '@/lib/firebase/admin';
import {
    adminCreateDoc,
    adminQuery,
    serverTimestamp,
} from '@/lib/firebase/admin-firestore';
import { logger } from '@/lib/logger';
import type { ContentAuditEntry, ContentAction } from '@/types';

// ── Collection ───────────────────────────────────

const AUDIT_COL = 'content_audit';

// ── Log an Audit Entry ───────────────────────────

export interface LogAuditInput {
    action: ContentAction;
    actor: string;
    batchId?: string;
    studyId?: string;
    questionId?: string;
    questionCount?: number;
    notes?: string;
    metadata?: Record<string, unknown>;
}

export async function logContentAudit(data: LogAuditInput): Promise<string> {
    const now = serverTimestamp();

    const id = await adminCreateDoc(AUDIT_COL, {
        action: data.action,
        actor: data.actor,
        batchId: data.batchId ?? null,
        studyId: data.studyId ?? null,
        questionId: data.questionId ?? null,
        questionCount: data.questionCount ?? null,
        notes: data.notes ?? null,
        metadata: data.metadata ?? null,
        createdAt: now,
    });

    logger.info('Content audit logged', {
        meta: {
            auditId: id,
            action: data.action,
            actor: data.actor,
            batchId: data.batchId,
            studyId: data.studyId,
            questionCount: data.questionCount,
        },
    });

    return id;
}

// ── Query Audit Entries ──────────────────────────

export interface ListAuditOptions {
    action?: ContentAction;
    actor?: string;
    studyId?: string;
    batchId?: string;
    limit?: number;
    cursor?: string;
}

export async function listContentAudit(
    options: ListAuditOptions = {}
): Promise<{ entries: ContentAuditEntry[]; nextCursor: string | null }> {
    const { action, actor, studyId, batchId, limit: limitParam = 50, cursor } = options;
    const limitCount = Math.min(Math.max(1, limitParam), 100);
    const db = getAdminDb();

    let q: FirebaseFirestore.Query = db.collection(AUDIT_COL)
        .orderBy('createdAt', 'desc');

    if (action) q = q.where('action', '==', action);
    if (actor) q = q.where('actor', '==', actor);
    if (studyId) q = q.where('studyId', '==', studyId);
    if (batchId) q = q.where('batchId', '==', batchId);

    if (cursor) {
        const cursorDoc = await db.collection(AUDIT_COL).doc(cursor).get();
        if (cursorDoc.exists) {
            q = q.startAfter(cursorDoc);
        }
    }

    const snap = await q.limit(limitCount + 1).get();
    const entries = snap.docs.map(d => ({ id: d.id, ...d.data() }) as ContentAuditEntry);

    const hasMore = entries.length > limitCount;
    const pageEntries = hasMore ? entries.slice(0, limitCount) : entries;
    const nextCursor = hasMore ? pageEntries.at(-1)?.id ?? null : null;

    return { entries: pageEntries, nextCursor };
}

// ── Convenience loggers ──────────────────────────

export async function logBatchCreated(
    actor: string,
    batchId: string,
    studyId: string,
    questionCount: number
): Promise<string> {
    return logContentAudit({
        action: 'created',
        actor,
        batchId,
        studyId,
        questionCount,
        notes: `Batch ${batchId} created with ${questionCount} questions`,
    });
}

export async function logBatchReviewed(
    actor: string,
    batchId: string,
    studyId: string,
    questionCount: number,
    approved: boolean,
    notes?: string
): Promise<string> {
    return logContentAudit({
        action: approved ? 'approved' : 'rejected',
        actor,
        batchId,
        studyId,
        questionCount,
        notes: notes ?? `Batch ${batchId} ${approved ? 'approved' : 'rejected'}`,
    });
}

export async function logBatchImported(
    actor: string,
    batchId: string,
    studyId: string,
    questionCount: number
): Promise<string> {
    return logContentAudit({
        action: 'imported',
        actor,
        batchId,
        studyId,
        questionCount,
        notes: `Batch ${batchId} imported: ${questionCount} questions`,
    });
}

export async function logQuestionArchived(
    actor: string,
    questionId: string,
    studyId: string,
    reason: string
): Promise<string> {
    return logContentAudit({
        action: 'archived',
        actor,
        questionId,
        studyId,
        notes: reason,
    });
}

export async function logQuestionFlagged(
    actor: string,
    questionId: string,
    studyId: string,
    reason: string
): Promise<string> {
    return logContentAudit({
        action: 'flagged',
        actor,
        questionId,
        studyId,
        notes: reason,
    });
}

export async function logQuestionEdited(
    actor: string,
    questionId: string,
    studyId: string,
    notes?: string
): Promise<string> {
    return logContentAudit({
        action: 'edited',
        actor,
        questionId,
        studyId,
        notes,
    });
}

/**
 * MarketplaceService — global study/question catalog with import to personal namespace.
 *
 * Firestore collections:
 * - marketplace_studies/{studyId}      — global, admin-managed
 * - marketplace_questions/{questionId} — global, admin-managed
 * - users/{uid}/studies/{studyId}      — personal copy after import
 * - users/{uid}/questions/{questionId} — personal copy after import
 *
 * Security model:
 * - Admin CRUD: all writes go through this service, called only from withAdmin routes
 * - Browse: authenticated users can list/get active marketplace content
 * - Import: authenticated users can copy marketplace content to their personal namespace
 */

import { getAdminDb } from '@/lib/firebase/admin';
import {
    adminGetDoc,
    adminCreateDoc,
    adminUpdateDoc,
    serverTimestamp,
} from '@/lib/firebase/admin-firestore';
import { FieldValue } from 'firebase-admin/firestore';
import {
    MarketplaceStudyNotFoundError,
    MarketplaceQuestionNotFoundError,
    MarketplaceImportConflictError,
    ValidationError,
    BadRequestError,
} from '@/lib/errors';
import {
    MARKETPLACE_IMPORT_MAX_QUESTIONS,
    FIRESTORE_BATCH_LIMIT,
} from '@/lib/constants';
import { logger } from '@/lib/logger';
import type {
    MarketplaceStudy,
    MarketplaceQuestion,
    MarketplaceDomain,
    MarketplaceImportResult,
    SourceMetadata,
    Study,
} from '@/types';
import type {
    CreateMarketplaceStudyInput,
    UpdateMarketplaceStudyInput,
    CreateMarketplaceQuestionInput,
    UpdateMarketplaceQuestionInput,
} from '@/lib/validators';

// ── Collection paths ─────────────────────────────

const STUDIES_COL = 'marketplace_studies';
const QUESTIONS_COL = 'marketplace_questions';

function userStudiesPath(uid: string): string {
    return `users/${uid}/studies`;
}

function userQuestionsPath(uid: string): string {
    return `users/${uid}/questions`;
}

// ═══════════════════════════════════════════════════
// ADMIN — Study CRUD
// ═══════════════════════════════════════════════════

export async function createMarketplaceStudy(
    adminUid: string,
    data: CreateMarketplaceStudyInput
): Promise<string> {
    const now = serverTimestamp();

    const domains: MarketplaceDomain[] = data.domains.map((d, i) => ({
        ...d,
        id: d.id || `d${i + 1}`,
        order: d.order ?? i,
    }));

    const id = await adminCreateDoc(STUDIES_COL, {
        abbreviation: data.abbreviation,
        name: data.name,
        description: data.description,
        domains,
        questionCount: 0,
        domainQuestionCounts: {},
        importCount: 0,
        ...(data.accentColor ? { accentColor: data.accentColor } : {}),
        tags: data.tags ?? [],
        isActive: true,
        createdAt: now,
        updatedAt: now,
        createdBy: adminUid,
    });

    return id;
}

export async function updateMarketplaceStudy(
    studyId: string,
    data: UpdateMarketplaceStudyInput
): Promise<void> {
    const existing = await adminGetDoc<MarketplaceStudy>(STUDIES_COL, studyId);
    if (!existing) throw new MarketplaceStudyNotFoundError();

    const update: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
    };

    if (data.abbreviation !== undefined) update.abbreviation = data.abbreviation;
    if (data.name !== undefined) update.name = data.name;
    if (data.description !== undefined) update.description = data.description;
    if (data.accentColor !== undefined) update.accentColor = data.accentColor;
    if (data.tags !== undefined) update.tags = data.tags;
    if (data.domains !== undefined) {
        update.domains = data.domains.map((d, i) => ({
            ...d,
            id: d.id || `d${i + 1}`,
            order: d.order ?? i,
        }));
    }

    await adminUpdateDoc(STUDIES_COL, studyId, update);
}

export async function deleteMarketplaceStudy(studyId: string): Promise<void> {
    const existing = await adminGetDoc<MarketplaceStudy>(STUDIES_COL, studyId);
    if (!existing) throw new MarketplaceStudyNotFoundError();

    // Soft-delete: set isActive = false
    await adminUpdateDoc(STUDIES_COL, studyId, {
        isActive: false,
        updatedAt: serverTimestamp(),
    });
}

// ═══════════════════════════════════════════════════
// ADMIN — Question CRUD
// ═══════════════════════════════════════════════════

export async function createMarketplaceQuestion(
    adminUid: string,
    studyId: string,
    data: CreateMarketplaceQuestionInput
): Promise<string> {
    // Verify study exists and is active
    const study = await adminGetDoc<MarketplaceStudy>(STUDIES_COL, studyId);
    if (!study || !study.isActive) throw new MarketplaceStudyNotFoundError();

    // Validate domainIds against study domains
    const studyDomainIds = new Set(study.domains.map(d => d.id));
    const invalidDomains = data.domainIds.filter(id => !studyDomainIds.has(id));
    if (invalidDomains.length > 0) {
        throw new ValidationError(`Invalid domain IDs: ${invalidDomains.join(', ')}`);
    }

    const now = serverTimestamp();
    const id = await adminCreateDoc(QUESTIONS_COL, {
        studyId,
        ...data,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        createdBy: adminUid,
    });

    // Update denormalized counters on the study
    const db = getAdminDb();
    const studyRef = db.collection(STUDIES_COL).doc(studyId);
    const counterUpdates: Record<string, unknown> = {
        questionCount: FieldValue.increment(1),
        updatedAt: serverTimestamp(),
    };
    for (const domainId of data.domainIds) {
        counterUpdates[`domainQuestionCounts.${domainId}`] = FieldValue.increment(1);
    }
    await studyRef.update(counterUpdates);

    return id;
}

export async function bulkCreateMarketplaceQuestions(
    adminUid: string,
    studyId: string,
    questions: CreateMarketplaceQuestionInput[]
): Promise<{ created: number; ids: string[] }> {
    // Verify study exists and is active
    const study = await adminGetDoc<MarketplaceStudy>(STUDIES_COL, studyId);
    if (!study || !study.isActive) throw new MarketplaceStudyNotFoundError();

    const studyDomainIds = new Set(study.domains.map(d => d.id));
    const now = serverTimestamp();
    const db = getAdminDb();
    const ids: string[] = [];
    const domainCounts = new Map<string, number>();

    // Validate all questions first before writing anything
    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const invalidDomains = q.domainIds.filter(id => !studyDomainIds.has(id));
        if (invalidDomains.length > 0) {
            throw new ValidationError(
                `Question ${i}: invalid domain IDs: ${invalidDomains.join(', ')}`
            );
        }
    }

    // Write in batches of 498 (leave room for study counter update)
    const chunkSize = FIRESTORE_BATCH_LIMIT - 2;
    for (let i = 0; i < questions.length; i += chunkSize) {
        const chunk = questions.slice(i, i + chunkSize);
        const batch = db.batch();

        for (const q of chunk) {
            const ref = db.collection(QUESTIONS_COL).doc();
            batch.set(ref, {
                studyId,
                ...q,
                isActive: true,
                createdAt: now,
                updatedAt: now,
                createdBy: adminUid,
            });
            ids.push(ref.id);

            for (const domainId of q.domainIds) {
                domainCounts.set(domainId, (domainCounts.get(domainId) || 0) + 1);
            }
        }

        await batch.commit();
    }

    // Update study counters in a separate write
    const studyRef = db.collection(STUDIES_COL).doc(studyId);
    const counterUpdates: Record<string, unknown> = {
        questionCount: FieldValue.increment(questions.length),
        updatedAt: serverTimestamp(),
    };
    for (const [domainId, count] of domainCounts) {
        counterUpdates[`domainQuestionCounts.${domainId}`] = FieldValue.increment(count);
    }
    await studyRef.update(counterUpdates);

    return { created: ids.length, ids };
}

export async function updateMarketplaceQuestion(
    studyId: string,
    questionId: string,
    data: UpdateMarketplaceQuestionInput
): Promise<void> {
    const existing = await adminGetDoc<MarketplaceQuestion>(QUESTIONS_COL, questionId);
    if (!existing || existing.studyId !== studyId) throw new MarketplaceQuestionNotFoundError();

    // If domainIds are being updated, validate against study
    if (data.domainIds) {
        const study = await adminGetDoc<MarketplaceStudy>(STUDIES_COL, existing.studyId);
        if (!study) throw new MarketplaceStudyNotFoundError();
        const studyDomainIds = new Set(study.domains.map(d => d.id));
        const invalidDomains = data.domainIds.filter(id => !studyDomainIds.has(id));
        if (invalidDomains.length > 0) {
            throw new ValidationError(`Invalid domain IDs: ${invalidDomains.join(', ')}`);
        }
    }

    await adminUpdateDoc(QUESTIONS_COL, questionId, {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

export async function deleteMarketplaceQuestion(
    studyId: string,
    questionId: string
): Promise<void> {
    const existing = await adminGetDoc<MarketplaceQuestion>(QUESTIONS_COL, questionId);
    if (!existing || existing.studyId !== studyId) throw new MarketplaceQuestionNotFoundError();

    // Soft-delete
    await adminUpdateDoc(QUESTIONS_COL, questionId, {
        isActive: false,
        updatedAt: serverTimestamp(),
    });

    // Update denormalized counters
    const db = getAdminDb();
    const studyRef = db.collection(STUDIES_COL).doc(existing.studyId);
    const counterUpdates: Record<string, unknown> = {
        questionCount: FieldValue.increment(-1),
        updatedAt: serverTimestamp(),
    };
    for (const domainId of existing.domainIds) {
        counterUpdates[`domainQuestionCounts.${domainId}`] = FieldValue.increment(-1);
    }
    await studyRef.update(counterUpdates);
}

// ═══════════════════════════════════════════════════
// BROWSE — Public (authenticated) read operations
// ═══════════════════════════════════════════════════

export interface ListMarketplaceStudiesOptions {
    search?: string;
    cursor?: string;
    limit?: number;
}

export async function listMarketplaceStudies(
    options: ListMarketplaceStudiesOptions = {}
): Promise<{ studies: MarketplaceStudy[]; nextCursor: string | null }> {
    const { search, cursor, limit: limitParam = 50 } = options;
    const limitCount = Math.min(Math.max(1, limitParam), 100);
    const db = getAdminDb();

    let q: FirebaseFirestore.Query = db.collection(STUDIES_COL)
        .where('isActive', '==', true)
        .orderBy('createdAt', 'desc');

    if (cursor) {
        const cursorDoc = await db.collection(STUDIES_COL).doc(cursor).get();
        if (cursorDoc.exists) {
            q = q.startAfter(cursorDoc);
        }
    }

    const snap = await q.limit(limitCount + 1).get();
    let studies = snap.docs.map(d => ({ id: d.id, ...d.data() }) as MarketplaceStudy);

    // Simple text search (Firestore doesn't support full-text)
    if (search) {
        const lower = search.toLowerCase();
        studies = studies.filter(s =>
            s.name.toLowerCase().includes(lower) ||
            s.abbreviation.toLowerCase().includes(lower) ||
            s.tags.some(t => t.toLowerCase().includes(lower))
        );
    }

    const hasMore = studies.length > limitCount;
    const pageStudies = hasMore ? studies.slice(0, limitCount) : studies;
    const nextCursor = hasMore ? pageStudies.at(-1)?.id ?? null : null;

    return { studies: pageStudies, nextCursor };
}

export async function getMarketplaceStudy(studyId: string): Promise<MarketplaceStudy> {
    const study = await adminGetDoc<MarketplaceStudy>(STUDIES_COL, studyId);
    if (!study || !study.isActive) throw new MarketplaceStudyNotFoundError();
    return study;
}

export interface ListMarketplaceQuestionsOptions {
    studyId: string;
    domainIds?: string[];
    cursor?: string;
    limit?: number;
}

export async function listMarketplaceQuestions(
    options: ListMarketplaceQuestionsOptions
): Promise<{ questions: MarketplaceQuestion[]; nextCursor: string | null }> {
    const { studyId, domainIds, cursor, limit: limitParam = 50 } = options;
    const limitCount = Math.min(Math.max(1, limitParam), 100);
    const db = getAdminDb();

    let q: FirebaseFirestore.Query = db.collection(QUESTIONS_COL)
        .where('studyId', '==', studyId)
        .where('isActive', '==', true)
        .orderBy('createdAt', 'desc');

    if (domainIds && domainIds.length > 0) {
        q = q.where('domainIds', 'array-contains-any', domainIds.slice(0, 10));
    }

    if (cursor) {
        const cursorDoc = await db.collection(QUESTIONS_COL).doc(cursor).get();
        if (cursorDoc.exists) {
            q = q.startAfter(cursorDoc);
        }
    }

    const snap = await q.limit(limitCount + 1).get();
    const questions = snap.docs.map(d => ({ id: d.id, ...d.data() }) as MarketplaceQuestion);

    const hasMore = questions.length > limitCount;
    const pageQuestions = hasMore ? questions.slice(0, limitCount) : questions;
    const nextCursor = hasMore ? pageQuestions.at(-1)?.id ?? null : null;

    return { questions: pageQuestions, nextCursor };
}

// ═══════════════════════════════════════════════════
// IMPORT — Copy marketplace content to user namespace
// ═══════════════════════════════════════════════════

export async function importFromMarketplace(
    uid: string,
    marketplaceStudyId: string,
    selectedDomainIds: string[]
): Promise<MarketplaceImportResult> {
    const db = getAdminDb();

    // ── 1. Fetch and validate marketplace study ──
    const mktStudy = await adminGetDoc<MarketplaceStudy>(STUDIES_COL, marketplaceStudyId);
    if (!mktStudy || !mktStudy.isActive) {
        throw new MarketplaceStudyNotFoundError();
    }

    // ── 2. Validate selected domain IDs ──
    const studyDomainMap = new Map(mktStudy.domains.map(d => [d.id, d]));
    const validDomains: MarketplaceDomain[] = [];
    const invalidIds: string[] = [];

    for (const id of selectedDomainIds) {
        const domain = studyDomainMap.get(id);
        if (domain) {
            validDomains.push(domain);
        } else {
            invalidIds.push(id);
        }
    }

    if (invalidIds.length > 0) {
        throw new ValidationError(`Invalid domain IDs: ${invalidIds.join(', ')}`);
    }

    // ── 3. Idempotency check — block duplicate domain imports ──
    const existingStudiesSnap = await db
        .collection(userStudiesPath(uid))
        .where('_source.type', '==', 'marketplace')
        .where('_source.marketplaceStudyId', '==', marketplaceStudyId)
        .get();

    if (!existingStudiesSnap.empty) {
        // Collect all previously imported domain IDs for this marketplace study
        const alreadyImportedDomainIds = new Set<string>();
        for (const doc of existingStudiesSnap.docs) {
            const source = doc.data()._source as SourceMetadata | undefined;
            if (source?.importedDomainIds) {
                for (const id of source.importedDomainIds) {
                    alreadyImportedDomainIds.add(id);
                }
            }
        }

        const overlapping = selectedDomainIds.filter(id => alreadyImportedDomainIds.has(id));
        if (overlapping.length > 0) {
            throw new MarketplaceImportConflictError(overlapping);
        }
    }

    // ── 4. Fetch marketplace questions for selected domains ──
    const questionsSnap = await db.collection(QUESTIONS_COL)
        .where('studyId', '==', marketplaceStudyId)
        .where('isActive', '==', true)
        .where('domainIds', 'array-contains-any', selectedDomainIds.slice(0, 10))
        .get();

    // Deduplicate (a question may appear in multiple domain queries)
    const questionsMap = new Map<string, MarketplaceQuestion>();
    for (const doc of questionsSnap.docs) {
        questionsMap.set(doc.id, { id: doc.id, ...doc.data() } as MarketplaceQuestion);
    }
    const allQuestions = Array.from(questionsMap.values());

    // ── 5. Enforce import size limit ──
    if (allQuestions.length > MARKETPLACE_IMPORT_MAX_QUESTIONS) {
        throw new BadRequestError(
            `Import would create ${allQuestions.length} questions, which exceeds the limit of ${MARKETPLACE_IMPORT_MAX_QUESTIONS}. ` +
            'Please select fewer domains.'
        );
    }

    // ── 6. Build atomic batch write ──
    const now = serverTimestamp();
    const selectedDomainIdSet = new Set(selectedDomainIds);

    // Strip marketplace-only fields for the personal study copy
    const personalDomains = validDomains.map(({ description: _, ...rest }) => rest);

    const sourceMetadataStudy: Record<string, unknown> = {
        '_source.type': 'marketplace',
        '_source.marketplaceStudyId': marketplaceStudyId,
        '_source.importedAt': now,
        '_source.importedDomainIds': selectedDomainIds,
        '_source.marketplaceQuestionCount': allQuestions.length,
    };

    // Create the personal study document
    const newStudyRef = db.collection(userStudiesPath(uid)).doc();
    const studyData: Record<string, unknown> = {
        abbreviation: mktStudy.abbreviation,
        name: mktStudy.name,
        domains: personalDomains,
        questionCount: allQuestions.length,
        examCount: 0,
        ...(mktStudy.accentColor ? { accentColor: mktStudy.accentColor } : {}),
        createdAt: now,
        updatedAt: now,
    };
    // Flatten _source fields into the document
    for (const [key, value] of Object.entries(sourceMetadataStudy)) {
        studyData[key] = value;
    }

    // Use chunked batches if needed
    const totalWrites = 1 + allQuestions.length + 1; // study + questions + marketplace counter

    if (totalWrites <= FIRESTORE_BATCH_LIMIT) {
        // Single batch — atomic
        const batch = db.batch();

        batch.set(newStudyRef, studyData);

        for (const mktQuestion of allQuestions) {
            const questionRef = db.collection(userQuestionsPath(uid)).doc();
            const filteredDomainIds = mktQuestion.domainIds.filter(
                id => selectedDomainIdSet.has(id)
            );

            batch.set(questionRef, {
                studyId: newStudyRef.id,
                domainIds: filteredDomainIds,
                text: mktQuestion.text,
                options: mktQuestion.options,
                correctOptionIndex: mktQuestion.correctOptionIndex,
                explanation: mktQuestion.explanation,
                difficulty: mktQuestion.difficulty,
                tags: mktQuestion.tags,
                createdAt: now,
                updatedAt: now,
                '_source.type': 'marketplace',
                '_source.marketplaceStudyId': marketplaceStudyId,
                '_source.marketplaceQuestionId': mktQuestion.id,
                '_source.importedAt': now,
            });
        }

        // Increment import counter on marketplace study (fire-and-forget intent, but in batch)
        const mktStudyRef = db.collection(STUDIES_COL).doc(marketplaceStudyId);
        batch.update(mktStudyRef, { importCount: FieldValue.increment(1) });

        await batch.commit();
    } else {
        // Chunked batches — study + first chunk in first batch
        const createdRefs: FirebaseFirestore.DocumentReference[] = [];

        try {
            // First batch: study doc + first chunk of questions
            const firstChunkSize = FIRESTORE_BATCH_LIMIT - 2; // 1 study + 1 marketplace counter
            const firstBatch = db.batch();

            firstBatch.set(newStudyRef, studyData);
            createdRefs.push(newStudyRef);

            const firstChunk = allQuestions.slice(0, firstChunkSize);
            for (const mktQuestion of firstChunk) {
                const questionRef = db.collection(userQuestionsPath(uid)).doc();
                const filteredDomainIds = mktQuestion.domainIds.filter(
                    id => selectedDomainIdSet.has(id)
                );

                firstBatch.set(questionRef, {
                    studyId: newStudyRef.id,
                    domainIds: filteredDomainIds,
                    text: mktQuestion.text,
                    options: mktQuestion.options,
                    correctOptionIndex: mktQuestion.correctOptionIndex,
                    explanation: mktQuestion.explanation,
                    difficulty: mktQuestion.difficulty,
                    tags: mktQuestion.tags,
                    createdAt: now,
                    updatedAt: now,
                    '_source.type': 'marketplace',
                    '_source.marketplaceStudyId': marketplaceStudyId,
                    '_source.marketplaceQuestionId': mktQuestion.id,
                    '_source.importedAt': now,
                });
                createdRefs.push(questionRef);
            }

            const mktStudyRef = db.collection(STUDIES_COL).doc(marketplaceStudyId);
            firstBatch.update(mktStudyRef, { importCount: FieldValue.increment(1) });

            await firstBatch.commit();

            // Subsequent batches: remaining questions
            const remaining = allQuestions.slice(firstChunkSize);
            for (let i = 0; i < remaining.length; i += FIRESTORE_BATCH_LIMIT) {
                const chunk = remaining.slice(i, i + FIRESTORE_BATCH_LIMIT);
                const batch = db.batch();

                for (const mktQuestion of chunk) {
                    const questionRef = db.collection(userQuestionsPath(uid)).doc();
                    const filteredDomainIds = mktQuestion.domainIds.filter(
                        id => selectedDomainIdSet.has(id)
                    );

                    batch.set(questionRef, {
                        studyId: newStudyRef.id,
                        domainIds: filteredDomainIds,
                        text: mktQuestion.text,
                        options: mktQuestion.options,
                        correctOptionIndex: mktQuestion.correctOptionIndex,
                        explanation: mktQuestion.explanation,
                        difficulty: mktQuestion.difficulty,
                        tags: mktQuestion.tags,
                        createdAt: now,
                        updatedAt: now,
                        '_source.type': 'marketplace',
                        '_source.marketplaceStudyId': marketplaceStudyId,
                        '_source.marketplaceQuestionId': mktQuestion.id,
                        '_source.importedAt': now,
                    });
                    createdRefs.push(questionRef);
                }

                await batch.commit();
            }
        } catch (error) {
            // Best-effort cleanup: delete all docs created so far
            logger.error('Import failed mid-batch, cleaning up', {
                error,
                meta: { uid, marketplaceStudyId, createdDocs: createdRefs.length },
            });

            for (let i = 0; i < createdRefs.length; i += FIRESTORE_BATCH_LIMIT) {
                const cleanupBatch = db.batch();
                const chunk = createdRefs.slice(i, i + FIRESTORE_BATCH_LIMIT);
                for (const ref of chunk) {
                    cleanupBatch.delete(ref);
                }
                try {
                    await cleanupBatch.commit();
                } catch (cleanupErr) {
                    logger.error('Cleanup also failed', { error: cleanupErr });
                }
            }

            throw error;
        }
    }

    logger.info('Marketplace import completed', {
        userId: uid,
        meta: {
            marketplaceStudyId,
            newStudyId: newStudyRef.id,
            domains: selectedDomainIds.length,
            questions: allQuestions.length,
        },
    });

    return {
        studyId: newStudyRef.id,
        importedQuestions: allQuestions.length,
        importedDomains: validDomains.length,
    };
}

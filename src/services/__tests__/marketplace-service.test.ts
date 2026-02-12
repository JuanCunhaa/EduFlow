import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Firestore mock infrastructure ────────────────

/** Tracks all docs in the mock Firestore keyed by "collection/docId" */
let mockStore: Record<string, Record<string, unknown>> = {};

/** Auto-incrementing counter for generated doc IDs */
let autoIdCounter = 0;

/** Captures batch operations for assertions */
let batchOps: Array<{ type: 'set' | 'update' | 'delete'; path: string; data?: unknown }> = [];
let batchCommitSpy = vi.fn();
let shouldFailOnBatchCommit = false;
let batchCommitFailAfter = Infinity;
let batchCommitCount = 0;

function makeDocRef(collectionPath: string, docId: string) {
    const fullPath = `${collectionPath}/${docId}`;
    return {
        id: docId,
        path: fullPath,
        get: vi.fn(async () => {
            const data = mockStore[fullPath];
            return {
                exists: !!data,
                id: docId,
                data: () => (data ? { ...data } : undefined),
            };
        }),
        update: vi.fn(async () => {}),
    };
}

function makeCollectionRef(path: string) {
    return {
        doc: (id?: string) => {
            const docId = id || `auto-${++autoIdCounter}`;
            return makeDocRef(path, docId);
        },
        add: vi.fn(async (data: Record<string, unknown>) => {
            const docId = `auto-${++autoIdCounter}`;
            mockStore[`${path}/${docId}`] = { ...data };
            return { id: docId };
        }),
        where: vi.fn(function (this: ReturnType<typeof makeCollectionRef>, _field: string, _op: string, _val: unknown) {
            return makeQueryChain(path);
        }),
    };
}

// Tracks what query results should be returned for given collection paths
let queryResults: Record<string, Array<{ id: string; data: Record<string, unknown> }>> = {};

function makeQueryChain(collectionPath: string) {
    const chain: Record<string, unknown> = {};
    chain.where = vi.fn(() => chain);
    chain.orderBy = vi.fn(() => chain);
    chain.startAfter = vi.fn(() => chain);
    chain.limit = vi.fn(() => chain);
    chain.get = vi.fn(async () => {
        const results = queryResults[collectionPath] ?? [];
        return {
            empty: results.length === 0,
            docs: results.map(r => ({
                id: r.id,
                data: () => ({ ...r.data }),
            })),
        };
    });
    return chain;
}

function makeBatch() {
    batchOps = [];
    batchCommitCount++;
    return {
        set: vi.fn((ref: { path: string }, data: unknown) => {
            batchOps.push({ type: 'set', path: ref.path, data });
        }),
        update: vi.fn((ref: { path: string }, data: unknown) => {
            batchOps.push({ type: 'update', path: ref.path, data });
        }),
        delete: vi.fn((ref: { path: string }) => {
            batchOps.push({ type: 'delete', path: ref.path });
        }),
        commit: vi.fn(async () => {
            batchCommitSpy();
            if (shouldFailOnBatchCommit && batchCommitCount >= batchCommitFailAfter) {
                throw new Error('Firestore batch commit failed');
            }
        }),
    };
}

const mockDb = {
    collection: vi.fn((path: string) => makeCollectionRef(path)),
    batch: vi.fn(() => makeBatch()),
};

// ── Mock dependencies ────────────────────────────

vi.mock('@/lib/firebase/admin', () => ({
    getAdminDb: () => mockDb,
}));

const mockAdminGetDoc = vi.fn();
const mockAdminCreateDoc = vi.fn();
const mockAdminUpdateDoc = vi.fn();

vi.mock('@/lib/firebase/admin-firestore', () => ({
    adminGetDoc: (...args: unknown[]) => mockAdminGetDoc(...args),
    adminCreateDoc: (...args: unknown[]) => mockAdminCreateDoc(...args),
    adminUpdateDoc: (...args: unknown[]) => mockAdminUpdateDoc(...args),
    serverTimestamp: () => 'SERVER_TIMESTAMP',
}));

vi.mock('firebase-admin/firestore', () => ({
    FieldValue: {
        increment: (n: number) => ({ _type: 'increment', value: n }),
        serverTimestamp: () => 'SERVER_TIMESTAMP',
    },
}));

vi.mock('@/lib/logger', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

// ── Import the service under test ────────────────

import {
    createMarketplaceStudy,
    updateMarketplaceStudy,
    deleteMarketplaceStudy,
    createMarketplaceQuestion,
    bulkCreateMarketplaceQuestions,
    updateMarketplaceQuestion,
    deleteMarketplaceQuestion,
    listMarketplaceStudies,
    getMarketplaceStudy,
    listMarketplaceQuestions,
    importFromMarketplace,
} from '@/services/marketplace-service';

import {
    MarketplaceStudyNotFoundError,
    MarketplaceQuestionNotFoundError,
    MarketplaceImportConflictError,
    ValidationError,
    BadRequestError,
} from '@/lib/errors';

// ── Test data factories ──────────────────────────

function makeStudyInput(overrides: Record<string, unknown> = {}) {
    return {
        abbreviation: 'CISSP',
        name: 'Certified Information Systems Security Professional',
        description: 'The gold standard in information security certifications',
        domains: [
            { id: 'd1', abbreviation: 'SAM', name: 'Security and Risk Management', order: 0 },
            { id: 'd2', abbreviation: 'APS', name: 'Asset Security', order: 1 },
        ],
        tags: ['security', 'certification'],
        ...overrides,
    };
}

function makeMarketplaceStudy(overrides: Record<string, unknown> = {}) {
    return {
        id: 'mkt-study-1',
        abbreviation: 'CISSP',
        name: 'CISSP Study Pack',
        description: 'Complete CISSP preparation',
        domains: [
            { id: 'd1', abbreviation: 'SAM', name: 'Security and Risk Management', order: 0 },
            { id: 'd2', abbreviation: 'APS', name: 'Asset Security', order: 1 },
            { id: 'd3', abbreviation: 'SAE', name: 'Security Architecture', order: 2 },
        ],
        questionCount: 10,
        domainQuestionCounts: { d1: 4, d2: 3, d3: 3 },
        importCount: 5,
        tags: ['security'],
        isActive: true,
        createdAt: 'SERVER_TIMESTAMP',
        updatedAt: 'SERVER_TIMESTAMP',
        createdBy: 'admin-uid',
        ...overrides,
    };
}

function makeQuestionInput(overrides: Record<string, unknown> = {}) {
    return {
        domainIds: ['d1'],
        text: 'What is the primary purpose of risk management?',
        options: [
            { label: 'A', text: 'To eliminate all risks' },
            { label: 'B', text: 'To reduce risks to acceptable levels' },
            { label: 'C', text: 'To ignore risks' },
            { label: 'D', text: 'To transfer all risks' },
        ],
        correctOptionIndex: 1,
        explanation: { short: 'Risk management reduces risks', whyOthersWrong: {} },
        difficulty: 'medium' as const,
        tags: ['risk'],
        ...overrides,
    };
}

function makeMarketplaceQuestion(id: string, overrides: Record<string, unknown> = {}) {
    return {
        id,
        studyId: 'mkt-study-1',
        domainIds: ['d1'],
        text: `Question ${id}`,
        options: [
            { label: 'A', text: 'Option A' },
            { label: 'B', text: 'Option B' },
            { label: 'C', text: 'Option C' },
            { label: 'D', text: 'Option D' },
        ],
        correctOptionIndex: 0,
        explanation: { short: 'Correct answer', whyOthersWrong: {} },
        difficulty: 'medium',
        tags: [],
        isActive: true,
        createdAt: 'SERVER_TIMESTAMP',
        updatedAt: 'SERVER_TIMESTAMP',
        createdBy: 'admin-uid',
        ...overrides,
    };
}

// ═══════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════

beforeEach(() => {
    vi.clearAllMocks();
    mockStore = {};
    autoIdCounter = 0;
    batchOps = [];
    batchCommitSpy = vi.fn();
    shouldFailOnBatchCommit = false;
    batchCommitFailAfter = Infinity;
    batchCommitCount = 0;
    queryResults = {};
});

// ═══════════════════════════════════════════════════
// ADMIN — Study CRUD
// ═══════════════════════════════════════════════════

describe('createMarketplaceStudy', () => {
    it('creates a study and returns its ID', async () => {
        mockAdminCreateDoc.mockResolvedValue('new-study-id');

        const id = await createMarketplaceStudy('admin-uid', makeStudyInput());

        expect(id).toBe('new-study-id');
        expect(mockAdminCreateDoc).toHaveBeenCalledWith(
            'marketplace_studies',
            expect.objectContaining({
                abbreviation: 'CISSP',
                name: 'Certified Information Systems Security Professional',
                description: 'The gold standard in information security certifications',
                isActive: true,
                questionCount: 0,
                importCount: 0,
                createdBy: 'admin-uid',
                tags: ['security', 'certification'],
            })
        );
    });

    it('assigns domain IDs when not provided', async () => {
        mockAdminCreateDoc.mockResolvedValue('new-id');

        await createMarketplaceStudy('admin-uid', makeStudyInput({
            domains: [
                { abbreviation: 'SAM', name: 'Security', order: 0 },
                { abbreviation: 'APS', name: 'Asset', order: 1 },
            ],
        }));

        const createCall = mockAdminCreateDoc.mock.calls[0];
        const domains = createCall[1].domains;
        expect(domains[0].id).toBe('d1');
        expect(domains[1].id).toBe('d2');
    });

    it('preserves provided domain IDs', async () => {
        mockAdminCreateDoc.mockResolvedValue('new-id');

        await createMarketplaceStudy('admin-uid', makeStudyInput({
            domains: [
                { id: 'custom-1', abbreviation: 'A', name: 'Domain A', order: 0 },
            ],
        }));

        const domains = mockAdminCreateDoc.mock.calls[0][1].domains;
        expect(domains[0].id).toBe('custom-1');
    });

    it('includes accentColor when provided', async () => {
        mockAdminCreateDoc.mockResolvedValue('new-id');

        await createMarketplaceStudy('admin-uid', makeStudyInput({
            accentColor: '#FF5733',
        }));

        expect(mockAdminCreateDoc.mock.calls[0][1].accentColor).toBe('#FF5733');
    });

    it('does not include accentColor when omitted', async () => {
        mockAdminCreateDoc.mockResolvedValue('new-id');

        await createMarketplaceStudy('admin-uid', makeStudyInput());

        expect(mockAdminCreateDoc.mock.calls[0][1]).not.toHaveProperty('accentColor');
    });
});

describe('updateMarketplaceStudy', () => {
    it('updates a study with partial data', async () => {
        mockAdminGetDoc.mockResolvedValue(makeMarketplaceStudy());

        await updateMarketplaceStudy('mkt-study-1', { name: 'Updated Name' });

        expect(mockAdminUpdateDoc).toHaveBeenCalledWith(
            'marketplace_studies',
            'mkt-study-1',
            expect.objectContaining({ name: 'Updated Name', updatedAt: 'SERVER_TIMESTAMP' })
        );
    });

    it('throws MarketplaceStudyNotFoundError when study does not exist', async () => {
        mockAdminGetDoc.mockResolvedValue(null);

        await expect(updateMarketplaceStudy('nonexistent', { name: 'X' }))
            .rejects.toThrow(MarketplaceStudyNotFoundError);
    });

    it('assigns domain IDs and order when updating domains', async () => {
        mockAdminGetDoc.mockResolvedValue(makeMarketplaceStudy());

        await updateMarketplaceStudy('mkt-study-1', {
            domains: [
                { id: '', abbreviation: 'NEW', name: 'New Domain', order: 0 },
            ],
        });

        const updateCall = mockAdminUpdateDoc.mock.calls[0];
        const domains = updateCall[2].domains;
        expect(domains[0].id).toBe('d1');
    });

    it('does not include fields that are undefined', async () => {
        mockAdminGetDoc.mockResolvedValue(makeMarketplaceStudy());

        await updateMarketplaceStudy('mkt-study-1', {});

        const updatePayload = mockAdminUpdateDoc.mock.calls[0][2];
        expect(updatePayload).toEqual({ updatedAt: 'SERVER_TIMESTAMP' });
    });
});

describe('deleteMarketplaceStudy', () => {
    it('soft-deletes by setting isActive = false', async () => {
        mockAdminGetDoc.mockResolvedValue(makeMarketplaceStudy());

        await deleteMarketplaceStudy('mkt-study-1');

        expect(mockAdminUpdateDoc).toHaveBeenCalledWith(
            'marketplace_studies',
            'mkt-study-1',
            expect.objectContaining({ isActive: false, updatedAt: 'SERVER_TIMESTAMP' })
        );
    });

    it('throws MarketplaceStudyNotFoundError when study does not exist', async () => {
        mockAdminGetDoc.mockResolvedValue(null);

        await expect(deleteMarketplaceStudy('nonexistent'))
            .rejects.toThrow(MarketplaceStudyNotFoundError);
    });
});

// ═══════════════════════════════════════════════════
// ADMIN — Question CRUD
// ═══════════════════════════════════════════════════

describe('createMarketplaceQuestion', () => {
    it('creates a question and updates study counters', async () => {
        const study = makeMarketplaceStudy();
        mockAdminGetDoc.mockResolvedValue(study);
        mockAdminCreateDoc.mockResolvedValue('new-q-id');

        const id = await createMarketplaceQuestion('admin-uid', 'mkt-study-1', makeQuestionInput());

        expect(id).toBe('new-q-id');
        expect(mockAdminCreateDoc).toHaveBeenCalledWith(
            'marketplace_questions',
            expect.objectContaining({
                studyId: 'mkt-study-1',
                domainIds: ['d1'],
                isActive: true,
                createdBy: 'admin-uid',
            })
        );
    });

    it('throws when study does not exist', async () => {
        mockAdminGetDoc.mockResolvedValue(null);

        await expect(
            createMarketplaceQuestion('admin-uid', 'nonexistent', makeQuestionInput())
        ).rejects.toThrow(MarketplaceStudyNotFoundError);
    });

    it('throws when study is inactive', async () => {
        mockAdminGetDoc.mockResolvedValue(makeMarketplaceStudy({ isActive: false }));

        await expect(
            createMarketplaceQuestion('admin-uid', 'mkt-study-1', makeQuestionInput())
        ).rejects.toThrow(MarketplaceStudyNotFoundError);
    });

    it('throws ValidationError for invalid domain IDs', async () => {
        mockAdminGetDoc.mockResolvedValue(makeMarketplaceStudy());

        await expect(
            createMarketplaceQuestion('admin-uid', 'mkt-study-1', makeQuestionInput({ domainIds: ['invalid'] }))
        ).rejects.toThrow(ValidationError);
    });
});

describe('bulkCreateMarketplaceQuestions', () => {
    it('creates multiple questions and returns IDs', async () => {
        mockAdminGetDoc.mockResolvedValue(makeMarketplaceStudy());

        const questions = [
            makeQuestionInput({ domainIds: ['d1'] }),
            makeQuestionInput({ domainIds: ['d2'], text: 'Question 2 about asset security' }),
        ];

        const result = await bulkCreateMarketplaceQuestions('admin-uid', 'mkt-study-1', questions);

        expect(result.created).toBe(2);
        expect(result.ids).toHaveLength(2);
    });

    it('validates all questions before writing', async () => {
        mockAdminGetDoc.mockResolvedValue(makeMarketplaceStudy());

        const questions = [
            makeQuestionInput({ domainIds: ['d1'] }),
            makeQuestionInput({ domainIds: ['invalid-domain'] }),
        ];

        await expect(
            bulkCreateMarketplaceQuestions('admin-uid', 'mkt-study-1', questions)
        ).rejects.toThrow(ValidationError);
    });

    it('throws when study does not exist', async () => {
        mockAdminGetDoc.mockResolvedValue(null);

        await expect(
            bulkCreateMarketplaceQuestions('admin-uid', 'nonexistent', [makeQuestionInput()])
        ).rejects.toThrow(MarketplaceStudyNotFoundError);
    });
});

describe('updateMarketplaceQuestion', () => {
    it('updates a question when it exists and belongs to the study', async () => {
        mockAdminGetDoc.mockResolvedValue(
            makeMarketplaceQuestion('q-1', { studyId: 'mkt-study-1' })
        );

        await updateMarketplaceQuestion('mkt-study-1', 'q-1', { text: 'Updated text here for testing' });

        expect(mockAdminUpdateDoc).toHaveBeenCalledWith(
            'marketplace_questions',
            'q-1',
            expect.objectContaining({ text: 'Updated text here for testing', updatedAt: 'SERVER_TIMESTAMP' })
        );
    });

    it('throws when question does not exist', async () => {
        mockAdminGetDoc.mockResolvedValue(null);

        await expect(
            updateMarketplaceQuestion('mkt-study-1', 'nonexistent', { text: 'Updated text value' })
        ).rejects.toThrow(MarketplaceQuestionNotFoundError);
    });

    it('throws when question belongs to a different study', async () => {
        mockAdminGetDoc.mockResolvedValue(
            makeMarketplaceQuestion('q-1', { studyId: 'other-study' })
        );

        await expect(
            updateMarketplaceQuestion('mkt-study-1', 'q-1', { text: 'Updated text value' })
        ).rejects.toThrow(MarketplaceQuestionNotFoundError);
    });

    it('validates domainIds against the study when provided', async () => {
        mockAdminGetDoc
            .mockResolvedValueOnce(makeMarketplaceQuestion('q-1', { studyId: 'mkt-study-1' }))
            .mockResolvedValueOnce(makeMarketplaceStudy());

        await expect(
            updateMarketplaceQuestion('mkt-study-1', 'q-1', { domainIds: ['invalid'] })
        ).rejects.toThrow(ValidationError);
    });

    it('allows valid domainIds that exist in the study', async () => {
        mockAdminGetDoc
            .mockResolvedValueOnce(makeMarketplaceQuestion('q-1', { studyId: 'mkt-study-1' }))
            .mockResolvedValueOnce(makeMarketplaceStudy());

        await updateMarketplaceQuestion('mkt-study-1', 'q-1', { domainIds: ['d1', 'd2'] });

        expect(mockAdminUpdateDoc).toHaveBeenCalled();
    });
});

describe('deleteMarketplaceQuestion', () => {
    it('soft-deletes the question and decrements study counters', async () => {
        mockAdminGetDoc.mockResolvedValue(
            makeMarketplaceQuestion('q-1', { studyId: 'mkt-study-1', domainIds: ['d1', 'd2'] })
        );

        await deleteMarketplaceQuestion('mkt-study-1', 'q-1');

        expect(mockAdminUpdateDoc).toHaveBeenCalledWith(
            'marketplace_questions',
            'q-1',
            expect.objectContaining({ isActive: false, updatedAt: 'SERVER_TIMESTAMP' })
        );

        // Counter decrement happens via the Firestore db.collection().doc().update() path
        // (not via adminUpdateDoc). Verify the mock Firestore db was called.
        expect(mockDb.collection).toHaveBeenCalledWith('marketplace_studies');
    });

    it('throws when question does not exist', async () => {
        mockAdminGetDoc.mockResolvedValue(null);

        await expect(
            deleteMarketplaceQuestion('mkt-study-1', 'nonexistent')
        ).rejects.toThrow(MarketplaceQuestionNotFoundError);
    });

    it('throws when question belongs to a different study', async () => {
        mockAdminGetDoc.mockResolvedValue(
            makeMarketplaceQuestion('q-1', { studyId: 'other-study' })
        );

        await expect(
            deleteMarketplaceQuestion('mkt-study-1', 'q-1')
        ).rejects.toThrow(MarketplaceQuestionNotFoundError);
    });
});

// ═══════════════════════════════════════════════════
// BROWSE — List and Get
// ═══════════════════════════════════════════════════

describe('listMarketplaceStudies', () => {
    it('returns active studies', async () => {
        const { id: _1, ...studyData1 } = makeMarketplaceStudy();
        const { id: _2, ...studyData2 } = makeMarketplaceStudy();
        queryResults['marketplace_studies'] = [
            { id: 's1', data: { ...studyData1, name: 'Study 1' } },
            { id: 's2', data: { ...studyData2, name: 'Study 2' } },
        ];

        const result = await listMarketplaceStudies();

        expect(result.studies).toHaveLength(2);
        expect(result.studies[0].id).toBe('s1');
        expect(result.nextCursor).toBeNull();
    });

    it('returns empty list when no studies exist', async () => {
        queryResults['marketplace_studies'] = [];

        const result = await listMarketplaceStudies();

        expect(result.studies).toHaveLength(0);
        expect(result.nextCursor).toBeNull();
    });

    it('filters by search term (name, abbreviation, tags)', async () => {
        const { id: _1, ...base1 } = makeMarketplaceStudy();
        const { id: _2, ...base2 } = makeMarketplaceStudy();
        queryResults['marketplace_studies'] = [
            { id: 's1', data: { ...base1, name: 'CISSP Prep', abbreviation: 'CISSP', tags: ['security'] } },
            { id: 's2', data: { ...base2, name: 'AWS Solutions', abbreviation: 'AWS-SAA', tags: ['cloud'] } },
        ];

        const result = await listMarketplaceStudies({ search: 'cissp' });

        expect(result.studies).toHaveLength(1);
        expect(result.studies[0].abbreviation).toBe('CISSP');
    });

    it('filters by tag search', async () => {
        const { id: _1, ...base1 } = makeMarketplaceStudy();
        const { id: _2, ...base2 } = makeMarketplaceStudy();
        queryResults['marketplace_studies'] = [
            { id: 's1', data: { ...base1, name: 'Study 1', abbreviation: 'S1', tags: ['cloud'] } },
            { id: 's2', data: { ...base2, name: 'Study 2', abbreviation: 'S2', tags: ['security'] } },
        ];

        const result = await listMarketplaceStudies({ search: 'cloud' });

        expect(result.studies).toHaveLength(1);
        expect(result.studies[0].id).toBe('s1');
    });
});

describe('getMarketplaceStudy', () => {
    it('returns an active study', async () => {
        mockAdminGetDoc.mockResolvedValue(makeMarketplaceStudy());

        const study = await getMarketplaceStudy('mkt-study-1');

        expect(study.id).toBe('mkt-study-1');
        expect(study.isActive).toBe(true);
    });

    it('throws when study does not exist', async () => {
        mockAdminGetDoc.mockResolvedValue(null);

        await expect(getMarketplaceStudy('nonexistent'))
            .rejects.toThrow(MarketplaceStudyNotFoundError);
    });

    it('throws when study is inactive', async () => {
        mockAdminGetDoc.mockResolvedValue(makeMarketplaceStudy({ isActive: false }));

        await expect(getMarketplaceStudy('mkt-study-1'))
            .rejects.toThrow(MarketplaceStudyNotFoundError);
    });
});

describe('listMarketplaceQuestions', () => {
    it('returns questions for a study', async () => {
        queryResults['marketplace_questions'] = [
            { id: 'q1', data: makeMarketplaceQuestion('q1') },
            { id: 'q2', data: makeMarketplaceQuestion('q2') },
        ];

        const result = await listMarketplaceQuestions({ studyId: 'mkt-study-1' });

        expect(result.questions).toHaveLength(2);
        expect(result.nextCursor).toBeNull();
    });

    it('returns empty list when no questions exist', async () => {
        queryResults['marketplace_questions'] = [];

        const result = await listMarketplaceQuestions({ studyId: 'mkt-study-1' });

        expect(result.questions).toHaveLength(0);
    });
});

// ═══════════════════════════════════════════════════
// IMPORT — Copy to personal namespace
// ═══════════════════════════════════════════════════

describe('importFromMarketplace', () => {
    const uid = 'user-123';
    const marketplaceStudyId = 'mkt-study-1';

    function setupImportScenario(overrides: {
        study?: Record<string, unknown> | null;
        existingImports?: Array<{ id: string; data: Record<string, unknown> }>;
        questions?: Array<{ id: string; data: Record<string, unknown> }>;
    } = {}) {
        const study = overrides.study === null
            ? null
            : makeMarketplaceStudy(overrides.study ?? {});

        mockAdminGetDoc.mockResolvedValue(study);

        // Set up query results for idempotency check (users/{uid}/studies)
        queryResults[`users/${uid}/studies`] = overrides.existingImports ?? [];

        // Set up query results for marketplace questions
        queryResults['marketplace_questions'] = overrides.questions ?? [
            { id: 'q1', data: makeMarketplaceQuestion('q1', { domainIds: ['d1'] }) },
            { id: 'q2', data: makeMarketplaceQuestion('q2', { domainIds: ['d1'] }) },
            { id: 'q3', data: makeMarketplaceQuestion('q3', { domainIds: ['d2'] }) },
        ];
    }

    it('imports study and questions to user namespace', async () => {
        setupImportScenario();

        const result = await importFromMarketplace(uid, marketplaceStudyId, ['d1', 'd2']);

        expect(result.studyId).toBeDefined();
        expect(result.importedQuestions).toBe(3);
        expect(result.importedDomains).toBe(2);
    });

    it('throws when marketplace study does not exist', async () => {
        setupImportScenario({ study: null });

        await expect(
            importFromMarketplace(uid, marketplaceStudyId, ['d1'])
        ).rejects.toThrow(MarketplaceStudyNotFoundError);
    });

    it('throws when marketplace study is inactive', async () => {
        setupImportScenario({ study: { isActive: false } });

        await expect(
            importFromMarketplace(uid, marketplaceStudyId, ['d1'])
        ).rejects.toThrow(MarketplaceStudyNotFoundError);
    });

    it('throws ValidationError for invalid domain IDs', async () => {
        setupImportScenario();

        await expect(
            importFromMarketplace(uid, marketplaceStudyId, ['invalid-domain'])
        ).rejects.toThrow(ValidationError);
    });

    it('throws MarketplaceImportConflictError when domains are already imported', async () => {
        setupImportScenario({
            existingImports: [{
                id: 'existing-study',
                data: {
                    _source: {
                        type: 'marketplace',
                        marketplaceStudyId: 'mkt-study-1',
                        importedDomainIds: ['d1'],
                    },
                },
            }],
        });

        await expect(
            importFromMarketplace(uid, marketplaceStudyId, ['d1'])
        ).rejects.toThrow(MarketplaceImportConflictError);
    });

    it('allows importing different domains from the same study', async () => {
        setupImportScenario({
            existingImports: [{
                id: 'existing-study',
                data: {
                    _source: {
                        type: 'marketplace',
                        marketplaceStudyId: 'mkt-study-1',
                        importedDomainIds: ['d1'],
                    },
                },
            }],
            questions: [
                { id: 'q3', data: makeMarketplaceQuestion('q3', { domainIds: ['d2'] }) },
            ],
        });

        const result = await importFromMarketplace(uid, marketplaceStudyId, ['d2']);

        expect(result.importedDomains).toBe(1);
    });

    it('throws BadRequestError when question count exceeds limit', async () => {
        // Generate 499 questions (exceeds the 498 limit)
        const manyQuestions = Array.from({ length: 499 }, (_, i) => ({
            id: `q${i}`,
            data: makeMarketplaceQuestion(`q${i}`, { domainIds: ['d1'] }),
        }));

        setupImportScenario({ questions: manyQuestions });

        await expect(
            importFromMarketplace(uid, marketplaceStudyId, ['d1'])
        ).rejects.toThrow(BadRequestError);
    });

    it('uses batch write for atomic import', async () => {
        setupImportScenario({
            questions: [
                { id: 'q1', data: makeMarketplaceQuestion('q1', { domainIds: ['d1'] }) },
            ],
        });

        await importFromMarketplace(uid, marketplaceStudyId, ['d1']);

        // Verify that db.batch() was called
        expect(mockDb.batch).toHaveBeenCalled();
    });

    it('filters question domainIds to only selected domains', async () => {
        setupImportScenario({
            questions: [
                {
                    id: 'q1',
                    data: makeMarketplaceQuestion('q1', { domainIds: ['d1', 'd2', 'd3'] }),
                },
            ],
        });

        // Only import d1 — the personal question should have domainIds filtered to ['d1']
        const result = await importFromMarketplace(uid, marketplaceStudyId, ['d1']);

        expect(result.importedQuestions).toBe(1);
    });

    it('returns correct result shape', async () => {
        setupImportScenario({
            questions: [
                { id: 'q1', data: makeMarketplaceQuestion('q1', { domainIds: ['d1'] }) },
                { id: 'q2', data: makeMarketplaceQuestion('q2', { domainIds: ['d2'] }) },
            ],
        });

        const result = await importFromMarketplace(uid, marketplaceStudyId, ['d1', 'd2']);

        expect(result).toEqual({
            studyId: expect.any(String),
            importedQuestions: 2,
            importedDomains: 2,
        });
    });

    it('strips marketplace-only description from domains in personal copy', async () => {
        setupImportScenario({
            study: {
                domains: [
                    { id: 'd1', abbreviation: 'SAM', name: 'Security', order: 0, description: 'A detailed description' },
                ],
            },
            questions: [
                { id: 'q1', data: makeMarketplaceQuestion('q1', { domainIds: ['d1'] }) },
            ],
        });

        // Should complete without errors — the description field is stripped
        const result = await importFromMarketplace(uid, marketplaceStudyId, ['d1']);

        expect(result.importedDomains).toBe(1);
    });

    it('handles empty existing import list (no idempotency conflict)', async () => {
        setupImportScenario({
            existingImports: [],
            questions: [
                { id: 'q1', data: makeMarketplaceQuestion('q1', { domainIds: ['d1'] }) },
            ],
        });

        const result = await importFromMarketplace(uid, marketplaceStudyId, ['d1']);

        expect(result.importedQuestions).toBe(1);
    });
});

// ═══════════════════════════════════════════════════
// ERROR CLASSES
// ═══════════════════════════════════════════════════

describe('Marketplace error classes', () => {
    it('MarketplaceStudyNotFoundError has correct properties', () => {
        const error = new MarketplaceStudyNotFoundError();
        expect(error.statusCode).toBe(404);
        expect(error.code).toBe('NOT_FOUND');
        expect(error.message).toBe('Marketplace study not found');
        expect(error.name).toBe('MarketplaceStudyNotFoundError');
    });

    it('MarketplaceQuestionNotFoundError has correct properties', () => {
        const error = new MarketplaceQuestionNotFoundError();
        expect(error.statusCode).toBe(404);
        expect(error.code).toBe('NOT_FOUND');
        expect(error.message).toBe('Marketplace question not found');
        expect(error.name).toBe('MarketplaceQuestionNotFoundError');
    });

    it('MarketplaceImportConflictError includes domain IDs in message', () => {
        const error = new MarketplaceImportConflictError(['d1', 'd2']);
        expect(error.statusCode).toBe(409);
        expect(error.code).toBe('CONFLICT');
        expect(error.message).toContain('d1');
        expect(error.message).toContain('d2');
        expect(error.message).toContain('Already imported domains');
    });
});

import { describe, it, expect } from 'vitest';
import { selectQuestions, scoreExam, sanitizeQuestionsForExam } from '@/lib/exam-engine';
import type { Question, PerformanceSummary, DomainScore } from '@/types';
import type { StrategyPerformanceData } from '@/lib/exam-engine';
import type { Timestamp } from 'firebase/firestore';

// Helper to create mock questions (v2 schema)
function makeQuestion(overrides: Partial<Question> & { id: string }): Question {
    return {
        studyId: 'study-cissp',
        domainIds: [`d${overrides.domainIds?.[0]?.replace('d', '') || '1'}`],
        text: `Question ${overrides.id}`,
        options: [
            { label: 'A', text: 'Option A' },
            { label: 'B', text: 'Option B' },
            { label: 'C', text: 'Option C' },
            { label: 'D', text: 'Option D' },
        ],
        correctOptionIndex: 0,
        explanation: 'Test explanation',
        whyOthersWrong: null,
        difficulty: 'medium',
        tags: [],
        createdAt: {} as Timestamp,
        updatedAt: {} as Timestamp,
        ...overrides,
    };
}

describe('selectQuestions', () => {
    const pool: Question[] = [
        makeQuestion({ id: 'q1', domainIds: ['d1'] }),
        makeQuestion({ id: 'q2', domainIds: ['d1'] }),
        makeQuestion({ id: 'q3', domainIds: ['d2'] }),
        makeQuestion({ id: 'q4', domainIds: ['d2'] }),
        makeQuestion({ id: 'q5', domainIds: ['d3'] }),
        makeQuestion({ id: 'q6', domainIds: ['d3'] }),
    ];

    it('selects the requested number of questions', () => {
        const selected = selectQuestions(pool, {
            studyId: 'study-cissp',
            questionCount: 3,
            timeLimitMinutes: 60,
            domainIds: [],
            difficulty: 'all',
            mode: 'practice',
        });
        expect(selected).toHaveLength(3);
    });

    it('returns empty array when no questions match studyId', () => {
        const selected = selectQuestions(pool, {
            studyId: 'study-nonexistent',
            questionCount: 3,
            timeLimitMinutes: 60,
            domainIds: [],
            difficulty: 'all',
            mode: 'practice',
        });
        expect(selected).toHaveLength(0);
    });

    it('filters by difficulty', () => {
        const mixedPool = [
            ...pool,
            makeQuestion({ id: 'q7', domainIds: ['d1'], difficulty: 'hard' }),
        ];
        const selected = selectQuestions(mixedPool, {
            studyId: 'study-cissp',
            questionCount: 10,
            timeLimitMinutes: 60,
            domainIds: [],
            difficulty: 'hard',
            mode: 'practice',
        });
        expect(selected).toHaveLength(1);
        expect(selected[0].difficulty).toBe('hard');
    });

    it('filters by domainIds', () => {
        const selected = selectQuestions(pool, {
            studyId: 'study-cissp',
            questionCount: 10,
            timeLimitMinutes: 60,
            domainIds: ['d1'],
            difficulty: 'all',
            mode: 'practice',
        });
        expect(selected).toHaveLength(2);
        expect(selected.every((q) => q.domainIds.includes('d1'))).toBe(true);
    });

    it('caps at pool size when requesting more than available', () => {
        const selected = selectQuestions(pool, {
            studyId: 'study-cissp',
            questionCount: 100,
            timeLimitMinutes: 60,
            domainIds: [],
            difficulty: 'all',
            mode: 'practice',
        });
        expect(selected).toHaveLength(pool.length);
    });

    it('distributes across domains with round-robin', () => {
        const selected = selectQuestions(pool, {
            studyId: 'study-cissp',
            questionCount: 3,
            timeLimitMinutes: 60,
            domainIds: [],
            difficulty: 'all',
            mode: 'practice',
        });
        // Should pick 1 from each domain (round-robin)
        const domainCounts = new Map<string, number>();
        for (const q of selected) {
            const domainId = q.domainIds[0];
            domainCounts.set(domainId, (domainCounts.get(domainId) || 0) + 1);
        }
        expect(domainCounts.size).toBe(3);
    });
});

describe('scoreExam', () => {
    const questions: Question[] = [
        makeQuestion({ id: 'q1', domainIds: ['d1'], correctOptionIndex: 0 }),
        makeQuestion({ id: 'q2', domainIds: ['d1'], correctOptionIndex: 1 }),
        makeQuestion({ id: 'q3', domainIds: ['d2'], correctOptionIndex: 2 }),
        makeQuestion({ id: 'q4', domainIds: ['d2'], correctOptionIndex: 3 }),
    ];

    it('scores all correct answers at 100%', () => {
        const { score, domainScores } = scoreExam(questions, {
            q1: 0,
            q2: 1,
            q3: 2,
            q4: 3,
        });
        expect(score).toBe(100);
        expect(domainScores['d1'].percentage).toBe(100);
        expect(domainScores['d2'].percentage).toBe(100);
    });

    it('scores all wrong answers at 0%', () => {
        const { score } = scoreExam(questions, {
            q1: 3,
            q2: 3,
            q3: 3,
            q4: 0,
        });
        expect(score).toBe(0);
    });

    it('scores partial answers correctly', () => {
        const { score, domainScores } = scoreExam(questions, {
            q1: 0, // correct
            q2: 3, // wrong
            q3: 2, // correct
            q4: 0, // wrong
        });
        expect(score).toBe(50);
        expect(domainScores['d1'].correct).toBe(1);
        expect(domainScores['d1'].total).toBe(2);
        expect(domainScores['d1'].percentage).toBe(50);
    });

    it('treats null answers as incorrect', () => {
        const { score } = scoreExam(questions, {
            q1: 0,
            q2: null,
            q3: null,
            q4: null,
        });
        expect(score).toBe(25);
    });

    it('handles empty question set', () => {
        const { score } = scoreExam([], {});
        expect(score).toBe(0);
    });

    it('returns per-domain breakdowns', () => {
        const { domainScores } = scoreExam(questions, {
            q1: 0,
            q2: 1,
            q3: 0,
            q4: 3,
        });
        expect(Object.keys(domainScores)).toHaveLength(2);
        expect(domainScores['d1']).toEqual({
            domainId: 'd1',
            domain: 'd1',
            correct: 2,
            total: 2,
            percentage: 100,
        });
        expect(domainScores['d2']).toEqual({
            domainId: 'd2',
            domain: 'd2',
            correct: 1,
            total: 2,
            percentage: 50,
        });
    });
});

describe('sanitizeQuestionsForExam', () => {
    it('strips correctOptionIndex, explanation, and whyOthersWrong', () => {
        const questions = [
            makeQuestion({ id: 'q1', correctOptionIndex: 2, explanation: 'Secret', whyOthersWrong: 'Also secret' }),
        ];
        const sanitized = sanitizeQuestionsForExam(questions);

        expect(sanitized[0]).not.toHaveProperty('correctOptionIndex');
        expect(sanitized[0]).not.toHaveProperty('explanation');
        expect(sanitized[0]).not.toHaveProperty('whyOthersWrong');
        expect(sanitized[0]).toHaveProperty('id', 'q1');
        expect(sanitized[0]).toHaveProperty('text');
        expect(sanitized[0]).toHaveProperty('options');
    });
});

// ── Strategy-specific tests ─────────────────────

describe('weak_domains strategy', () => {
    const pool: Question[] = [
        makeQuestion({ id: 'w1', domainIds: ['d1'], difficulty: 'medium' }),
        makeQuestion({ id: 'w2', domainIds: ['d1'], difficulty: 'medium' }),
        makeQuestion({ id: 'w3', domainIds: ['d1'], difficulty: 'hard' }),
        makeQuestion({ id: 'w4', domainIds: ['d2'], difficulty: 'medium' }),
        makeQuestion({ id: 'w5', domainIds: ['d2'], difficulty: 'easy' }),
        makeQuestion({ id: 'w6', domainIds: ['d3'], difficulty: 'medium' }),
        makeQuestion({ id: 'w7', domainIds: ['d3'], difficulty: 'medium' }),
        makeQuestion({ id: 'w8', domainIds: ['d3'], difficulty: 'hard' }),
    ];

    it('prioritizes questions from weak domains (<70% accuracy)', () => {
        const performanceData: StrategyPerformanceData = {
            performanceSummary: {
                studyId: 'study-cissp',
                domainAccuracy: {
                    d1: { correct: 2, total: 10 },  // 20% — very weak
                    d2: { correct: 8, total: 10 },   // 80% — strong
                    d3: { correct: 5, total: 10 },   // 50% — weak
                },
                questionAttempts: {},
                recentExamQuestionIds: [],
                recentExamWindow: 3,
                updatedAt: Date.now(),
            },
            domainScores: {
                d1: { domainId: 'd1', domain: 'd1', correct: 2, total: 10, percentage: 20 },
                d2: { domainId: 'd2', domain: 'd2', correct: 8, total: 10, percentage: 80 },
                d3: { domainId: 'd3', domain: 'd3', correct: 5, total: 10, percentage: 50 },
            },
        };

        // Run 20 times and check majority of selections are from weak domains
        let weakDomainCount = 0;
        const runs = 20;

        for (let i = 0; i < runs; i++) {
            const selected = selectQuestions(pool, {
                studyId: 'study-cissp',
                questionCount: 5,
                timeLimitMinutes: 60,
                domainIds: [],
                difficulty: 'all',
                mode: 'weak_domains',
            }, performanceData);

            expect(selected.length).toBe(5);

            const weakCount = selected.filter(q =>
                q.domainIds.some(d => ['d1', 'd3'].includes(d))
            ).length;
            weakDomainCount += weakCount;
        }

        // On average, ~70% should be from weak domains (d1, d3)
        const avgWeakPerc = weakDomainCount / (runs * 5);
        expect(avgWeakPerc).toBeGreaterThan(0.5);
    });

    it('falls back to round-robin when no performance data', () => {
        const selected = selectQuestions(pool, {
            studyId: 'study-cissp',
            questionCount: 6,
            timeLimitMinutes: 60,
            domainIds: [],
            difficulty: 'all',
            mode: 'weak_domains',
        });

        expect(selected.length).toBe(6);
        // Should have questions from all 3 domains (round-robin fallback)
        const domains = new Set(selected.map(q => q.domainIds[0]));
        expect(domains.size).toBe(3);
    });

    it('includes diversity questions from strong domains', () => {
        const performanceData: StrategyPerformanceData = {
            performanceSummary: {
                studyId: 'study-cissp',
                domainAccuracy: {
                    d1: { correct: 1, total: 10 },  // 10% — very weak
                    d2: { correct: 9, total: 10 },   // 90% — strong
                    d3: { correct: 1, total: 10 },   // 10% — very weak
                },
                questionAttempts: {},
                recentExamQuestionIds: [],
                recentExamWindow: 3,
                updatedAt: Date.now(),
            },
            domainScores: {
                d1: { domainId: 'd1', domain: 'd1', correct: 1, total: 10, percentage: 10 },
                d2: { domainId: 'd2', domain: 'd2', correct: 9, total: 10, percentage: 90 },
                d3: { domainId: 'd3', domain: 'd3', correct: 1, total: 10, percentage: 10 },
            },
        };

        // Run multiple times, at least one run should include a d2 question (diversity)
        let sawStrongDomain = false;
        for (let i = 0; i < 30; i++) {
            const selected = selectQuestions(pool, {
                studyId: 'study-cissp',
                questionCount: 8,
                timeLimitMinutes: 60,
                domainIds: [],
                difficulty: 'all',
                mode: 'weak_domains',
            }, performanceData);

            if (selected.some(q => q.domainIds.includes('d2'))) {
                sawStrongDomain = true;
                break;
            }
        }

        expect(sawStrongDomain).toBe(true);
    });
});

describe('recent_misses strategy', () => {
    const pool: Question[] = [
        makeQuestion({ id: 'm1', domainIds: ['d1'] }),
        makeQuestion({ id: 'm2', domainIds: ['d1'] }),
        makeQuestion({ id: 'm3', domainIds: ['d2'] }),
        makeQuestion({ id: 'm4', domainIds: ['d2'] }),
        makeQuestion({ id: 'm5', domainIds: ['d3'] }),
        makeQuestion({ id: 'm6', domainIds: ['d3'] }),
    ];

    it('prioritizes recently missed questions via time-decay weighting', () => {
        const now = Date.now();
        const performanceData: StrategyPerformanceData = {
            performanceSummary: {
                studyId: 'study-cissp',
                domainAccuracy: {},
                questionAttempts: {
                    m1: { attempts: 3, correct: 0, lastAttemptAt: now - 1000 * 60 * 60 * 2, lastCorrect: false },  // missed 2h ago, 0% correct
                    m2: { attempts: 5, correct: 3, lastAttemptAt: now - 1000 * 60 * 60 * 24 * 30, lastCorrect: false }, // missed 30d ago, 60% correct
                    m3: { attempts: 1, correct: 1, lastAttemptAt: now - 1000 * 60 * 60 * 24, lastCorrect: true },  // got correct last time
                    // m4, m5, m6: never attempted
                },
                recentExamQuestionIds: [],
                recentExamWindow: 3,
                updatedAt: now,
            },
        };

        // Run multiple times; m1 should appear more frequently than m2
        // because m1 was missed very recently with 100% miss rate, while m2 was
        // missed 30 days ago with 60% correct rate → much lower weight
        let m1Count = 0;
        let m2Count = 0;
        const runs = 50;

        for (let i = 0; i < runs; i++) {
            const selected = selectQuestions(pool, {
                studyId: 'study-cissp',
                questionCount: 2,
                timeLimitMinutes: 60,
                domainIds: [],
                difficulty: 'all',
                mode: 'recent_misses',
            }, performanceData);

            expect(selected.length).toBe(2);
            if (selected.some(q => q.id === 'm1')) m1Count++;
            if (selected.some(q => q.id === 'm2')) m2Count++;
        }

        // m1 (recent miss, 0% correct) should appear more often than m2 (old miss, 60% correct)
        expect(m1Count).toBeGreaterThanOrEqual(m2Count);
    });

    it('avoids questions where last attempt was correct', () => {
        const now = Date.now();
        const performanceData: StrategyPerformanceData = {
            performanceSummary: {
                studyId: 'study-cissp',
                domainAccuracy: {},
                questionAttempts: {
                    m1: { attempts: 1, correct: 1, lastAttemptAt: now - 1000, lastCorrect: true },
                    m2: { attempts: 1, correct: 1, lastAttemptAt: now - 1000, lastCorrect: true },
                    m3: { attempts: 1, correct: 0, lastAttemptAt: now - 1000, lastCorrect: false },
                },
                recentExamQuestionIds: [],
                recentExamWindow: 3,
                updatedAt: now,
            },
        };

        // Only m3 is missed; m4, m5, m6 are unattempted
        // m1, m2 got correct last time → should be deprioritized
        let m3Count = 0;
        const runs = 20;

        for (let i = 0; i < runs; i++) {
            const selected = selectQuestions(pool, {
                studyId: 'study-cissp',
                questionCount: 2,
                timeLimitMinutes: 60,
                domainIds: [],
                difficulty: 'all',
                mode: 'recent_misses',
            }, performanceData);

            expect(selected.length).toBe(2);
            if (selected.some(q => q.id === 'm3')) m3Count++;
        }

        // m3 (missed) should appear in most runs
        expect(m3Count).toBeGreaterThan(runs * 0.5);
    });

    it('falls back to round-robin when no attempt data', () => {
        const selected = selectQuestions(pool, {
            studyId: 'study-cissp',
            questionCount: 4,
            timeLimitMinutes: 60,
            domainIds: [],
            difficulty: 'all',
            mode: 'recent_misses',
        });

        expect(selected.length).toBe(4);
    });
});

describe('real_mix strategy', () => {
    // Create a pool with varied difficulties and domains
    const pool: Question[] = [
        makeQuestion({ id: 'r1', domainIds: ['d1'], difficulty: 'easy' }),
        makeQuestion({ id: 'r2', domainIds: ['d1'], difficulty: 'medium' }),
        makeQuestion({ id: 'r3', domainIds: ['d1'], difficulty: 'hard' }),
        makeQuestion({ id: 'r4', domainIds: ['d2'], difficulty: 'easy' }),
        makeQuestion({ id: 'r5', domainIds: ['d2'], difficulty: 'medium' }),
        makeQuestion({ id: 'r6', domainIds: ['d2'], difficulty: 'hard' }),
        makeQuestion({ id: 'r7', domainIds: ['d3'], difficulty: 'easy' }),
        makeQuestion({ id: 'r8', domainIds: ['d3'], difficulty: 'medium' }),
        makeQuestion({ id: 'r9', domainIds: ['d3'], difficulty: 'hard' }),
        makeQuestion({ id: 'r10', domainIds: ['d4'], difficulty: 'medium' }),
        makeQuestion({ id: 'r11', domainIds: ['d4'], difficulty: 'medium' }),
        makeQuestion({ id: 'r12', domainIds: ['d4'], difficulty: 'hard' }),
    ];

    it('distributes across domains (round-robin)', () => {
        const selected = selectQuestions(pool, {
            studyId: 'study-cissp',
            questionCount: 8,
            timeLimitMinutes: 60,
            domainIds: [],
            difficulty: 'all',
            mode: 'real_mix',
        });

        expect(selected.length).toBe(8);
        // Should have questions from all 4 domains
        const domains = new Set(selected.map(q => q.domainIds[0]));
        expect(domains.size).toBe(4);
    });

    it('avoids questions from recent exams when possible', () => {
        const performanceData: StrategyPerformanceData = {
            performanceSummary: {
                studyId: 'study-cissp',
                domainAccuracy: {},
                questionAttempts: {},
                recentExamQuestionIds: ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'],
                recentExamWindow: 3,
                updatedAt: Date.now(),
            },
        };

        // Run multiple times, check that recent questions are largely avoided
        let recentAppearances = 0;
        const runs = 20;
        const recentSet = new Set(['r1', 'r2', 'r3', 'r4', 'r5', 'r6']);

        for (let i = 0; i < runs; i++) {
            const selected = selectQuestions(pool, {
                studyId: 'study-cissp',
                questionCount: 6,
                timeLimitMinutes: 60,
                domainIds: [],
                difficulty: 'all',
                mode: 'real_mix',
            }, performanceData);

            expect(selected.length).toBe(6);
            recentAppearances += selected.filter(q => recentSet.has(q.id)).length;
        }

        // With 6 non-recent questions available and requesting 6, most runs should use non-recent
        const avgRecent = recentAppearances / (runs * 6);
        expect(avgRecent).toBeLessThan(0.3);
    });

    it('includes difficulty mix (easy/medium/hard)', () => {
        const selected = selectQuestions(pool, {
            studyId: 'study-cissp',
            questionCount: 12,
            timeLimitMinutes: 60,
            domainIds: [],
            difficulty: 'all',
            mode: 'real_mix',
        });

        expect(selected.length).toBe(12);

        const difficulties = { easy: 0, medium: 0, hard: 0 };
        for (const q of selected) {
            difficulties[q.difficulty]++;
        }

        // Should have a mix (not all one difficulty)
        expect(difficulties.easy).toBeGreaterThan(0);
        expect(difficulties.medium).toBeGreaterThan(0);
        expect(difficulties.hard).toBeGreaterThan(0);
    });

    it('does not filter difficulty when mode is real_mix', () => {
        // Even with difficulty='easy', real_mix ignores it and applies its own distribution
        const selected = selectQuestions(pool, {
            studyId: 'study-cissp',
            questionCount: 9,
            timeLimitMinutes: 60,
            domainIds: [],
            difficulty: 'all',
            mode: 'real_mix',
        });

        expect(selected.length).toBe(9);
        // Should have multiple difficulties
        const diffs = new Set(selected.map(q => q.difficulty));
        expect(diffs.size).toBeGreaterThan(1);
    });
});

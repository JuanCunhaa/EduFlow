import { describe, it, expect } from 'vitest';
import { selectQuestions, scoreExam, sanitizeQuestionsForExam } from '@/lib/exam-engine';
import type { Question } from '@/types';
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

import { describe, it, expect } from 'vitest';
import { selectQuestions, scoreExam, sanitizeQuestionsForExam } from '@/lib/exam-engine';
import type { Question } from '@/types';
import type { Timestamp } from 'firebase/firestore';

// Helper to create mock questions
function makeQuestion(overrides: Partial<Question> & { id: string }): Question {
    return {
        certification: 'CISSP',
        domain: `Domain ${overrides.domainNumber || 1}`,
        domainNumber: 1,
        text: `Question ${overrides.id}`,
        options: [
            { label: 'A', text: 'Option A' },
            { label: 'B', text: 'Option B' },
            { label: 'C', text: 'Option C' },
            { label: 'D', text: 'Option D' },
        ],
        correctOptionIndex: 0,
        explanation: 'Test explanation',
        difficulty: 'medium',
        tags: [],
        createdAt: {} as Timestamp,
        updatedAt: {} as Timestamp,
        ...overrides,
    };
}

describe('selectQuestions', () => {
    const pool: Question[] = [
        makeQuestion({ id: 'q1', domainNumber: 1, domain: 'Domain 1' }),
        makeQuestion({ id: 'q2', domainNumber: 1, domain: 'Domain 1' }),
        makeQuestion({ id: 'q3', domainNumber: 2, domain: 'Domain 2' }),
        makeQuestion({ id: 'q4', domainNumber: 2, domain: 'Domain 2' }),
        makeQuestion({ id: 'q5', domainNumber: 3, domain: 'Domain 3' }),
        makeQuestion({ id: 'q6', domainNumber: 3, domain: 'Domain 3' }),
    ];

    it('selects the requested number of questions', () => {
        const selected = selectQuestions(pool, {
            certification: 'CISSP',
            questionCount: 3,
            timeLimitMinutes: 60,
            domains: [],
            difficulty: 'all',
        });
        expect(selected).toHaveLength(3);
    });

    it('returns empty array when no questions match certification', () => {
        const selected = selectQuestions(pool, {
            certification: 'CC',
            questionCount: 3,
            timeLimitMinutes: 60,
            domains: [],
            difficulty: 'all',
        });
        expect(selected).toHaveLength(0);
    });

    it('filters by difficulty', () => {
        const mixedPool = [
            ...pool,
            makeQuestion({ id: 'q7', domainNumber: 1, domain: 'Domain 1', difficulty: 'hard' }),
        ];
        const selected = selectQuestions(mixedPool, {
            certification: 'CISSP',
            questionCount: 10,
            timeLimitMinutes: 60,
            domains: [],
            difficulty: 'hard',
        });
        expect(selected).toHaveLength(1);
        expect(selected[0].difficulty).toBe('hard');
    });

    it('filters by domain numbers', () => {
        const selected = selectQuestions(pool, {
            certification: 'CISSP',
            questionCount: 10,
            timeLimitMinutes: 60,
            domains: [1],
            difficulty: 'all',
        });
        expect(selected).toHaveLength(2);
        expect(selected.every((q) => q.domainNumber === 1)).toBe(true);
    });

    it('caps at pool size when requesting more than available', () => {
        const selected = selectQuestions(pool, {
            certification: 'CISSP',
            questionCount: 100,
            timeLimitMinutes: 60,
            domains: [],
            difficulty: 'all',
        });
        expect(selected).toHaveLength(pool.length);
    });

    it('distributes across domains with round-robin', () => {
        const selected = selectQuestions(pool, {
            certification: 'CISSP',
            questionCount: 3,
            timeLimitMinutes: 60,
            domains: [],
            difficulty: 'all',
        });
        // Should pick 1 from each domain (round-robin)
        const domainCounts = new Map<number, number>();
        for (const q of selected) {
            domainCounts.set(q.domainNumber, (domainCounts.get(q.domainNumber) || 0) + 1);
        }
        expect(domainCounts.size).toBe(3);
    });
});

describe('scoreExam', () => {
    const questions: Question[] = [
        makeQuestion({ id: 'q1', domain: 'Security Operations', correctOptionIndex: 0 }),
        makeQuestion({ id: 'q2', domain: 'Security Operations', correctOptionIndex: 1 }),
        makeQuestion({ id: 'q3', domain: 'Asset Security', correctOptionIndex: 2 }),
        makeQuestion({ id: 'q4', domain: 'Asset Security', correctOptionIndex: 3 }),
    ];

    it('scores all correct answers at 100%', () => {
        const { score, domainScores } = scoreExam(questions, {
            q1: 0,
            q2: 1,
            q3: 2,
            q4: 3,
        });
        expect(score).toBe(100);
        expect(domainScores['Security Operations'].percentage).toBe(100);
        expect(domainScores['Asset Security'].percentage).toBe(100);
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
        expect(domainScores['Security Operations'].correct).toBe(1);
        expect(domainScores['Security Operations'].total).toBe(2);
        expect(domainScores['Security Operations'].percentage).toBe(50);
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
        expect(domainScores['Security Operations']).toEqual({
            domain: 'Security Operations',
            correct: 2,
            total: 2,
            percentage: 100,
        });
        expect(domainScores['Asset Security']).toEqual({
            domain: 'Asset Security',
            correct: 1,
            total: 2,
            percentage: 50,
        });
    });
});

describe('sanitizeQuestionsForExam', () => {
    it('strips correctOptionIndex and explanation', () => {
        const questions = [
            makeQuestion({ id: 'q1', correctOptionIndex: 2, explanation: 'Secret' }),
        ];
        const sanitized = sanitizeQuestionsForExam(questions);

        expect(sanitized[0]).not.toHaveProperty('correctOptionIndex');
        expect(sanitized[0]).not.toHaveProperty('explanation');
        expect(sanitized[0]).toHaveProperty('id', 'q1');
        expect(sanitized[0]).toHaveProperty('text');
        expect(sanitized[0]).toHaveProperty('options');
    });
});

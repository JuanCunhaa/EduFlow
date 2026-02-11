import { describe, it, expect } from 'vitest';
import {
    createQuestionSchema,
    examConfigSchema,
    submitAnswerSchema,
    bulkImportSchema,
    updateQuestionSchema,
    certificationSchema,
    difficultySchema,
} from '@/lib/validators';

describe('certificationSchema', () => {
    it.each(['CISSP', 'CC', 'SSCP', 'CCSP', 'CGRC'])(
        'accepts valid certification: %s',
        (cert: string) => {
            expect(certificationSchema.parse(cert)).toBe(cert);
        }
    );

    it('rejects invalid certification', () => {
        expect(() => certificationSchema.parse('INVALID')).toThrow();
    });
});

describe('difficultySchema', () => {
    it.each(['easy', 'medium', 'hard'])('accepts: %s', (d: string) => {
        expect(difficultySchema.parse(d)).toBe(d);
    });

    it('rejects invalid difficulty', () => {
        expect(() => difficultySchema.parse('extreme')).toThrow();
    });
});

describe('createQuestionSchema', () => {
    const validQuestion = {
        certification: 'CISSP',
        domain: 'Security Operations',
        domainNumber: 1,
        text: 'What is the purpose of a firewall?',
        options: [
            { label: 'A', text: 'Block traffic' },
            { label: 'B', text: 'Encrypt data' },
            { label: 'C', text: 'Store logs' },
            { label: 'D', text: 'Backup files' },
        ],
        correctOptionIndex: 0,
        explanation: 'Firewalls are used to control network traffic.',
        difficulty: 'medium',
        tags: ['networking'],
    };

    it('accepts a valid question', () => {
        const result = createQuestionSchema.parse(validQuestion);
        expect(result.certification).toBe('CISSP');
        expect(result.options).toHaveLength(4);
    });

    it('defaults tags to empty array when omitted', () => {
        const { tags, ...withoutTags } = validQuestion;
        const result = createQuestionSchema.parse(withoutTags);
        expect(result.tags).toEqual([]);
    });

    it('strips HTML from text fields', () => {
        const questionWithHtml = {
            ...validQuestion,
            text: '<script>alert("xss")</script>What is a firewall?',
            domain: '<b>Security</b> Ops',
            explanation: '<img src=x onerror=alert(1)>Firewalls filter traffic.',
            options: [
                { label: 'A', text: '<em>Block</em> traffic' },
                { label: 'B', text: 'Encrypt data' },
                { label: 'C', text: 'Store logs' },
                { label: 'D', text: 'Backup files' },
            ],
        };
        const result = createQuestionSchema.parse(questionWithHtml);
        expect(result.text).toBe('alert("xss")What is a firewall?');
        expect(result.domain).toBe('Security Ops');
        expect(result.explanation).toBe('Firewalls filter traffic.');
        expect(result.options[0].text).toBe('Block traffic');
    });

    it('strips HTML from tags', () => {
        const result = createQuestionSchema.parse({
            ...validQuestion,
            tags: ['<b>tag1</b>', 'tag2'],
        });
        expect(result.tags).toEqual(['tag1', 'tag2']);
    });

    it('rejects question with fewer than 4 options', () => {
        expect(() =>
            createQuestionSchema.parse({
                ...validQuestion,
                options: [{ label: 'A', text: 'Only one' }],
            })
        ).toThrow();
    });

    it('rejects question with more than 4 options', () => {
        expect(() =>
            createQuestionSchema.parse({
                ...validQuestion,
                options: [
                    ...validQuestion.options,
                    { label: 'E', text: 'Extra' },
                ],
            })
        ).toThrow();
    });

    it('rejects correctOptionIndex out of range', () => {
        expect(() =>
            createQuestionSchema.parse({
                ...validQuestion,
                correctOptionIndex: 5,
            })
        ).toThrow();
    });

    it('rejects text shorter than min length', () => {
        expect(() =>
            createQuestionSchema.parse({
                ...validQuestion,
                text: 'Short',
            })
        ).toThrow();
    });

    it('rejects domainNumber outside 1-8', () => {
        expect(() =>
            createQuestionSchema.parse({
                ...validQuestion,
                domainNumber: 0,
            })
        ).toThrow();

        expect(() =>
            createQuestionSchema.parse({
                ...validQuestion,
                domainNumber: 9,
            })
        ).toThrow();
    });
});

describe('updateQuestionSchema', () => {
    it('accepts partial updates', () => {
        const result = updateQuestionSchema.parse({ difficulty: 'hard' });
        expect(result.difficulty).toBe('hard');
    });

    it('accepts empty object', () => {
        const result = updateQuestionSchema.parse({});
        expect(result).toBeDefined();
    });
});

describe('examConfigSchema', () => {
    const validConfig = {
        questionCount: 25,
        timeLimitMinutes: 60,
        domains: [1, 2],
        difficulty: 'medium',
        certification: 'CISSP',
    };

    it('accepts valid exam config', () => {
        const result = examConfigSchema.parse(validConfig);
        expect(result.questionCount).toBe(25);
        expect(result.certification).toBe('CISSP');
    });

    it('defaults domains to empty array', () => {
        const { domains, ...without } = validConfig;
        const result = examConfigSchema.parse(without);
        expect(result.domains).toEqual([]);
    });

    it('defaults difficulty to "all"', () => {
        const { difficulty, ...without } = validConfig;
        const result = examConfigSchema.parse(without);
        expect(result.difficulty).toBe('all');
    });

    it('accepts "all" as difficulty', () => {
        const result = examConfigSchema.parse({ ...validConfig, difficulty: 'all' });
        expect(result.difficulty).toBe('all');
    });

    it.each([10, 25, 50, 100, 150])('accepts valid questionCount: %d', (count: number) => {
        expect(() =>
            examConfigSchema.parse({ ...validConfig, questionCount: count })
        ).not.toThrow();
    });

    it.each([0, 5, 15, 30, 75, 200])('rejects invalid questionCount: %d', (count: number) => {
        expect(() =>
            examConfigSchema.parse({ ...validConfig, questionCount: count })
        ).toThrow();
    });

    it('rejects negative timeLimitMinutes', () => {
        expect(() =>
            examConfigSchema.parse({ ...validConfig, timeLimitMinutes: -1 })
        ).toThrow();
    });
});

describe('submitAnswerSchema', () => {
    it('accepts valid answer', () => {
        const result = submitAnswerSchema.parse({
            questionId: 'q1',
            selectedOptionIndex: 2,
        });
        expect(result.questionId).toBe('q1');
        expect(result.selectedOptionIndex).toBe(2);
    });

    it('accepts null selectedOptionIndex (skipped question)', () => {
        const result = submitAnswerSchema.parse({
            questionId: 'q1',
            selectedOptionIndex: null,
        });
        expect(result.selectedOptionIndex).toBeNull();
    });

    it('rejects empty questionId', () => {
        expect(() =>
            submitAnswerSchema.parse({ questionId: '', selectedOptionIndex: 0 })
        ).toThrow();
    });

    it('rejects selectedOptionIndex out of range', () => {
        expect(() =>
            submitAnswerSchema.parse({ questionId: 'q1', selectedOptionIndex: 5 })
        ).toThrow();
    });
});

describe('bulkImportSchema', () => {
    const validQuestion = {
        certification: 'CISSP',
        domain: 'Security Operations',
        domainNumber: 1,
        text: 'What is the purpose of a firewall?',
        options: [
            { label: 'A', text: 'Block traffic' },
            { label: 'B', text: 'Encrypt data' },
            { label: 'C', text: 'Store logs' },
            { label: 'D', text: 'Backup files' },
        ],
        correctOptionIndex: 0,
        explanation: 'Firewalls are used to control network traffic.',
        difficulty: 'medium',
    };

    it('accepts array with at least 1 question', () => {
        const result = bulkImportSchema.parse({ questions: [validQuestion] });
        expect(result.questions).toHaveLength(1);
    });

    it('rejects empty array', () => {
        expect(() => bulkImportSchema.parse({ questions: [] })).toThrow();
    });
});

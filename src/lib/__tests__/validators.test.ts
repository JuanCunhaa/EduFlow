import { describe, it, expect } from 'vitest';
import {
    createQuestionSchema,
    examConfigSchema,
    submitAnswerSchema,
    bulkImportSchema,
    updateQuestionSchema,
    certificationSchema,
    difficultySchema,
    examModeSchema,
    createStudySchema,
} from '@/lib/validators';

describe('certificationSchema (deprecated, kept for migration)', () => {
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

describe('examModeSchema', () => {
    it.each(['practice', 'weak_domains', 'recent_misses', 'real_mix', 'domain_focus'])(
        'accepts: %s',
        (mode: string) => {
            expect(examModeSchema.parse(mode)).toBe(mode);
        }
    );

    it('rejects invalid mode', () => {
        expect(() => examModeSchema.parse('invalid_mode')).toThrow();
    });
});

describe('createStudySchema', () => {
    const validStudy = {
        abbreviation: 'CISSP',
        name: 'Certified Information Systems Security Professional',
        domains: [
            { id: 'd1', abbreviation: 'SAM', name: 'Security and Risk Management', order: 0 },
            { id: 'd2', abbreviation: 'AS', name: 'Asset Security', order: 1 },
        ],
    };

    it('accepts a valid study', () => {
        const result = createStudySchema.parse(validStudy);
        expect(result.abbreviation).toBe('CISSP');
        expect(result.domains).toHaveLength(2);
    });

    it('requires at least one domain', () => {
        expect(() =>
            createStudySchema.parse({ ...validStudy, domains: [] })
        ).toThrow();
    });

    it('strips HTML from name', () => {
        const result = createStudySchema.parse({
            ...validStudy,
            name: '<b>CISSP</b> Certification',
        });
        expect(result.name).toBe('CISSP Certification');
    });
});

describe('createQuestionSchema', () => {
    const validQuestion = {
        studyId: 'study-cissp',
        domainIds: ['d1'],
        text: 'What is the purpose of a firewall?',
        options: [
            { label: 'A', text: 'Block traffic' },
            { label: 'B', text: 'Encrypt data' },
            { label: 'C', text: 'Store logs' },
            { label: 'D', text: 'Backup files' },
        ],
        correctOptionIndex: 0,
        explanation: {
            short: 'Firewalls are used to control network traffic.',
            whyOthersWrong: { B: 'Encrypts, not blocks', C: 'Stores logs only', D: 'Backs up files' },
        },
        difficulty: 'medium',
        tags: ['networking'],
    };

    it('accepts a valid question', () => {
        const result = createQuestionSchema.parse(validQuestion);
        expect(result.studyId).toBe('study-cissp');
        expect(result.domainIds).toEqual(['d1']);
        expect(result.options).toHaveLength(4);
    });

    it('defaults tags to empty array when omitted', () => {
        const { tags, ...withoutTags } = validQuestion;
        const result = createQuestionSchema.parse(withoutTags);
        expect(result.tags).toEqual([]);
    });

    it('defaults whyOthersWrong to empty object when omitted', () => {
        const q = { ...validQuestion, explanation: { short: 'Firewalls block.' } };
        const result = createQuestionSchema.parse(q);
        expect(result.explanation.whyOthersWrong).toEqual({});
    });

    it('accepts whyOthersWrong per-option entries', () => {
        const result = createQuestionSchema.parse(validQuestion);
        expect(result.explanation.whyOthersWrong).toEqual({
            B: 'Encrypts, not blocks',
            C: 'Stores logs only',
            D: 'Backs up files',
        });
    });

    it('strips HTML from text fields', () => {
        const questionWithHtml = {
            ...validQuestion,
            text: '<script>alert("xss")</script>What is a firewall?',
            explanation: {
                short: '<img src=x onerror=alert(1)>Firewalls filter traffic.',
                whyOthersWrong: { B: '<b>wrong</b>' },
            },
            options: [
                { label: 'A', text: '<em>Block</em> traffic' },
                { label: 'B', text: 'Encrypt data' },
                { label: 'C', text: 'Store logs' },
                { label: 'D', text: 'Backup files' },
            ],
        };
        const result = createQuestionSchema.parse(questionWithHtml);
        expect(result.text).toBe('alert("xss")What is a firewall?');
        expect(result.explanation.short).toBe('Firewalls filter traffic.');
        expect(result.explanation.whyOthersWrong.B).toBe('wrong');
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

    it('accepts question with 5 options', () => {
        const fiveOpts = {
            ...validQuestion,
            options: [
                ...validQuestion.options,
                { label: 'E', text: 'Extra option' },
            ],
        };
        const result = createQuestionSchema.parse(fiveOpts);
        expect(result.options).toHaveLength(5);
    });

    it('rejects question with more than 5 options', () => {
        expect(() =>
            createQuestionSchema.parse({
                ...validQuestion,
                options: [
                    ...validQuestion.options,
                    { label: 'E', text: 'Extra' },
                    { label: 'F', text: 'Too many' },
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

    it('rejects correctOptionIndex >= options length', () => {
        expect(() =>
            createQuestionSchema.parse({
                ...validQuestion,
                correctOptionIndex: 4, // only 4 options (0-3)
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

    it('requires at least one domainId', () => {
        expect(() =>
            createQuestionSchema.parse({
                ...validQuestion,
                domainIds: [],
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
        studyId: 'study-cissp',
        questionCount: 25,
        timeLimitMinutes: 60,
        domainIds: ['d1', 'd2'],
        difficulty: 'medium',
    };

    it('accepts valid exam config', () => {
        const result = examConfigSchema.parse(validConfig);
        expect(result.questionCount).toBe(25);
        expect(result.studyId).toBe('study-cissp');
    });

    it('defaults domainIds to empty array', () => {
        const { domainIds, ...without } = validConfig;
        const result = examConfigSchema.parse(without);
        expect(result.domainIds).toEqual([]);
    });

    it('defaults difficulty to "all"', () => {
        const { difficulty, ...without } = validConfig;
        const result = examConfigSchema.parse(without);
        expect(result.difficulty).toBe('all');
    });

    it('defaults mode to "practice"', () => {
        const result = examConfigSchema.parse(validConfig);
        expect(result.mode).toBe('practice');
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
        studyId: 'study-cissp',
        domainIds: ['d1'],
        text: 'What is the purpose of a firewall?',
        options: [
            { label: 'A', text: 'Block traffic' },
            { label: 'B', text: 'Encrypt data' },
            { label: 'C', text: 'Store logs' },
            { label: 'D', text: 'Backup files' },
        ],
        correctOptionIndex: 0,
        explanation: {
            short: 'Firewalls are used to control network traffic.',
            whyOthersWrong: {},
        },
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

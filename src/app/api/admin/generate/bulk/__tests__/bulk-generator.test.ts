import { describe, it, expect } from 'vitest';
import { isValidQuestion, stripMarkdown, cleanQ, type GeneratedQuestion } from '@/lib/generator-utils';

describe('generator-utils', () => {
    describe('stripMarkdown', () => {
        it('removes bold markdown', () => {
            expect(stripMarkdown('This is **bold** text')).toBe('This is bold text');
            expect(stripMarkdown('**Start** and **end**')).toBe('Start and end');
        });

        it('removes italic markdown', () => {
            expect(stripMarkdown('This is *italic* text')).toBe('This is italic text');
        });

        it('handles undefined or empty strings gracefully', () => {
            expect(stripMarkdown('')).toBe('');
            expect(stripMarkdown(undefined as any)).toBe('');
        });
    });

    describe('isValidQuestion', () => {
        const validQuestion: GeneratedQuestion = {
            text: 'What is the primary purpose of a firewall in a network?',
            options: [
                { label: 'A', text: 'To encrypt data at rest' },
                { label: 'B', text: 'To filter incoming and outgoing network traffic' },
                { label: 'C', text: 'To physically secure servers' },
                { label: 'D', text: 'To prevent social engineering' }
            ],
            correctOptionIndex: 1,
            explanation: {
                short: 'A firewall controls network access based on rules.',
                whyOthersWrong: {}
            },
            difficulty: 'medium',
            domainIds: ['domain1'],
            tags: []
        };

        it('returns true for a perfectly valid question', () => {
            expect(isValidQuestion(validQuestion)).toBe(true);
        });

        it('returns false if text is too short', () => {
            expect(isValidQuestion({ ...validQuestion, text: 'Short?' })).toBe(false);
        });

        it('returns false if options length is not 4', () => {
            expect(isValidQuestion({
                ...validQuestion,
                options: validQuestion.options.slice(0, 3)
            })).toBe(false);
        });

        it('returns false if correctOptionIndex is out of bounds', () => {
            expect(isValidQuestion({ ...validQuestion, correctOptionIndex: -1 })).toBe(false);
            expect(isValidQuestion({ ...validQuestion, correctOptionIndex: 4 })).toBe(false);
        });

        it('returns false if explanation is missing or too short', () => {
            expect(isValidQuestion({
                ...validQuestion,
                explanation: { short: 'No', whyOthersWrong: {} }
            })).toBe(false);
        });

        it('returns false for invalid difficulty', () => {
            expect(isValidQuestion({ ...validQuestion, difficulty: 'extreme' })).toBe(false);
        });
    });

    describe('cleanQ', () => {
        it('recursively cleans markdown from question text, options, and explanation', () => {
            const rawQuestion: GeneratedQuestion = {
                text: 'What does **DNS** stand for?',
                options: [
                    { label: 'A', text: '*Domain Name System*' },
                    { label: 'B', text: 'Dynamic Name System' },
                    { label: 'C', text: 'Data Network Server' },
                    { label: 'D', text: 'Digital Naming Service' }
                ],
                correctOptionIndex: 0,
                explanation: {
                    short: 'It maps **IP addresses** to names.',
                    whyOthersWrong: {}
                },
                difficulty: 'easy',
                domainIds: [],
                tags: []
            };

            const cleaned = cleanQ(rawQuestion);

            expect(cleaned.text).toBe('What does DNS stand for?');
            expect(cleaned.options[0].text).toBe('Domain Name System');
            expect(cleaned.explanation.short).toBe('It maps IP addresses to names.');
        });
    });
});

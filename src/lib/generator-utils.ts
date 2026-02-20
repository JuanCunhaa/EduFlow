/**
 * Utility functions for AI question generation and validation.
 */

export interface GeneratedQuestion {
    text: string;
    options: Array<{ label: string; text: string }>;
    correctOptionIndex: number;
    explanation: { short: string; whyOthersWrong: Record<string, string>; examTip?: string };
    difficulty: string;
    domainIds: string[];
    tags: string[];
}

export function isValidQuestion(q: GeneratedQuestion): boolean {
    if (!q?.text || q.text.length < 10) return false;
    if (!Array.isArray(q.options) || q.options.length !== 4) return false;
    if (typeof q.correctOptionIndex !== 'number') return false;
    if (q.correctOptionIndex < 0 || q.correctOptionIndex > 3) return false;
    if (!q.explanation?.short || q.explanation.short.length < 10) return false;
    if (!['easy', 'medium', 'hard'].includes(q.difficulty)) return false;
    return true;
}

export function stripMarkdown(s: string): string {
    if (!s) return '';
    return s.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1');
}

export function cleanQ(q: GeneratedQuestion): GeneratedQuestion {
    return {
        ...q,
        text: stripMarkdown(q.text),
        options: q.options.map((o) => ({ ...o, text: stripMarkdown(o.text) })),
        explanation: { ...q.explanation, short: stripMarkdown(q.explanation.short ?? '') },
    };
}

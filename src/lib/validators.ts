import { z } from 'zod';

// === Sanitization ===

/** Strip HTML tags from user input as defense-in-depth against stored XSS */
function stripHtml(value: string): string {
    return value.replace(/<[^>]*>/g, '');
}

/** Zod transform that strips HTML from strings */
const safeString = (minLen: number) =>
    z.string().min(minLen).transform(stripHtml);

// === Shared ===

export const certificationSchema = z.enum(['CISSP', 'CC', 'SSCP', 'CCSP', 'CGRC']);
export const difficultySchema = z.enum(['easy', 'medium', 'hard']);

// === Question ===

export const optionSchema = z.object({
    label: z.string().min(1),
    text: safeString(1),
});

export const createQuestionSchema = z.object({
    certification: certificationSchema,
    domain: safeString(1),
    domainNumber: z.number().int().min(1).max(8),
    text: safeString(10),
    options: z.array(optionSchema).length(4),
    correctOptionIndex: z.number().int().min(0).max(3),
    explanation: safeString(10),
    difficulty: difficultySchema,
    tags: z.array(z.string().transform(stripHtml)).default([]),
});

export const updateQuestionSchema = createQuestionSchema.partial();

// === Exam ===

export const examConfigSchema = z.object({
    questionCount: z.number().int().refine(
        (n: number) => [10, 25, 50, 100, 150].includes(n),
        { message: 'questionCount must be one of: 10, 25, 50, 100, 150' }
    ),
    timeLimitMinutes: z.number().int().min(0),
    domains: z.array(z.number().int().min(1).max(8)).default([]),
    difficulty: z.union([difficultySchema, z.literal('all')]).default('all'),
    certification: certificationSchema,
});

export const submitAnswerSchema = z.object({
    questionId: z.string().min(1),
    selectedOptionIndex: z.number().int().min(0).max(3).nullable(),
});

// === Bulk Import ===

export const bulkImportSchema = z.object({
    questions: z.array(createQuestionSchema).min(1).max(500),
});

// === Type Exports ===

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
export type ExamConfigInput = z.infer<typeof examConfigSchema>;
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;
export type BulkImportInput = z.infer<typeof bulkImportSchema>;

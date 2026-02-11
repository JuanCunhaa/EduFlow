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

/** @deprecated Use studyId reference instead */
export const certificationSchema = z.enum(['CISSP', 'CC', 'SSCP', 'CCSP', 'CGRC']);
export const difficultySchema = z.enum(['easy', 'medium', 'hard']);
export const examModeSchema = z.enum(['practice', 'weak_domains', 'recent_misses', 'real_mix', 'domain_focus', 'spaced_review']);

// === Study ===

export const studyDomainSchema = z.object({
    id: z.string().min(1).max(20),
    abbreviation: safeString(1),
    name: safeString(1),
    order: z.number().int().min(0),
});

export const createStudySchema = z.object({
    abbreviation: safeString(1).pipe(z.string().max(20)),
    name: safeString(2).pipe(z.string().max(200)),
    domains: z.array(studyDomainSchema).min(1).max(30),
    accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const updateStudySchema = createStudySchema.partial();

// === Question ===

export const optionSchema = z.object({
    label: z.string().min(1),
    text: safeString(1),
});

export const explanationSchema = z.object({
    short: safeString(10),
    whyOthersWrong: z.record(z.string().max(1), z.string().transform(stripHtml)).default({}),
});

export const createQuestionSchema = z.object({
    studyId: z.string().min(1),
    domainIds: z.array(z.string().min(1)).min(1).max(10),
    text: safeString(10),
    options: z.array(optionSchema).min(4).max(5),
    correctOptionIndex: z.number().int().min(0).max(4),
    explanation: explanationSchema,
    difficulty: difficultySchema,
    tags: z.array(z.string().transform(stripHtml)).default([]),
}).refine(
    (data) => data.correctOptionIndex < data.options.length,
    { message: 'correctOptionIndex must be less than the number of options', path: ['correctOptionIndex'] }
);

export const updateQuestionSchema = z.object({
    studyId: z.string().min(1).optional(),
    domainIds: z.array(z.string().min(1)).min(1).max(10).optional(),
    text: safeString(10).optional(),
    options: z.array(optionSchema).min(4).max(5).optional(),
    correctOptionIndex: z.number().int().min(0).max(4).optional(),
    explanation: explanationSchema.optional(),
    difficulty: difficultySchema.optional(),
    tags: z.array(z.string().transform(stripHtml)).optional(),
});

// === Exam ===

export const examConfigSchema = z.object({
    studyId: z.string().min(1),
    questionCount: z.number().int().refine(
        (n: number) => [10, 25, 50, 100, 150].includes(n),
        { message: 'questionCount must be one of: 10, 25, 50, 100, 150' }
    ),
    timeLimitMinutes: z.number().int().min(0),
    domainIds: z.array(z.string().min(1)).default([]),
    difficulty: z.union([difficultySchema, z.literal('all')]).default('all'),
    mode: examModeSchema.default('practice'),
});

export const submitAnswerSchema = z.object({
    questionId: z.string().min(1),
    selectedOptionIndex: z.number().int().min(0).max(4).nullable(),
});

// === Bulk Import ===

export const bulkImportSchema = z.object({
    questions: z.array(createQuestionSchema).min(1).max(500),
});

// === Stats ===

export const updateGoalSchema = z.object({
    dailyGoal: z.number().int().min(1).max(200).optional(),
    weeklyGoal: z.number().int().min(1).max(1000).optional(),
}).refine(d => d.dailyGoal !== undefined || d.weeklyGoal !== undefined, {
    message: 'At least one goal field is required',
});

// === Type Exports ===

export type CreateStudyInput = z.infer<typeof createStudySchema>;
export type UpdateStudyInput = z.infer<typeof updateStudySchema>;
export type StudyDomainInput = z.infer<typeof studyDomainSchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
export type ExamConfigInput = z.infer<typeof examConfigSchema>;
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;
export type BulkImportInput = z.infer<typeof bulkImportSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;

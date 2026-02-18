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

// === Marketplace ===

export const marketplaceDomainSchema = studyDomainSchema.extend({
    description: z.string().max(500).transform(stripHtml).optional(),
});

export const createMarketplaceStudySchema = z.object({
    abbreviation: safeString(1).pipe(z.string().max(20)),
    name: safeString(2).pipe(z.string().max(200)),
    description: safeString(10).pipe(z.string().max(2000)),
    domains: z.array(marketplaceDomainSchema).min(1).max(30),
    accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    tags: z.array(z.string().transform(stripHtml).pipe(z.string().max(50))).max(20).default([]),
});

export const updateMarketplaceStudySchema = createMarketplaceStudySchema.partial();

const marketplaceQuestionBaseSchema = z.object({
    domainIds: z.array(z.string().min(1)).min(1).max(10),
    text: safeString(10),
    options: z.array(optionSchema).min(4).max(5),
    correctOptionIndex: z.number().int().min(0).max(4),
    explanation: explanationSchema,
    difficulty: difficultySchema,
    tags: z.array(z.string().transform(stripHtml)).default([]),
});

export const createMarketplaceQuestionSchema = marketplaceQuestionBaseSchema.refine(
    (data) => data.correctOptionIndex < data.options.length,
    { message: 'correctOptionIndex must be less than the number of options', path: ['correctOptionIndex'] }
);

export const updateMarketplaceQuestionSchema = marketplaceQuestionBaseSchema.partial();

export const marketplaceBulkQuestionsSchema = z.object({
    questions: z.array(createMarketplaceQuestionSchema).min(1).max(500),
});

export const marketplaceImportSchema = z.object({
    studyId: z.string().min(1),
    domainIds: z.array(z.string().min(1)).min(1).max(10),
});

// === Question Report ===

export const reportReasonSchema = z.enum([
    'wrong_answer', 'ambiguous', 'outdated', 'duplicate', 'unclear', 'offensive', 'other',
]);

export const reportStatusSchema = z.enum([
    'open', 'reviewing', 'resolved_fixed', 'resolved_rejected', 'resolved_archived',
]);

export const createQuestionReportSchema = z.object({
    questionId: z.string().min(1),
    marketplaceQuestionId: z.string().min(1).optional(),
    studyId: z.string().min(1),
    reason: reportReasonSchema,
    description: safeString(10).pipe(z.string().max(2000)),
});

export const resolveQuestionReportSchema = z.object({
    status: z.enum(['resolved_fixed', 'resolved_rejected', 'resolved_archived']),
    resolution: safeString(5).pipe(z.string().max(2000)),
});

// === Content Audit ===

export const contentActionSchema = z.enum([
    'created', 'reviewed', 'approved', 'rejected', 'imported', 'archived', 'edited', 'flagged', 'reported',
]);

export const createContentAuditSchema = z.object({
    action: contentActionSchema,
    batchId: z.string().max(200).optional(),
    studyId: z.string().min(1).optional(),
    questionId: z.string().min(1).optional(),
    questionCount: z.number().int().min(0).optional(),
    notes: z.string().max(5000).transform(stripHtml).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

// === Question Lifecycle ===

export const questionLifecycleSchema = z.enum(['active', 'flagged', 'archived', 'revised']);

export const updateQuestionLifecycleSchema = z.object({
    lifecycle: questionLifecycleSchema,
    reason: z.string().max(1000).transform(stripHtml).optional(),
});

// === Review Status ===

export const reviewStatusSchema = z.enum([
    'draft', 'founder_reviewed', 'expert_reviewed', 'needs_revision', 'approved', 'published', 'archived',
]);

// === Content Batch Validation ===

export const contentBatchMetadataSchema = z.object({
    certId: z.string().min(1).max(20),
    domainId: z.string().min(1).max(20),
    batchNumber: z.number().int().min(1),
    generatedAt: z.string().datetime(),
    generatedBy: z.string().min(1).max(100),
    reviewedBy: z.string().max(100).optional(),
    reviewedAt: z.string().datetime().optional(),
});

export const contentBatchQuestionSchema = z.object({
    text: safeString(20),
    options: z.array(optionSchema).min(4).max(5),
    correctOptionIndex: z.number().int().min(0).max(4),
    explanation: explanationSchema,
    difficulty: difficultySchema,
    domainIds: z.array(z.string().min(1)).min(1).max(10),
    tags: z.array(z.string().transform(stripHtml)).min(1).max(10),
    questionType: z.enum(['mcq', 'ordering', 'hotspot']).default('mcq'),
}).refine(
    (data) => data.correctOptionIndex < data.options.length,
    { message: 'correctOptionIndex must be less than the number of options', path: ['correctOptionIndex'] }
);

export const contentBatchSchema = z.object({
    metadata: contentBatchMetadataSchema,
    questions: z.array(contentBatchQuestionSchema).min(1).max(500),
});

// === Content Contributor ===

export const createContributorSchema = z.object({
    name: safeString(2).pipe(z.string().max(100)),
    email: z.string().email(),
    role: z.enum(['admin', 'reviewer', 'author']),
    certifications: z.array(z.string().max(20)).max(10).optional(),
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
export type CreateMarketplaceStudyInput = z.infer<typeof createMarketplaceStudySchema>;
export type UpdateMarketplaceStudyInput = z.infer<typeof updateMarketplaceStudySchema>;
export type CreateMarketplaceQuestionInput = z.infer<typeof createMarketplaceQuestionSchema>;
export type UpdateMarketplaceQuestionInput = z.infer<typeof updateMarketplaceQuestionSchema>;
export type MarketplaceBulkQuestionsInput = z.infer<typeof marketplaceBulkQuestionsSchema>;
export type MarketplaceImportInput = z.infer<typeof marketplaceImportSchema>;
export type CreateQuestionReportInput = z.infer<typeof createQuestionReportSchema>;
export type ResolveQuestionReportInput = z.infer<typeof resolveQuestionReportSchema>;
export type CreateContentAuditInput = z.infer<typeof createContentAuditSchema>;
export type UpdateQuestionLifecycleInput = z.infer<typeof updateQuestionLifecycleSchema>;
export type ContentBatchInput = z.infer<typeof contentBatchSchema>;
export type ContentBatchQuestionInput = z.infer<typeof contentBatchQuestionSchema>;
export type CreateContributorInput = z.infer<typeof createContributorSchema>;

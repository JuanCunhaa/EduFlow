/**
 * validate-questions.ts — Pre-import QA validation for content batches.
 *
 * Runs all quality checks defined in question-quality-standard.md before
 * any batch is imported into Firestore. Blocks import on errors, allows
 * import with warnings.
 *
 * Usage:
 *   npx tsx scripts/validate-questions.ts <batch-file.json> [--strict] [--fix-suggestions]
 *
 * Exit codes:
 *   0 — all questions passed (may have warnings)
 *   1 — one or more questions had blocking errors
 *   2 — invalid arguments or file not found
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// ── Types ───────────────────────────────────────

type Difficulty = 'easy' | 'medium' | 'hard';

interface Option {
    label: string;
    text: string;
}

interface Explanation {
    short: string;
    whyOthersWrong: Record<string, string>;
    examTip?: string;
}

interface BatchQuestion {
    text: string;
    options: Option[];
    correctOptionIndex: number;
    explanation: Explanation;
    difficulty: Difficulty;
    domainIds: string[];
    tags: string[];
    questionType?: string;
}

interface BatchMetadata {
    certId: string;
    domainId: string;
    batchNumber: number;
    generatedAt: string;
    generatedBy: string;
    reviewedBy?: string;
    reviewedAt?: string;
}

interface BatchFile {
    metadata: BatchMetadata;
    questions: BatchQuestion[];
}

// ── Validation Errors & Warnings ────────────────

type ValidationError =
    | 'MISSING_EXPLANATION_SHORT'
    | 'EXPLANATION_TOO_SHORT'
    | 'MISSING_WHY_OTHERS_WRONG'
    | 'OPTION_COUNT_INVALID'
    | 'CORRECT_INDEX_OUT_OF_RANGE'
    | 'EMPTY_OPTION_TEXT'
    | 'DUPLICATE_OPTION_TEXT'
    | 'STEM_TOO_SHORT'
    | 'MISSING_DOMAIN_IDS'
    | 'INVALID_DOMAIN_ID'
    | 'MISSING_DIFFICULTY'
    | 'INVALID_DIFFICULTY'
    | 'MISSING_TAGS'
    | 'DUPLICATE_DETECTED'
    | 'FABRICATED_STANDARD'
    | 'ALL_OF_ABOVE_IN_OPTIONS'
    | 'NONE_OF_ABOVE_IN_OPTIONS';

type ValidationWarning =
    | 'ALL_OF_ABOVE_MENTIONED'
    | 'NONE_OF_ABOVE_MENTIONED'
    | 'CORRECT_OPTION_LONGEST'
    | 'UNBALANCED_OPTION_LENGTHS'
    | 'NO_REFERENCE_IN_EXPLANATION'
    | 'POTENTIAL_BIAS'
    | 'STEM_NEGATIVE_UNBOLD'
    | 'LOW_TAG_COUNT'
    | 'MISSING_EXAM_TIP'
    | 'SHORT_EXPLANATION_DISTRACTOR'
    | 'STEM_ANSWERABLE_WITHOUT_OPTIONS';

interface ValidationResult {
    questionIndex: number;
    passed: boolean;
    errors: Array<{ code: ValidationError; message: string }>;
    warnings: Array<{ code: ValidationWarning; message: string }>;
    stem: string;
}

interface BatchValidationSummary {
    batchFile: string;
    totalQuestions: number;
    passed: number;
    failed: number;
    totalErrors: number;
    totalWarnings: number;
    difficultyDistribution: Record<string, number>;
    results: ValidationResult[];
}

// ── Known domain IDs per cert ───────────────────

const KNOWN_DOMAINS: Record<string, string[]> = {
    cissp: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'sam', 'as', 'se', 'cns', 'iam', 'sa', 'so', 'ssd'],
    cc: ['d1', 'd2', 'd3', 'd4', 'd5', 'sp', 'bc', 'ac', 'ns', 'so'],
    sscp: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7'],
    ccsp: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'],
    cgrc: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7'],
    'security-plus': ['d1', 'd2', 'd3', 'd4', 'd5'],
};

// ── Bias terms to flag ──────────────────────────

const BIAS_TERMS = [
    'always', 'never', 'obviously', 'clearly', 'everyone knows',
    'simple', 'trivially', 'of course',
];

// ── Potentially fabricated standards ────────────

const KNOWN_NIST_SP = [
    '800-12', '800-30', '800-37', '800-39', '800-41', '800-44', '800-46',
    '800-50', '800-53', '800-53A', '800-53B', '800-60', '800-61', '800-63',
    '800-64', '800-66', '800-82', '800-83', '800-86', '800-88', '800-92',
    '800-94', '800-100', '800-111', '800-113', '800-114', '800-115', '800-122',
    '800-123', '800-124', '800-125', '800-126', '800-128', '800-137', '800-144',
    '800-145', '800-146', '800-147', '800-150', '800-152', '800-153', '800-154',
    '800-160', '800-161', '800-162', '800-163', '800-164', '800-167', '800-171',
    '800-172', '800-175A', '800-175B', '800-177', '800-178', '800-179', '800-181',
    '800-183', '800-184', '800-185', '800-186', '800-187', '800-188', '800-189',
    '800-190', '800-192', '800-193', '800-199', '800-204', '800-207', '800-210',
    '800-213', '800-215', '800-216', '800-217', '800-218', '800-219', '800-220',
    '800-221', '800-223', '800-224', '800-225', '800-226', '800-228',
];

// ── Validation Logic ─────────────────────────────

function countSentences(text: string): number {
    // Count sentences by periods followed by space or end of string
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return sentences.length;
}

function validateQuestion(
    q: BatchQuestion,
    index: number,
    certId: string,
    allStems: string[]
): ValidationResult {
    const errors: Array<{ code: ValidationError; message: string }> = [];
    const warnings: Array<{ code: ValidationWarning; message: string }> = [];

    // ── ERRORS (block import) ──

    // 1. Stem length
    if (!q.text || q.text.trim().length < 20) {
        errors.push({ code: 'STEM_TOO_SHORT', message: `Stem is ${q.text?.length ?? 0} chars, minimum 20` });
    }

    // 2. Option count
    if (!q.options || q.options.length < 4 || q.options.length > 5) {
        errors.push({ code: 'OPTION_COUNT_INVALID', message: `${q.options?.length ?? 0} options, must be 4 or 5` });
    }

    // 3. correctOptionIndex range
    if (q.correctOptionIndex == null || q.correctOptionIndex < 0 || q.correctOptionIndex >= (q.options?.length ?? 0)) {
        errors.push({ code: 'CORRECT_INDEX_OUT_OF_RANGE', message: `correctOptionIndex ${q.correctOptionIndex} out of range [0-${(q.options?.length ?? 1) - 1}]` });
    }

    // 4. Empty option text
    if (q.options) {
        for (let i = 0; i < q.options.length; i++) {
            if (!q.options[i].text || q.options[i].text.trim().length === 0) {
                errors.push({ code: 'EMPTY_OPTION_TEXT', message: `Option ${q.options[i].label || i} has empty text` });
            }
        }
    }

    // 5. Duplicate option text
    if (q.options) {
        const optTexts = q.options.map(o => o.text.toLowerCase().trim());
        const seen = new Set<string>();
        for (const t of optTexts) {
            if (seen.has(t)) {
                errors.push({ code: 'DUPLICATE_OPTION_TEXT', message: `Duplicate option text: "${t.slice(0, 50)}..."` });
                break;
            }
            seen.add(t);
        }
    }

    // 6. Explanation
    if (!q.explanation?.short || q.explanation.short.trim().length === 0) {
        errors.push({ code: 'MISSING_EXPLANATION_SHORT', message: 'explanation.short is missing or empty' });
    } else if (countSentences(q.explanation.short) < 2) {
        errors.push({ code: 'EXPLANATION_TOO_SHORT', message: `explanation.short has ${countSentences(q.explanation.short)} sentence(s), minimum 2` });
    }

    // 7. whyOthersWrong for ALL incorrect options
    if (q.options && q.explanation?.whyOthersWrong) {
        for (let i = 0; i < q.options.length; i++) {
            if (i === q.correctOptionIndex) continue;
            const label = q.options[i].label;
            if (!q.explanation.whyOthersWrong[label] || q.explanation.whyOthersWrong[label].trim().length === 0) {
                errors.push({ code: 'MISSING_WHY_OTHERS_WRONG', message: `Missing whyOthersWrong for option ${label}` });
            }
        }
    } else if (!q.explanation?.whyOthersWrong) {
        errors.push({ code: 'MISSING_WHY_OTHERS_WRONG', message: 'explanation.whyOthersWrong is missing entirely' });
    }

    // 8. Domain IDs
    if (!q.domainIds || q.domainIds.length === 0) {
        errors.push({ code: 'MISSING_DOMAIN_IDS', message: 'domainIds is empty' });
    } else {
        const known = KNOWN_DOMAINS[certId] || [];
        if (known.length > 0) {
            for (const did of q.domainIds) {
                if (!known.includes(did)) {
                    errors.push({ code: 'INVALID_DOMAIN_ID', message: `Unknown domain ID "${did}" for cert "${certId}"` });
                }
            }
        }
    }

    // 9. Difficulty
    if (!q.difficulty) {
        errors.push({ code: 'MISSING_DIFFICULTY', message: 'difficulty is missing' });
    } else if (!['easy', 'medium', 'hard'].includes(q.difficulty)) {
        errors.push({ code: 'INVALID_DIFFICULTY', message: `Invalid difficulty "${q.difficulty}"` });
    }

    // 10. Tags
    if (!q.tags || q.tags.length === 0) {
        errors.push({ code: 'MISSING_TAGS', message: 'No tags provided' });
    }

    // 11. "All of the above" / "None of the above" as options (RED LINE)
    if (q.options) {
        for (const opt of q.options) {
            const lower = opt.text.toLowerCase().trim();
            if (lower.includes('all of the above')) {
                errors.push({ code: 'ALL_OF_ABOVE_IN_OPTIONS', message: `Option ${opt.label} contains "All of the above"` });
            }
            if (lower.includes('none of the above')) {
                errors.push({ code: 'NONE_OF_ABOVE_IN_OPTIONS', message: `Option ${opt.label} contains "None of the above"` });
            }
        }
    }

    // 12. Check for potentially fabricated NIST SP numbers
    const nistPattern = /SP\s+(\d{3}-\d+[A-Za-z]?)/g;
    const fullText = `${q.text} ${q.explanation?.short ?? ''} ${Object.values(q.explanation?.whyOthersWrong ?? {}).join(' ')}`;
    let nistMatch;
    while ((nistMatch = nistPattern.exec(fullText)) !== null) {
        const spNumber = nistMatch[1];
        if (!KNOWN_NIST_SP.includes(spNumber)) {
            errors.push({ code: 'FABRICATED_STANDARD', message: `Potentially fabricated NIST SP ${spNumber} — verify at nist.gov` });
        }
    }

    // ── WARNINGS (allow import but flag) ──

    // 1. Correct option is longest
    if (q.options && q.correctOptionIndex != null && q.correctOptionIndex < q.options.length) {
        const correctLen = q.options[q.correctOptionIndex].text.length;
        const maxOtherLen = Math.max(
            ...q.options
                .filter((_, i) => i !== q.correctOptionIndex)
                .map(o => o.text.length)
        );
        if (correctLen > maxOtherLen * 1.3) {
            warnings.push({ code: 'CORRECT_OPTION_LONGEST', message: 'Correct answer is >30% longer than longest distractor' });
        }
    }

    // 2. Unbalanced option lengths
    if (q.options && q.options.length >= 4) {
        const lengths = q.options.map(o => o.text.length);
        const maxLen = Math.max(...lengths);
        const minLen = Math.min(...lengths);
        if (maxLen > minLen * 3 && minLen > 0) {
            warnings.push({ code: 'UNBALANCED_OPTION_LENGTHS', message: `Option lengths vary from ${minLen} to ${maxLen} chars (${(maxLen / minLen).toFixed(1)}x ratio)` });
        }
    }

    // 3. No reference in explanation
    if (q.explanation?.short) {
        const hasReference = /(?:NIST|ISO|SP\s+\d|CBK|GDPR|HIPAA|SOX|PCI|CSA|OWASP|RFC|Domain\s+\d)/i.test(q.explanation.short);
        if (!hasReference) {
            warnings.push({ code: 'NO_REFERENCE_IN_EXPLANATION', message: 'explanation.short has no standard/framework reference' });
        }
    }

    // 4. Bias terms in stem (outside bold markers)
    for (const term of BIAS_TERMS) {
        const termLower = term.toLowerCase();
        const stemLower = q.text.toLowerCase();
        if (stemLower.includes(termLower)) {
            // Check if it's bolded (surrounded by **)
            const boldPattern = new RegExp(`\\*\\*[^*]*${termLower}[^*]*\\*\\*`, 'i');
            if (!boldPattern.test(q.text)) {
                warnings.push({ code: 'POTENTIAL_BIAS', message: `Stem contains unbolded bias term: "${term}"` });
                break; // one warning per question is enough
            }
        }
    }

    // 5. Negative in stem without bold
    const negativePatterns = ['NOT', 'EXCEPT', 'LEAST'];
    for (const neg of negativePatterns) {
        if (q.text.includes(` ${neg} `) || q.text.includes(` ${neg}?`) || q.text.endsWith(` ${neg}`)) {
            if (!q.text.includes(`**${neg}**`)) {
                warnings.push({ code: 'STEM_NEGATIVE_UNBOLD', message: `"${neg}" in stem is not bolded` });
            }
        }
    }

    // 6. Low tag count
    if (q.tags && q.tags.length > 0 && q.tags.length < 2) {
        warnings.push({ code: 'LOW_TAG_COUNT', message: `Only ${q.tags.length} tag(s), recommend 2+` });
    }

    // 7. Short distractor explanations
    if (q.explanation?.whyOthersWrong) {
        for (const [label, text] of Object.entries(q.explanation.whyOthersWrong)) {
            if (text && text.trim().length > 0 && text.trim().length < 30) {
                warnings.push({ code: 'SHORT_EXPLANATION_DISTRACTOR', message: `whyOthersWrong.${label} is very short (${text.trim().length} chars)` });
            }
        }
    }

    // 8. Stem answerable without options (very short, no scenario)
    if (q.text && q.text.length < 50 && q.difficulty !== 'easy') {
        warnings.push({ code: 'STEM_ANSWERABLE_WITHOUT_OPTIONS', message: 'Short stem for non-easy question — may be answerable without reading options' });
    }

    return {
        questionIndex: index,
        passed: errors.length === 0,
        errors,
        warnings,
        stem: q.text?.slice(0, 80) ?? '(empty)',
    };
}

// ── Difficulty Distribution Check ────────────────

interface DifficultyCheck {
    passed: boolean;
    actual: Record<string, number>;
    target: Record<string, number>;
    message: string;
}

function checkDifficultyDistribution(
    questions: BatchQuestion[],
    certId: string
): DifficultyCheck {
    const targets: Record<string, Record<string, number>> = {
        default: { easy: 0.20, medium: 0.50, hard: 0.30 },
        cc:      { easy: 0.30, medium: 0.50, hard: 0.20 },
        cissp:   { easy: 0.15, medium: 0.45, hard: 0.40 },
        'security-plus': { easy: 0.25, medium: 0.50, hard: 0.25 },
    };

    const target = targets[certId] || targets.default;
    const total = questions.length;
    const counts: Record<string, number> = { easy: 0, medium: 0, hard: 0 };

    for (const q of questions) {
        if (counts[q.difficulty] !== undefined) {
            counts[q.difficulty]++;
        }
    }

    const actual: Record<string, number> = {
        easy: total > 0 ? counts.easy / total : 0,
        medium: total > 0 ? counts.medium / total : 0,
        hard: total > 0 ? counts.hard / total : 0,
    };

    const TOLERANCE = 0.10; // 10% tolerance per difficulty level
    let passed = true;
    const issues: string[] = [];

    for (const diff of ['easy', 'medium', 'hard']) {
        const delta = Math.abs(actual[diff] - target[diff]);
        if (delta > TOLERANCE) {
            passed = false;
            issues.push(`${diff}: ${(actual[diff] * 100).toFixed(0)}% (target: ${(target[diff] * 100).toFixed(0)}%)`);
        }
    }

    return {
        passed,
        actual,
        target,
        message: passed
            ? 'Difficulty distribution within tolerance'
            : `Distribution out of range: ${issues.join(', ')}`,
    };
}

// ── Main ─────────────────────────────────────────

function main(): void {
    const args = process.argv.slice(2);
    const filePath = args.find(a => !a.startsWith('--'));
    const strict = args.includes('--strict');

    if (!filePath) {
        console.error('Usage: npx tsx scripts/validate-questions.ts <batch-file.json> [--strict]');
        console.error('');
        console.error('Options:');
        console.error('  --strict    Treat warnings as errors (block import)');
        process.exit(2);
    }

    const resolvedPath = resolve(filePath);
    let rawContent: string;
    try {
        rawContent = readFileSync(resolvedPath, 'utf-8');
    } catch {
        console.error(`Error: Cannot read file "${resolvedPath}"`);
        process.exit(2);
    }

    let batch: BatchFile;
    try {
        batch = JSON.parse(rawContent) as BatchFile;
    } catch (e) {
        console.error(`Error: Invalid JSON in "${resolvedPath}"`);
        console.error((e as Error).message);
        process.exit(2);
    }

    if (!batch.metadata || !batch.questions || !Array.isArray(batch.questions)) {
        console.error('Error: JSON must have "metadata" and "questions" array');
        process.exit(2);
    }

    const certId = batch.metadata.certId;
    console.log('');
    console.log(`╔══════════════════════════════════════════╗`);
    console.log(`║  ExamFlow Content Validator              ║`);
    console.log(`╚══════════════════════════════════════════╝`);
    console.log('');
    console.log(`  File:    ${resolvedPath}`);
    console.log(`  Cert:    ${certId}`);
    console.log(`  Domain:  ${batch.metadata.domainId}`);
    console.log(`  Batch:   #${batch.metadata.batchNumber}`);
    console.log(`  Count:   ${batch.questions.length} questions`);
    console.log(`  Strict:  ${strict ? 'YES' : 'no'}`);
    console.log('');

    // Run validation on each question
    const allStems = batch.questions.map(q => q.text);
    const results: ValidationResult[] = [];

    for (let i = 0; i < batch.questions.length; i++) {
        results.push(validateQuestion(batch.questions[i], i, certId, allStems));
    }

    // Difficulty distribution check
    const diffCheck = checkDifficultyDistribution(batch.questions, certId);

    // Report
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);

    // Print failed questions
    const failedResults = results.filter(r => !r.passed || r.warnings.length > 0);
    if (failedResults.length > 0) {
        console.log('─── Question Issues ───────────────────────');
        console.log('');

        for (const r of failedResults) {
            const status = r.passed ? '⚠️ ' : '❌';
            console.log(`${status} Q${r.questionIndex + 1}: "${r.stem}..."`);

            for (const err of r.errors) {
                console.log(`    ERROR   ${err.code}: ${err.message}`);
            }
            for (const warn of r.warnings) {
                console.log(`    WARN    ${warn.code}: ${warn.message}`);
            }
            console.log('');
        }
    }

    // Difficulty distribution
    console.log('─── Difficulty Distribution ────────────────');
    const counts = { easy: 0, medium: 0, hard: 0 };
    for (const q of batch.questions) {
        if (counts[q.difficulty as keyof typeof counts] !== undefined) {
            counts[q.difficulty as keyof typeof counts]++;
        }
    }
    const total = batch.questions.length;
    console.log(`  Easy:   ${counts.easy}/${total} (${total > 0 ? ((counts.easy / total) * 100).toFixed(0) : 0}%)`);
    console.log(`  Medium: ${counts.medium}/${total} (${total > 0 ? ((counts.medium / total) * 100).toFixed(0) : 0}%)`);
    console.log(`  Hard:   ${counts.hard}/${total} (${total > 0 ? ((counts.hard / total) * 100).toFixed(0) : 0}%)`);
    console.log(`  Status: ${diffCheck.passed ? '✅ Within tolerance' : '⚠️  ' + diffCheck.message}`);
    console.log('');

    // Summary
    console.log('─── Summary ───────────────────────────────');
    console.log(`  Total:    ${batch.questions.length}`);
    console.log(`  Passed:   ${passed}`);
    console.log(`  Failed:   ${failed}`);
    console.log(`  Errors:   ${totalErrors}`);
    console.log(`  Warnings: ${totalWarnings}`);
    console.log('');

    // Write summary JSON for CI/automation
    const summary: BatchValidationSummary = {
        batchFile: resolvedPath,
        totalQuestions: batch.questions.length,
        passed,
        failed,
        totalErrors,
        totalWarnings,
        difficultyDistribution: counts,
        results,
    };

    const reportPath = resolvedPath.replace(/\.json$/, '.validation-report.json');
    writeFileSync(reportPath, JSON.stringify(summary, null, 2));
    console.log(`  Report:   ${reportPath}`);
    console.log('');

    // Exit code
    const hasBlockingErrors = failed > 0;
    const warningsBlock = strict && totalWarnings > 0;

    if (hasBlockingErrors || warningsBlock) {
        console.log('❌ VALIDATION FAILED — Fix errors before import.');
        if (warningsBlock) {
            console.log('   (--strict mode: warnings treated as errors)');
        }
        process.exit(1);
    } else {
        console.log('✅ VALIDATION PASSED — Ready for import.');
        if (totalWarnings > 0) {
            console.log(`   (${totalWarnings} warning(s) — review recommended)`);
        }
        process.exit(0);
    }
}

main();

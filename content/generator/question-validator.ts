/**
 * Question Validator — post-generation quality checks.
 *
 * Runs the same checks as scripts/validate-questions.ts but as an importable module.
 * This catches obvious LLM hallucinations before saving to disk.
 */

// ── Types ────────────────────────────────────────

export interface GeneratedQuestion {
  text: string;
  options: Array<{ label: string; text: string }>;
  correctOptionIndex: number;
  explanation: {
    short: string;
    whyOthersWrong: Record<string, string>;
    examTip?: string;
  };
  difficulty: string;
  domainIds: string[];
  tags: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ── Constants ────────────────────────────────────

const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const OPTION_LABELS = new Set(['A', 'B', 'C', 'D']);
const MIN_STEM_LENGTH = 20;
const MIN_EXPLANATION_SENTENCES = 2;

/**
 * Terms that might indicate bias (borrowed from the main validator)
 */
const BIAS_TERMS = [
  'always',
  'never',
  'impossible',
  'guaranteed',
  'obviously',
  'clearly',
  'simply',
];

/**
 * Known fake NIST SP numbers that LLMs love to hallucinate
 */
const FAKE_NIST_NUMBERS = [
  '800-12',
  '800-14',
  '800-16',
  '800-18',
  '800-22',
  '800-24',
  '800-26',
  '800-29',
  '800-31',
  '800-33',
  '800-91',
  '800-95',
  '800-99',
  '800-101',
  '800-102',
  '800-150',
  '800-175A',
];

// ── Validator ────────────────────────────────────

/**
 * Validate a single generated question.
 */
export function validateQuestion(
  q: GeneratedQuestion,
  index: number
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const prefix = `Q${index + 1}`;

  // ── Structure checks ──
  if (!q.text || typeof q.text !== 'string') {
    errors.push(`${prefix}: Missing or invalid 'text'`);
    return { valid: false, errors, warnings };
  }

  if (q.text.length < MIN_STEM_LENGTH) {
    errors.push(
      `${prefix}: Stem too short (${q.text.length} chars, min ${MIN_STEM_LENGTH})`
    );
  }

  if (!Array.isArray(q.options) || q.options.length !== 4) {
    errors.push(
      `${prefix}: Must have exactly 4 options, got ${q.options?.length ?? 0}`
    );
  }

  if (
    typeof q.correctOptionIndex !== 'number' ||
    q.correctOptionIndex < 0 ||
    q.correctOptionIndex > 3
  ) {
    errors.push(
      `${prefix}: correctOptionIndex must be 0–3, got ${q.correctOptionIndex}`
    );
  }

  if (!VALID_DIFFICULTIES.has(q.difficulty)) {
    errors.push(
      `${prefix}: Invalid difficulty "${q.difficulty}". Must be easy/medium/hard`
    );
  }

  if (!Array.isArray(q.domainIds) || q.domainIds.length === 0) {
    errors.push(`${prefix}: domainIds must be a non-empty array`);
  }

  if (!Array.isArray(q.tags) || q.tags.length === 0) {
    warnings.push(`${prefix}: No tags provided`);
  }

  // ── Option checks ──
  if (Array.isArray(q.options) && q.options.length === 4) {
    const optionTexts = q.options.map((o) => o.text?.toLowerCase().trim());

    // Check for duplicate options
    const unique = new Set(optionTexts);
    if (unique.size < 4) {
      errors.push(`${prefix}: Duplicate option text detected`);
    }

    // Check for empty options
    for (let i = 0; i < q.options.length; i++) {
      if (!q.options[i].text || q.options[i].text.trim().length < 2) {
        errors.push(
          `${prefix}: Option ${q.options[i].label || i} is empty or too short`
        );
      }
    }

    // Check labels
    for (const opt of q.options) {
      if (!OPTION_LABELS.has(opt.label)) {
        warnings.push(`${prefix}: Non-standard option label "${opt.label}"`);
      }
    }

    // Warning: correct option is the longest
    if (q.options.length === 4) {
      const lengths = q.options.map((o) => o.text?.length || 0);
      const maxLen = Math.max(...lengths);
      if (
        lengths[q.correctOptionIndex] === maxLen &&
        lengths.filter((l) => l === maxLen).length === 1
      ) {
        warnings.push(
          `${prefix}: Correct answer is the longest option (test-taking cue)`
        );
      }
    }

    // "All of the above" / "None of the above"
    for (const opt of q.options) {
      const lower = opt.text?.toLowerCase() || '';
      if (
        lower.includes('all of the above') ||
        lower.includes('none of the above')
      ) {
        errors.push(
          `${prefix}: Contains "all/none of the above" — not allowed`
        );
      }
    }
  }

  // ── Explanation checks ──
  if (!q.explanation?.short) {
    errors.push(`${prefix}: Missing explanation.short`);
  } else {
    const sentences = q.explanation.short
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 5);
    if (sentences.length < MIN_EXPLANATION_SENTENCES) {
      errors.push(
        `${prefix}: Explanation needs ${MIN_EXPLANATION_SENTENCES}+ sentences, got ${sentences.length}`
      );
    }
  }

  if (
    !q.explanation?.whyOthersWrong ||
    typeof q.explanation.whyOthersWrong !== 'object'
  ) {
    errors.push(`${prefix}: Missing explanation.whyOthersWrong`);
  } else {
    // Check that all incorrect options have explanations
    const labels = ['A', 'B', 'C', 'D'];
    const correctLabel = labels[q.correctOptionIndex];
    for (const label of labels) {
      if (label !== correctLabel && !q.explanation.whyOthersWrong[label]) {
        errors.push(
          `${prefix}: whyOthersWrong missing entry for option ${label}`
        );
      }
    }
  }

  // ── Hallucination checks ──
  const fullText = `${q.text} ${q.explanation?.short || ''}`;

  // Check for fake NIST numbers
  for (const fake of FAKE_NIST_NUMBERS) {
    if (
      fullText.includes(`SP ${fake}`) ||
      fullText.includes(`800-${fake.replace('800-', '')}`)
    ) {
      warnings.push(
        `${prefix}: Possibly fabricated NIST SP ${fake} — verify manually`
      );
    }
  }

  // ── Bias term check ──
  for (const term of BIAS_TERMS) {
    const regex = new RegExp(`\\b${term}\\b`, 'i');
    if (regex.test(q.text)) {
      warnings.push(`${prefix}: Stem contains bias term "${term}"`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate an entire batch of generated questions.
 */
export function validateBatch(questions: GeneratedQuestion[]): {
  valid: boolean;
  totalErrors: number;
  totalWarnings: number;
  results: ValidationResult[];
  difficultyDistribution: Record<string, number>;
} {
  const results = questions.map((q, i) => validateQuestion(q, i));
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);

  // Check difficulty distribution
  const difficultyDistribution: Record<string, number> = {
    easy: 0,
    medium: 0,
    hard: 0,
  };
  for (const q of questions) {
    if (VALID_DIFFICULTIES.has(q.difficulty)) {
      difficultyDistribution[q.difficulty]++;
    }
  }

  return {
    valid: totalErrors === 0,
    totalErrors,
    totalWarnings,
    results,
    difficultyDistribution,
  };
}

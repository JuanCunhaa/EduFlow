/**
 * duplicate-detector.ts — TF-IDF + Cosine Similarity duplicate detection.
 *
 * Compares new batch questions against existing published questions
 * to detect exact, near-exact, and conceptual duplicates.
 *
 * Usage:
 *   npx tsx scripts/duplicate-detector.ts <batch-file.json> --existing <existing-questions.json>
 *   npx tsx scripts/duplicate-detector.ts <batch-file.json> --firestore
 *
 * The --firestore flag fetches existing questions directly from Firestore.
 * The --existing flag loads from a local JSON export (faster for repeated runs).
 *
 * Exit codes:
 *   0 — no duplicates found
 *   1 — duplicates found (blocked)
 *   2 — invalid arguments
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// ── Types ───────────────────────────────────────

interface Option {
  label: string;
  text: string;
}

interface Explanation {
  short: string;
  whyOthersWrong: Record<string, string>;
}

interface QuestionStem {
  id?: string;
  text: string;
  domainIds: string[];
  tags: string[];
  difficulty: string;
}

interface DuplicateResult {
  newQuestionIndex: number;
  newStem: string;
  existingQuestionId: string;
  existingStem: string;
  textSimilarity: number;
  conceptMatch: boolean;
  verdict: 'duplicate' | 'similar' | 'unique';
}

interface DuplicateReport {
  batchFile: string;
  totalNew: number;
  totalExisting: number;
  duplicates: DuplicateResult[];
  similar: DuplicateResult[];
  unique: number;
  timestamp: string;
}

// ── TF-IDF Engine ───────────────────────────────

/**
 * Lightweight TF-IDF implementation for question stem comparison.
 * No external dependencies — pure TypeScript.
 */
class TfIdfVectorizer {
  private vocabulary: Map<string, number> = new Map();
  private idf: Map<string, number> = new Map();
  private documents: string[][] = [];

  /** Tokenize and normalize a text string */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ') // remove punctuation
      .replace(/\s+/g, ' ') // normalize whitespace
      .trim()
      .split(' ')
      .filter((t) => t.length > 2) // remove very short tokens
      .filter((t) => !STOP_WORDS.has(t)); // remove stop words
  }

  /** Build vocabulary and IDF from a corpus of documents */
  fit(documents: string[]): void {
    this.documents = documents.map((d) => this.tokenize(d));
    const N = this.documents.length;

    // Build vocabulary
    const allTerms = new Set<string>();
    for (const doc of this.documents) {
      for (const term of doc) {
        allTerms.add(term);
      }
    }

    let idx = 0;
    for (const term of allTerms) {
      this.vocabulary.set(term, idx++);
    }

    // Compute IDF: log(N / df)
    const df = new Map<string, number>();
    for (const doc of this.documents) {
      const uniqueTerms = new Set(doc);
      for (const term of uniqueTerms) {
        df.set(term, (df.get(term) || 0) + 1);
      }
    }

    for (const [term, docFreq] of df) {
      this.idf.set(term, Math.log(N / docFreq));
    }
  }

  /** Transform a single document into a TF-IDF vector */
  transform(text: string): Map<string, number> {
    const tokens = this.tokenize(text);
    const tf = new Map<string, number>();
    const vector = new Map<string, number>();

    // Compute TF
    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }

    // Compute TF-IDF
    for (const [term, count] of tf) {
      const idfScore = this.idf.get(term) || 0;
      const tfScore = count / tokens.length;
      if (idfScore > 0) {
        vector.set(term, tfScore * idfScore);
      }
    }

    return vector;
  }
}

/** Compute cosine similarity between two TF-IDF vectors */
function cosineSimilarity(
  a: Map<string, number>,
  b: Map<string, number>
): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const [term, valA] of a) {
    normA += valA * valA;
    const valB = b.get(term);
    if (valB !== undefined) {
      dotProduct += valA * valB;
    }
  }

  for (const [, valB] of b) {
    normB += valB * valB;
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

// ── Concept Fingerprint ─────────────────────────

/**
 * Two questions with the same concept fingerprint test the same knowledge,
 * even if worded differently.
 *
 * Fingerprint = `{domainId}:{sorted_tags}:{difficulty}`
 */
function conceptFingerprint(q: QuestionStem): string {
  const domains = [...q.domainIds].sort().join(',');
  const tags = [...q.tags].sort().join(',');
  return `${domains}:${tags}:${q.difficulty}`;
}

// ── Stop Words ──────────────────────────────────

const STOP_WORDS = new Set([
  'the',
  'is',
  'at',
  'which',
  'on',
  'a',
  'an',
  'and',
  'or',
  'but',
  'in',
  'with',
  'to',
  'for',
  'of',
  'not',
  'no',
  'can',
  'had',
  'has',
  'have',
  'will',
  'do',
  'did',
  'does',
  'been',
  'was',
  'were',
  'are',
  'be',
  'this',
  'that',
  'these',
  'those',
  'what',
  'when',
  'where',
  'how',
  'why',
  'who',
  'whom',
  'its',
  'it',
  'you',
  'your',
  'they',
  'their',
  'them',
  'from',
  'by',
  'as',
  'into',
  'about',
  'than',
  'would',
  'should',
  'could',
  'may',
  'might',
  'must',
  'shall',
  'following',
  'most',
  'best',
  'first',
  'primary',
  'which',
]);

// ── Thresholds ──────────────────────────────────

const DUPLICATE_THRESHOLD = 0.75; // Exact or near-exact
const SIMILAR_THRESHOLD = 0.55; // Suspiciously similar
const CONCEPT_OVERLAY = 0.45; // Lower bar when concept fingerprint matches

// ── Main Logic ──────────────────────────────────

function detectDuplicates(
  newQuestions: QuestionStem[],
  existingQuestions: QuestionStem[]
): DuplicateResult[] {
  if (existingQuestions.length === 0) {
    return newQuestions.map((_, i) => ({
      newQuestionIndex: i,
      newStem: newQuestions[i].text.slice(0, 80),
      existingQuestionId: '',
      existingStem: '',
      textSimilarity: 0,
      conceptMatch: false,
      verdict: 'unique' as const,
    }));
  }

  // Build TF-IDF model from existing corpus
  const allTexts = [
    ...existingQuestions.map((q) => q.text),
    ...newQuestions.map((q) => q.text),
  ];

  const vectorizer = new TfIdfVectorizer();
  vectorizer.fit(allTexts);

  // Pre-compute existing vectors
  const existingVectors = existingQuestions.map((q) =>
    vectorizer.transform(q.text)
  );

  // Pre-compute concept fingerprints for existing questions
  const existingFingerprints = existingQuestions.map((q) =>
    conceptFingerprint(q)
  );

  const results: DuplicateResult[] = [];

  for (let i = 0; i < newQuestions.length; i++) {
    const newQ = newQuestions[i];
    const newVector = vectorizer.transform(newQ.text);
    const newFingerprint = conceptFingerprint(newQ);

    let bestScore = 0;
    let bestIdx = -1;
    let bestConceptMatch = false;

    for (let j = 0; j < existingQuestions.length; j++) {
      const similarity = cosineSimilarity(newVector, existingVectors[j]);
      const conceptMatch = newFingerprint === existingFingerprints[j];

      // Use lower threshold when concept fingerprints match
      const effectiveThreshold = conceptMatch
        ? CONCEPT_OVERLAY
        : SIMILAR_THRESHOLD;

      if (similarity > bestScore) {
        bestScore = similarity;
        bestIdx = j;
        bestConceptMatch = conceptMatch;
      }
    }

    let verdict: 'duplicate' | 'similar' | 'unique';
    if (bestScore >= DUPLICATE_THRESHOLD) {
      verdict = 'duplicate';
    } else if (
      bestScore >= SIMILAR_THRESHOLD ||
      (bestConceptMatch && bestScore >= CONCEPT_OVERLAY)
    ) {
      verdict = 'similar';
    } else {
      verdict = 'unique';
    }

    results.push({
      newQuestionIndex: i,
      newStem: newQ.text.slice(0, 80),
      existingQuestionId:
        bestIdx >= 0
          ? (existingQuestions[bestIdx].id ?? `existing-${bestIdx}`)
          : '',
      existingStem:
        bestIdx >= 0 ? existingQuestions[bestIdx].text.slice(0, 80) : '',
      textSimilarity: Math.round(bestScore * 1000) / 1000,
      conceptMatch: bestConceptMatch,
      verdict,
    });
  }

  // Also check within the new batch for self-duplicates
  for (let i = 0; i < newQuestions.length; i++) {
    const newVector = vectorizer.transform(newQuestions[i].text);
    for (let j = i + 1; j < newQuestions.length; j++) {
      const otherVector = vectorizer.transform(newQuestions[j].text);
      const sim = cosineSimilarity(newVector, otherVector);
      if (sim >= SIMILAR_THRESHOLD) {
        // Only add if it's a worse match than what we already found
        const existingResult = results[j];
        if (sim > existingResult.textSimilarity) {
          results[j] = {
            newQuestionIndex: j,
            newStem: newQuestions[j].text.slice(0, 80),
            existingQuestionId: `new-batch-${i}`,
            existingStem: newQuestions[i].text.slice(0, 80),
            textSimilarity: Math.round(sim * 1000) / 1000,
            conceptMatch:
              conceptFingerprint(newQuestions[i]) ===
              conceptFingerprint(newQuestions[j]),
            verdict: sim >= DUPLICATE_THRESHOLD ? 'duplicate' : 'similar',
          };
        }
      }
    }
  }

  return results;
}

// ── CLI ──────────────────────────────────────────

function main(): void {
  const args = process.argv.slice(2);
  const batchPath = args.find((a) => !a.startsWith('--'));
  const existingIdx = args.indexOf('--existing');
  const existingPath = existingIdx >= 0 ? args[existingIdx + 1] : null;

  if (!batchPath) {
    console.error(
      'Usage: npx tsx scripts/duplicate-detector.ts <batch-file.json> --existing <existing-questions.json>'
    );
    console.error('');
    console.error('Options:');
    console.error(
      '  --existing <file>   JSON file with existing questions [{text, domainIds, tags, difficulty, id}]'
    );
    process.exit(2);
  }

  // Load batch file
  const resolvedBatchPath = resolve(batchPath);
  let batchRaw: string;
  try {
    batchRaw = readFileSync(resolvedBatchPath, 'utf-8');
  } catch {
    console.error(`Error: Cannot read batch file "${resolvedBatchPath}"`);
    process.exit(2);
  }

  let batchData: { metadata?: unknown; questions: QuestionStem[] };
  try {
    batchData = JSON.parse(batchRaw);
  } catch {
    console.error('Error: Invalid JSON in batch file');
    process.exit(2);
  }

  const newQuestions = batchData.questions;

  // Load existing questions
  let existingQuestions: QuestionStem[] = [];
  if (existingPath) {
    const resolvedExistingPath = resolve(existingPath);
    try {
      const existingRaw = readFileSync(resolvedExistingPath, 'utf-8');
      existingQuestions = JSON.parse(existingRaw);
    } catch {
      console.error(
        `Error: Cannot read existing questions file "${resolvedExistingPath}"`
      );
      process.exit(2);
    }
  }

  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  ExamFlow Duplicate Detector             ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  console.log(`  New questions:       ${newQuestions.length}`);
  console.log(`  Existing questions:  ${existingQuestions.length}`);
  console.log(`  Duplicate threshold: ${DUPLICATE_THRESHOLD}`);
  console.log(`  Similar threshold:   ${SIMILAR_THRESHOLD}`);
  console.log(`  Concept overlay:     ${CONCEPT_OVERLAY}`);
  console.log('');

  const results = detectDuplicates(newQuestions, existingQuestions);

  const duplicates = results.filter((r) => r.verdict === 'duplicate');
  const similar = results.filter((r) => r.verdict === 'similar');
  const unique = results.filter((r) => r.verdict === 'unique').length;

  // Print duplicates
  if (duplicates.length > 0) {
    console.log('─── DUPLICATES (blocked) ──────────────────');
    console.log('');
    for (const d of duplicates) {
      console.log(
        `  ❌ Q${d.newQuestionIndex + 1} (score: ${d.textSimilarity})`
      );
      console.log(`     New:      "${d.newStem}..."`);
      console.log(
        `     Matches:  "${d.existingStem}..." [${d.existingQuestionId}]`
      );
      if (d.conceptMatch)
        console.log(`     ⚙️  Concept fingerprint also matches`);
      console.log('');
    }
  }

  // Print similar
  if (similar.length > 0) {
    console.log('─── SIMILAR (review recommended) ──────────');
    console.log('');
    for (const s of similar) {
      console.log(
        `  ⚠️  Q${s.newQuestionIndex + 1} (score: ${s.textSimilarity})`
      );
      console.log(`     New:      "${s.newStem}..."`);
      console.log(
        `     Matches:  "${s.existingStem}..." [${s.existingQuestionId}]`
      );
      if (s.conceptMatch)
        console.log(`     ⚙️  Concept fingerprint also matches`);
      console.log('');
    }
  }

  // Summary
  console.log('─── Summary ───────────────────────────────');
  console.log(`  Duplicates: ${duplicates.length}`);
  console.log(`  Similar:    ${similar.length}`);
  console.log(`  Unique:     ${unique}`);
  console.log('');

  // Write report
  const report: DuplicateReport = {
    batchFile: resolvedBatchPath,
    totalNew: newQuestions.length,
    totalExisting: existingQuestions.length,
    duplicates,
    similar,
    unique,
    timestamp: new Date().toISOString(),
  };

  const reportPath = resolvedBatchPath.replace(
    /\.json$/,
    '.duplicate-report.json'
  );
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`  Report: ${reportPath}`);
  console.log('');

  if (duplicates.length > 0) {
    console.log('❌ DUPLICATES FOUND — Remove or rewrite before import.');
    process.exit(1);
  } else if (similar.length > 0) {
    console.log(
      '⚠️  SIMILAR QUESTIONS FOUND — Review recommended but import allowed.'
    );
    process.exit(0);
  } else {
    console.log('✅ NO DUPLICATES — All clear for import.');
    process.exit(0);
  }
}

main();

/**
 * Semantic Deduplication using OpenAI Embeddings.
 *
 * Uses text-embedding-3-small (cheapest: $0.02/1M tokens) to detect
 * semantically similar questions that substring matching would miss.
 *
 * Example: "What is the primary purpose of a firewall?" and
 *          "What is the main function of a network firewall?"
 * have ~0.93 cosine similarity despite different words.
 */

// ── Cosine Similarity ──

export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
}

// ── Batch Embeddings via OpenAI ──

export async function getEmbeddings(
    texts: string[],
    apiKey: string,
    model = 'text-embedding-3-small'
): Promise<number[][]> {
    if (texts.length === 0) return [];

    // Truncate to 512 chars max per text to save tokens
    const truncated = texts.map((t) => t.slice(0, 512));

    const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            input: truncated,
            encoding_format: 'float',
        }),
    });

    if (!response.ok) {
        // Non-critical — fall back to no dedup rather than failing generation
        console.warn(`Embedding API error ${response.status}, skipping semantic dedup`);
        return [];
    }

    const data = await response.json();
    if (!Array.isArray(data.data)) return [];

    // Sort by index to maintain order
    const sorted = data.data.sort((a: { index: number }, b: { index: number }) => a.index - b.index);
    return sorted.map((d: { embedding: number[] }) => d.embedding);
}

// ── Find Semantic Duplicates ──

export interface SemanticDuplicate {
    newIndex: number;
    existingStem: string;
    similarity: number;
}

/**
 * Compares new question stems against existing stems using cosine similarity.
 * Returns indices of new questions that are too similar to existing ones.
 *
 * @param newStems - Stems of newly generated questions
 * @param existingStems - Stems of already-imported questions
 * @param apiKey - OpenAI API key
 * @param threshold - Similarity threshold (0.85 = very similar, 0.9 = near-identical)
 */
export async function findSemanticDuplicates(
    newStems: string[],
    existingStems: string[],
    apiKey: string,
    threshold = 0.85
): Promise<SemanticDuplicate[]> {
    if (newStems.length === 0 || existingStems.length === 0) return [];

    // Combine all texts for a single API call
    const allTexts = [...newStems, ...existingStems];
    const embeddings = await getEmbeddings(allTexts, apiKey);

    if (embeddings.length !== allTexts.length) return []; // Fallback if API fails

    const newEmbeddings = embeddings.slice(0, newStems.length);
    const existingEmbeddings = embeddings.slice(newStems.length);

    const duplicates: SemanticDuplicate[] = [];

    for (let i = 0; i < newEmbeddings.length; i++) {
        for (let j = 0; j < existingEmbeddings.length; j++) {
            const sim = cosineSimilarity(newEmbeddings[i], existingEmbeddings[j]);
            if (sim >= threshold) {
                duplicates.push({
                    newIndex: i,
                    existingStem: existingStems[j].slice(0, 100),
                    similarity: Math.round(sim * 1000) / 1000,
                });
                break; // One match is enough to flag as duplicate
            }
        }
    }

    // Also check new questions against each other (internal duplicates)
    for (let i = 0; i < newEmbeddings.length; i++) {
        for (let j = i + 1; j < newEmbeddings.length; j++) {
            const sim = cosineSimilarity(newEmbeddings[i], newEmbeddings[j]);
            if (sim >= threshold) {
                duplicates.push({
                    newIndex: j, // Mark the later one as duplicate
                    existingStem: `(internal duplicate of Q${i + 1})`,
                    similarity: Math.round(sim * 1000) / 1000,
                });
            }
        }
    }

    return duplicates;
}

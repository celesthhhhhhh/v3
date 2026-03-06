/**
 * Anti-Slop — Stage 3: Embedding Engine
 *
 * Lightweight semantic similarity using character n-gram bag-of-words
 * cosine similarity. No external ML dependencies required.
 *
 * Architecture is designed so a real embedding model (e.g. @xenova/transformers)
 * can be swapped in by replacing `computeEmbedding()`.
 *
 * Similarity is intentionally conservative: we prefer false-negatives
 * (missing a cliché) over false-positives (mangling normal prose).
 */

// ── CONFIG ───────────────────────────────────────────────────────────────────

/** Character n-gram size */
const NGRAM_SIZE = 3;

/** Cache computed embeddings so phrases are only processed once */
const embeddingCache = new Map();

// ── CORE VECTOR MATH ─────────────────────────────────────────────────────────

/**
 * Compute a character n-gram frequency vector for a string.
 * Returns a plain object { ngram: count }.
 *
 * @param {string} text
 * @returns {Record<string, number>}
 */
function computeNgramVector(text) {
    const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    /** @type {Record<string, number>} */
    const vec = {};
    for (let i = 0; i <= normalized.length - NGRAM_SIZE; i++) {
        const gram = normalized.slice(i, i + NGRAM_SIZE);
        vec[gram] = (vec[gram] || 0) + 1;
    }
    return vec;
}

/**
 * Compute the L2 norm of a sparse vector.
 * @param {Record<string, number>} vec
 * @returns {number}
 */
function norm(vec) {
    let sum = 0;
    for (const v of Object.values(vec)) sum += v * v;
    return Math.sqrt(sum);
}

/**
 * Cosine similarity between two sparse vectors.
 * @param {Record<string, number>} a
 * @param {Record<string, number>} b
 * @returns {number}  0..1
 */
function cosineSimilarity(a, b) {
    let dot = 0;
    for (const [k, v] of Object.entries(a)) {
        if (b[k]) dot += v * b[k];
    }
    const denom = norm(a) * norm(b);
    return denom === 0 ? 0 : dot / denom;
}

// ── PUBLIC API ────────────────────────────────────────────────────────────────

/**
 * Compute (and cache) an embedding for a given phrase.
 * @param {string} text
 * @returns {Record<string, number>}
 */
export function computeEmbedding(text) {
    if (embeddingCache.has(text)) return embeddingCache.get(text);
    const vec = computeNgramVector(text);
    embeddingCache.set(text, vec);
    return vec;
}

/**
 * Compare a sentence against a list of slop phrase embeddings.
 * Returns the best matching phrase and its similarity score.
 *
 * @param {string} sentence                      - The sentence to test
 * @param {Array<{text: string, type: string, weight: number}>} slopPhrases
 * @param {number} threshold                     - Similarity threshold (0–1)
 * @returns {{ matched: boolean, phrase: string | null, type: string | null, score: number }}
 */
export function findSlopSimilarity(sentence, slopPhrases, threshold = 0.82) {
    const sentenceVec = computeEmbedding(sentence);
    let bestScore = 0;
    let bestPhrase = null;
    let bestType = null;

    for (const { text, type, weight } of slopPhrases) {
        const phraseVec = computeEmbedding(text);
        const raw = cosineSimilarity(sentenceVec, phraseVec);
        // Apply the phrase's own weight so high-confidence slop triggers more easily
        const weighted = raw * (weight || 1.0);
        if (weighted > bestScore) {
            bestScore = weighted;
            bestPhrase = text;
            bestType = type;
        }
    }

    return {
        matched: bestScore >= threshold,
        phrase: bestPhrase,
        type: bestType,
        score: bestScore,
    };
}

/**
 * Pre-warm the cache for a list of known phrases.
 * Call once at extension start to avoid first-pass latency.
 * @param {Array<{text: string}>} phrases
 */
export function prewarmCache(phrases) {
    for (const { text } of phrases) {
        computeEmbedding(text);
    }
}

/**
 * Clear the embedding cache (useful if phrases are updated at runtime).
 */
export function clearCache() {
    embeddingCache.clear();
}

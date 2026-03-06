/**
 * Anti-Slop — Stage 3b: Vector Search
 *
 * Cluster-aware search: computes a centroid embedding for each semantic
 * cluster and checks sentences against centroids first, then against
 * individual phrase members.
 *
 * This lets us catch paraphrased variants of known slop that aren't in
 * the phrase database verbatim.
 */

import { computeEmbedding, findSlopSimilarity } from './embeddingEngine.js';

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   type: string,
 *   phrases: string[],
 *   action: string
 * }} Cluster
 */

/**
 * Build a centroid vector (mean of member embeddings) for each cluster.
 * @param {Cluster[]} clusters
 * @returns {Map<string, Record<string, number>>}
 */
export function buildClusterCentroids(clusters) {
    const centroids = new Map();
    for (const cluster of clusters) {
        const centroid = {};
        for (const phrase of cluster.phrases) {
            const vec = computeEmbedding(phrase);
            for (const [k, v] of Object.entries(vec)) {
                centroid[k] = (centroid[k] || 0) + v;
            }
        }
        // Average
        const n = cluster.phrases.length;
        for (const k in centroid) centroid[k] /= n;
        centroids.set(cluster.id, centroid);
    }
    return centroids;
}

/**
 * Compute cosine similarity between two sparse vectors.
 * (Local copy to avoid circular imports)
 * @param {Record<string, number>} a
 * @param {Record<string, number>} b
 * @returns {number}
 */
function cosineSim(a, b) {
    let dot = 0, na = 0, nb = 0;
    for (const [k, v] of Object.entries(a)) {
        if (b[k]) dot += v * b[k];
        na += v * v;
    }
    for (const v of Object.values(b)) nb += v * v;
    const denom = Math.sqrt(na) * Math.sqrt(nb);
    return denom === 0 ? 0 : dot / denom;
}

/**
 * Find the best-matching cluster for a sentence.
 *
 * @param {string} sentence
 * @param {Cluster[]} clusters
 * @param {Map<string, Record<string, number>>} centroids
 * @param {number} clusterThreshold   - Similarity to centroid to enter fine search
 * @param {number} memberThreshold    - Similarity to individual member to confirm
 * @returns {{ matched: boolean, cluster: Cluster | null, score: number, matchedPhrase: string | null }}
 */
export function searchClusters(sentence, clusters, centroids, clusterThreshold = 0.70, memberThreshold = 0.78) {
    const sentVec = computeEmbedding(sentence);

    let bestCluster = null;
    let bestCentroidScore = 0;

    for (const cluster of clusters) {
        const centroid = centroids.get(cluster.id);
        if (!centroid) continue;
        const score = cosineSim(sentVec, centroid);
        if (score > bestCentroidScore) {
            bestCentroidScore = score;
            bestCluster = cluster;
        }
    }

    // Not close enough to any cluster
    if (bestCentroidScore < clusterThreshold || !bestCluster) {
        return { matched: false, cluster: null, score: bestCentroidScore, matchedPhrase: null };
    }

    // Fine-grained search within the best cluster
    const phrasesAsObjects = bestCluster.phrases.map(text => ({ text, type: bestCluster.type, weight: 1.0 }));
    const fine = findSlopSimilarity(sentence, phrasesAsObjects, memberThreshold);

    return {
        matched: fine.matched,
        cluster: bestCluster,
        score: fine.score,
        matchedPhrase: fine.phrase,
    };
}

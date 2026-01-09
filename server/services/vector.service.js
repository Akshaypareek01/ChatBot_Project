const mongoose = require('mongoose');
const Vector = require('../models/Vector');

/**
 * Calculate Cosine Similarity between two vectors
 * @param {number[]} vecA 
 * @param {number[]} vecB 
 * @returns {number}
 */
const cosineSimilarity = (vecA, vecB) => {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    if (vecA.length !== vecB.length) return 0;
    for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Store embeddings in the database
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.sourceId
 * @param {string} params.sourceType
 * @param {string} params.r2TextKey
 * @param {string[]} params.chunks - Array of text chunks
 * @param {number[][]} params.embeddings - Array of embedding vectors
 */
const storeVectors = async ({ userId, sourceId, sourceType, r2TextKey, chunks, embeddings }) => {
    if (chunks.length !== embeddings.length) {
        throw new Error("Chunks and embeddings count mismatch");
    }

    const vectorDocs = chunks.map((chunk, index) => ({
        userId,
        sourceId,
        sourceType,
        r2TextKey,
        chunkContent: chunk,
        embedding: embeddings[index],
        metadata: { index: String(index) }
    }));

    await Vector.insertMany(vectorDocs);
    console.log(`Stored ${vectorDocs.length} vectors for source ${sourceId}`);
};

/**
 * Search for similar vectors
 * @param {string} userId 
 * @param {number[]} queryEmbedding 
 * @param {number} limit 
 * @returns {Promise<Object[]>}
 */
const searchVectors = async (userId, queryEmbedding, limit = 5) => {
    let results = [];

    // Option 1: MongoDB Atlas Vector Search
    try {
        const atlasResults = await Vector.aggregate([
            {
                $vectorSearch: {
                    index: "vector_index",
                    path: "embedding",
                    queryVector: queryEmbedding,
                    numCandidates: 100,
                    limit: limit,
                    filter: { userId: { $eq: new mongoose.Types.ObjectId(userId) } }
                }
            },
            {
                $project: {
                    chunkContent: 1,
                    sourceId: 1,
                    sourceType: 1,
                    score: { $meta: "vectorSearchScore" }
                }
            }
        ]);

        if (atlasResults && atlasResults.length > 0) {
            results = atlasResults.map(r => ({
                content: r.chunkContent,
                sourceId: r.sourceId,
                sourceType: r.sourceType,
                score: r.score
            }));
            console.log(`Atlas Vector Search found ${results.length} results.`);
            return results;
        }
    } catch (error) {
        console.warn("Atlas Vector Search failed or not configured, falling back to in-memory search.", error.message);
    }

    // Option 2: Naive In-Memory Cosine Similarity (Fallback)
    console.log("Using In-Memory Vector Search Fallback...");
    try {
        // Fetch ALL vectors for this user
        // Note: For production with millions of vectors, this is bad. 
        // For MVP with <1000 chunks, this is perfectly fine and fast.
        const userVectors = await Vector.find({ userId }).select('embedding chunkContent sourceId sourceType');

        if (!userVectors || userVectors.length === 0) {
            console.log("No vectors found for user.");
            return [];
        }

        const scoredVectors = userVectors.map(vec => ({
            content: vec.chunkContent,
            sourceId: vec.sourceId,
            sourceType: vec.sourceType,
            score: cosineSimilarity(queryEmbedding, vec.embedding)
        }));

        // Sort by score descending
        scoredVectors.sort((a, b) => b.score - a.score);

        // Take top K
        results = scoredVectors.slice(0, limit);

        console.log(`In-Memory Search found ${results.length} results. Top score: ${results[0]?.score}`);
        return results;

    } catch (error) {
        console.error("In-Memory Search Error:", error);
        return [];
    }
};

module.exports = {
    storeVectors,
    searchVectors
};

const mongoose = require('mongoose');
const Vector = require('../models/Vector');

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
    // Option 1: MongoDB Atlas Vector Search (Best for Production)
    // Now active since Index is created.

    try {
        const results = await Vector.aggregate([
            {
                $vectorSearch: {
                    index: "vector_index",
                    path: "embedding",
                    queryVector: queryEmbedding,
                    numCandidates: 100,
                    limit: limit,
                    // Filter syntax for vectorSearch can depend on version, 
                    // but generally supports specific filter structure.
                    // Note: Atlas Vector Search filter requires the field to be indexed as 'filter' type 
                    // in addition to vector if we want efficient filtering.
                    // Since specific filter index wasn't asked, we might do post-filter or assumes standard pre-filter works if configured.
                    // Ideally: "filter": { "userId": { "$eq": new mongoose.Types.ObjectId(userId) } }
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

        return results.map(r => ({
            content: r.chunkContent,
            sourceId: r.sourceId,
            sourceType: r.sourceType,
            score: r.score
        }));

    } catch (error) {
        console.error("Vector Search Error:", error);
        // Fallback to empty if index issues
        return [];
    }

    // Option 2: Naive JS implementation (REMOVED for Production)
};

// ... unused helper
const cosineSimilarity = (vecA, vecB) => {
    // ... kept for reference if needed, but unused
    return 0;
};

module.exports = {
    storeVectors,
    searchVectors
};

module.exports = {
    storeVectors,
    searchVectors
};

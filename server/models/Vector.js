const mongoose = require('mongoose');

// We are using MongoDB as the Vector DB.
// We will store embeddings here.
// Note: For production, you must create a Vector Search Index in MongoDB Atlas on the 'embedding' field.

const VectorSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    sourceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Source',
        required: true
    },
    sourceType: {
        type: String,
        required: true
    },
    r2TextKey: {
        type: String,
        required: true
    },
    // The actual vector embedding
    embedding: {
        type: [Number],
        required: true,
        index: false // Special vector index needed, standard index not useful mainly
    },
    // Actual text content chunk (optional, user said "Chunks" in flow but "Vector DB stores: Embeddings + Minimal metadata only".
    // User said "Cleaned Text -> Cloudflare R2". "Vector DB: Embeddings only. No large text blobs."
    // So we will NOT store the text chunk here. We might store a character range or just rely on retrieving the text from R2 if needed?
    // "Use retrieved chunks (text already in memory)" -> In the chat flow: "Vector search ... Use retrieved chunks".
    // If the vector DB doesn't have the text, we have to fetch it from R2 using the Key + Offset/Length?
    // Or maybe we store *small* chunks?
    // "Vector DB: Embeddings only. No large text blobs".
    // If I don't store the chunk text here, I need a way to get it back during retrieval.
    // Fetching from R2 for every chunk during a chat query is slow (multiple HTTP requests).
    // Usually, "Minimal metadata" includes the text chunk itself if it's reasonably small (e.g. 1000 chars).
    // "No *large* text blobs" implies small ones are okay.
    // I will add `chunkContent` but keep it strict. 
    chunkContent: {
        type: String,
        required: true
    },
    metadata: {
        type: Map,
        of: String
    }
});

module.exports = mongoose.model('Vector', VectorSchema);

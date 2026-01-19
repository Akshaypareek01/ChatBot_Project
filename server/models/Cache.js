const mongoose = require('mongoose');

const cacheSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    queryHash: {
        type: String,
        required: true,
        index: true
    },
    knowledgeVersion: {
        type: Number,
        required: true
    },
    answer: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 60 * 60 * 24 * 7 // Default 7 days expiry
    }
});

// Compound index for fast lookup
cacheSchema.index({ userId: 1, queryHash: 1, knowledgeVersion: 1 });

module.exports = mongoose.model('Cache', cacheSchema);

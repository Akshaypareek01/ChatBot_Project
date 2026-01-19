const mongoose = require('mongoose');

const usageSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['chat', 'upload', 'scrape'],
        required: true
    },
    description: {
        type: String,
        required: true
    },
    tokensUsed: {
        type: Number,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
});

module.exports = mongoose.model('Usage', usageSchema);

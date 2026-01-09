const mongoose = require('mongoose');

const SourceSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['website', 'file'],
        required: true
    },
    // Common fields
    status: {
        type: String,
        enum: ['pending', 'processing', 'indexed', 'failed', 'processed_and_deleted'],
        default: 'pending'
    },
    error: String,

    // File specific
    fileName: String,
    fileSize: Number,
    r2FileKey: String, // Path to raw file in R2

    // Website specific
    url: String,
    pageCount: Number,

    // Both
    r2TextKey: String, // Path to cleaned text in R2

    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index for finding duplicates
SourceSchema.index({ userId: 1, url: 1 }, { unique: true, partialFilterExpression: { url: { $exists: true } } });
SourceSchema.index({ userId: 1, fileName: 1 }, { unique: false }); // Files might have same name, maybe verify hash? For now just index.

module.exports = mongoose.model('Source', SourceSchema);

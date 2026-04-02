/**
 * Phase 5.4: Suggested Q&A from unanswered / low-confidence queries (auto-learning).
 */

const mongoose = require('mongoose');

const suggestedQASchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    question: { type: String, required: true },
    source: { type: String, enum: ['no_context', 'low_confidence', 'manual'], default: 'no_context' },
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
    addedToQAAt: { type: Date },
    dismissedAt: { type: Date }
}, { timestamps: true });

suggestedQASchema.index({ userId: 1, addedToQAAt: 1, dismissedAt: 1 });

module.exports = mongoose.model('SuggestedQA', suggestedQASchema);

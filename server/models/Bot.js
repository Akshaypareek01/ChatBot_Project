/**
 * Phase 3.5: Multi-bot support. Each user can have multiple chatbots.
 *
 * Behavior Mode (Enterprise Flow Builder):
 *   - 'default' : bot replies via the existing AI/KB pipeline (RAG over uploaded data).
 *   - 'flow'    : bot runs the flow at `activeFlowId` (must be a Published flow owned
 *                 by the same user and bound to this bot). The widget conversation is
 *                 driven entirely by the flow runtime.
 *
 * The runtime resolver lives in chatbotController and chooses between the two paths.
 */

const mongoose = require('mongoose');

const botSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, default: 'My Chatbot' },
    slug: { type: String, required: true, trim: true, default: 'default' },
    behaviorMode: {
        type: String,
        enum: ['default', 'flow'],
        default: 'default',
    },
    activeFlowId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatFlow',
        default: null,
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

botSchema.index({ userId: 1, slug: 1 }, { unique: true });

module.exports = mongoose.model('Bot', botSchema);

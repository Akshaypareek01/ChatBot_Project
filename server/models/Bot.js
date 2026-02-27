/**
 * Phase 3.5: Multi-bot support. Each user can have multiple chatbots.
 */

const mongoose = require('mongoose');

const botSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, default: 'My Chatbot' },
    slug: { type: String, required: true, trim: true, default: 'default' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

botSchema.index({ userId: 1, slug: 1 }, { unique: true });

module.exports = mongoose.model('Bot', botSchema);

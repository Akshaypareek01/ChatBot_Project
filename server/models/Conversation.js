const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    feedback: { type: Number, enum: [1, -1] }
}, { _id: true });

const conversationSchema = new mongoose.Schema({
    visitorId: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    botId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot', default: null, index: true },
    messages: [messageSchema],
    metadata: {
        pageUrl: String,
        userAgent: String,
        duration: Number
    },
    status: { type: String, enum: ['active', 'ended', 'escalated'], default: 'active' },
    rating: { type: Number, min: 0, max: 5 },
    leadInfo: {
        email: String,
        phone: String,
        name: String
    },
    startedAt: { type: Date, default: Date.now },
    endedAt: Date
}, { timestamps: true });

conversationSchema.index({ userId: 1, startedAt: -1 });
conversationSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);

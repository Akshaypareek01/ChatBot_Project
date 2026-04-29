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
    escalatedAt: { type: Date },
    handoffMessages: [{
        role: { type: String, enum: ['visitor', 'agent'], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
    }],
    agentOnline: { type: Boolean, default: false },
    leadInfo: {
        email: String,
        phone: String,
        name: String
    },
    // Phase 5.6 + Enterprise Flow Builder: Chat flows / decision trees
    flowState: {
        flowId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatFlow', default: null },
        nodeId: { type: String, default: null }, // node.id within flow definition
        // Variables captured during the flow (e.g. order_id, email, api response slices).
        // Stored as a Map<String, Mixed> so arbitrary JSON values (numbers, strings, objects) work.
        variables: { type: Map, of: mongoose.Schema.Types.Mixed, default: () => new Map() },
        // Per-capture-node retry counters. Keyed by node.id, value is the remaining attempts.
        retries: { type: Map, of: Number, default: () => new Map() },
        // Visited node ids for analytics + cycle detection.
        history: { type: [String], default: [] },
        // When the runtime is waiting on visitor text input for a Capture node, this holds
        // the variable name to write into. null when the next user message is just a turn.
        pendingCaptureVar: { type: String, default: null }
    },
    startedAt: { type: Date, default: Date.now },
    endedAt: Date
}, { timestamps: true });

conversationSchema.index({ userId: 1, startedAt: -1 });
conversationSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);

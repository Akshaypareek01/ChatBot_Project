/**
 * Phase 3.4: In-app notifications (new lead, low balance, support reply, etc.)
 */

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
        type: String,
        enum: ['new_lead', 'low_balance', 'support_reply', 'summary', 'system'],
        required: true
    },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    data: { type: mongoose.Schema.Types.Mixed }, // e.g. { conversationId, leadEmail }
    readAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now, index: true }
});

notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);

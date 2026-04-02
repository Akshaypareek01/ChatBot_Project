/**
 * Phase 5.2: User-configured webhook URLs and events.
 */

const mongoose = require('mongoose');

const WEBHOOK_EVENTS = [
    'conversation_started',
    'lead_captured',
    'chat_escalated',
    'feedback_received',
    'token_low'
];

const webhookSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    url: { type: String, required: true, trim: true },
    events: { type: [String], enum: WEBHOOK_EVENTS, default: [] },
    secret: { type: String, trim: true }, // optional HMAC secret for signature header
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

webhookSchema.index({ userId: 1 });

module.exports = mongoose.model('Webhook', webhookSchema);
module.exports.WEBHOOK_EVENTS = WEBHOOK_EVENTS;

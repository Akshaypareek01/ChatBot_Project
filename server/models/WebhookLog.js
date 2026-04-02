/**
 * Phase 5.2: Log of webhook delivery attempts.
 */

const mongoose = require('mongoose');

const webhookLogSchema = new mongoose.Schema({
    webhookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Webhook', required: true },
    event: { type: String, required: true },
    attempt: { type: Number, default: 1 },
    statusCode: { type: Number },
    success: { type: Boolean, default: false },
    errorMessage: { type: String },
    responseTimeMs: { type: Number }
}, { timestamps: true });

webhookLogSchema.index({ webhookId: 1, createdAt: -1 });

module.exports = mongoose.model('WebhookLog', webhookLogSchema);

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    action: { type: String, required: true }, // e.g. 'login', 'login_failed', 'admin_user_delete', 'payment_success'
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorEmail: { type: String },
    targetId: { type: mongoose.Schema.Types.ObjectId },
    targetType: { type: String }, // 'User', 'Transaction', etc.
    meta: { type: mongoose.Schema.Types.Mixed },
    ip: { type: String },
    userAgent: { type: String },
    createdAt: { type: Date, default: Date.now }
});

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);

const AuditLog = require('../models/AuditLog');

/**
 * Log an audit event. Fire-and-forget; do not block request.
 */
function log(action, options = {}) {
    const doc = {
        action,
        actorId: options.actorId || null,
        actorEmail: options.actorEmail || null,
        targetId: options.targetId || null,
        targetType: options.targetType || null,
        meta: options.meta || null,
        ip: options.ip || null,
        userAgent: options.userAgent || null
    };
    AuditLog.create(doc).catch((err) => console.error('Audit log write failed:', err));
}

function getReqMeta(req) {
    return {
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('user-agent')
    };
}

module.exports = { log, getReqMeta };

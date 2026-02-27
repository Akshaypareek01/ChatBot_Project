const AuditLog = require('../models/AuditLog');
const Cache = require('../models/Cache');

const DEFAULT_RETENTION_DAYS = 90;

/**
 * Delete audit logs and cache entries older than retention days.
 * Call from cron or manually. Set env DATA_RETENTION_DAYS (default 90).
 */
async function runDataRetention() {
    const days = parseInt(process.env.DATA_RETENTION_DAYS, 10) || DEFAULT_RETENTION_DAYS;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [auditResult, cacheResult] = await Promise.all([
        AuditLog.deleteMany({ createdAt: { $lt: cutoff } }),
        Cache.deleteMany({ createdAt: { $lt: cutoff } })
    ]);

    return {
        auditDeleted: auditResult.deletedCount,
        cacheDeleted: cacheResult.deletedCount,
        cutoff: cutoff.toISOString()
    };
}

module.exports = { runDataRetention };

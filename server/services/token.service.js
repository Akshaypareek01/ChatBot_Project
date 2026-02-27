const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const RefreshToken = require('../models/RefreshToken');
const User = require('../models/User');

const ACCESS_EXPIRY = '1h';
const REFRESH_EXPIRY_DAYS = 7;

/**
 * Hash a refresh token for storage (we only store hash, not raw token).
 */
function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Issue access token (short-lived) and refresh token (long-lived).
 * Stores refresh token hash in DB for rotation.
 * @returns { accessToken, refreshToken, expiresIn }
 */
async function issueTokenPair(userId, isAdmin = false) {
    const accessToken = jwt.sign(
        { userId, isAdmin },
        process.env.JWT_SECRET,
        { expiresIn: ACCESS_EXPIRY }
    );
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const refreshExpires = new Date(Date.now() + REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    await RefreshToken.create({
        userId,
        tokenHash: hashToken(refreshToken),
        expiresAt: refreshExpires
    });

    return {
        accessToken,
        refreshToken,
        expiresIn: 3600 // seconds, for client
    };
}

/**
 * Rotate refresh token: validate current one, invalidate it, issue new pair.
 * Returns new { accessToken, refreshToken, expiresIn } or null if invalid.
 */
async function rotateRefreshToken(refreshTokenRaw) {
    if (!refreshTokenRaw) return null;
    const tokenHash = hashToken(refreshTokenRaw);
    const doc = await RefreshToken.findOne({
        tokenHash,
        expiresAt: { $gt: new Date() }
    }).exec();
    if (!doc) return null;

    const userId = doc.userId;
    await RefreshToken.deleteOne({ _id: doc._id }); // Invalidate on use (rotation)
    const user = await User.findById(userId).select('role').lean();
    const isAdmin = user?.role === 'admin';
    return await issueTokenPair(userId, isAdmin);
}

/** List active sessions (refresh tokens) for a user. */
async function listSessions(userId) {
    const tokens = await RefreshToken.find({ userId, expiresAt: { $gt: new Date() } })
        .select('_id createdAt expiresAt')
        .sort({ createdAt: -1 })
        .lean();
    return tokens.map((t) => ({
        id: t._id,
        createdAt: t.createdAt,
        expiresAt: t.expiresAt
    }));
}

/** Revoke one session by RefreshToken id. Returns true if deleted. */
async function revokeSessionById(userId, sessionId) {
    const result = await RefreshToken.deleteOne({ _id: sessionId, userId });
    return result.deletedCount > 0;
}

/** Revoke all sessions for user (logout everywhere). */
async function revokeAllSessions(userId) {
    await RefreshToken.deleteMany({ userId });
}

module.exports = {
    issueTokenPair,
    rotateRefreshToken,
    listSessions,
    revokeSessionById,
    revokeAllSessions,
    hashToken,
    ACCESS_EXPIRY,
    REFRESH_EXPIRY_DAYS
};

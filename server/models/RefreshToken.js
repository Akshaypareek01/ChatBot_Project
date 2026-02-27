const mongoose = require('mongoose');

/**
 * Stores refresh token hashes for rotation.
 * Token is hashed before storage; raw token sent only once to client.
 */
const refreshTokenSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
});

refreshTokenSchema.index({ userId: 1 });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL for cleanup

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);

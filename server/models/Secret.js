/**
 * Secrets Vault — per-client encrypted credentials.
 *
 * Vault is account-wide (scoped by userId only): one secret like `shopify_token`
 * is reusable across every bot the client owns. Plaintext is never persisted —
 * only the AES-256-GCM ciphertext blob produced by `secretsCrypto.encryptSecret`.
 *
 * Runtime references look like `{{secret.shopify_token}}` inside flow node configs;
 * they are resolved at execute-time by `secretsVault.service.getSecretValue`.
 */

const mongoose = require('mongoose');

const SECRET_NAME_REGEX = /^[a-z][a-z0-9_]{1,63}$/;

const secretSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            validate: {
                validator: (v) => SECRET_NAME_REGEX.test(v),
                message:
                    'Secret name must be lowercase, start with a letter, and contain only letters, numbers, or underscores (max 64).',
            },
        },
        encryptedValue: { type: String, required: true },
        maskedHint: { type: String, default: '' },
        description: { type: String, default: '', trim: true, maxlength: 200 },
        lastUsedAt: { type: Date, default: null },
        lastRotatedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

secretSchema.index({ userId: 1, name: 1 }, { unique: true });

/**
 * Sanitize a secret document for API responses. Strips ciphertext, never returns plaintext.
 *
 * @param {object} doc - lean secret document.
 * @returns {object} safe-to-return shape used by REST endpoints.
 */
secretSchema.statics.toPublicJSON = function toPublicJSON(doc) {
    if (!doc) return null;
    return {
        _id: doc._id,
        name: doc.name,
        maskedHint: doc.maskedHint,
        description: doc.description || '',
        lastUsedAt: doc.lastUsedAt || null,
        lastRotatedAt: doc.lastRotatedAt || null,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
    };
};

module.exports = mongoose.model('Secret', secretSchema);

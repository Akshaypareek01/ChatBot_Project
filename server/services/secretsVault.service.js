/**
 * Secrets Vault service.
 *
 * Provides CRUD over per-client encrypted secrets and a runtime resolver
 * (`getSecretValue`) used by flow node executors. Plaintext never leaves
 * this module after creation/rotation.
 *
 * Cache: a small in-process LRU avoids re-decrypting the same secret on
 * every flow step. Entries TTL out after 5 minutes so rotations propagate
 * promptly across pods/instances without a restart.
 */

const Secret = require('../models/Secret');
const {
    encryptSecret,
    decryptSecret,
    buildMaskedHint,
    isVaultReady,
} = require('../utils/secretsCrypto');

const CACHE_MAX = 256;
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();

/**
 * @param {string} userId
 * @param {string} name
 * @returns {string} cache key
 */
function makeCacheKey(userId, name) {
    return `${String(userId)}::${String(name).toLowerCase()}`;
}

/** Touch an entry to keep it fresh (LRU re-insert pattern on Map). */
function cacheGet(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.at > CACHE_TTL_MS) {
        cache.delete(key);
        return null;
    }
    cache.delete(key);
    cache.set(key, entry);
    return entry.value;
}

function cacheSet(key, value) {
    if (cache.size >= CACHE_MAX) {
        const oldest = cache.keys().next().value;
        if (oldest) cache.delete(oldest);
    }
    cache.set(key, { value, at: Date.now() });
}

function cacheInvalidate(key) {
    cache.delete(key);
}

/**
 * List all secrets for a client (no plaintext, no ciphertext — only safe metadata).
 *
 * @param {string} userId
 * @returns {Promise<Array<object>>}
 */
async function listSecrets(userId) {
    const docs = await Secret.find({ userId }).sort({ name: 1 }).lean();
    return docs.map((d) => Secret.toPublicJSON(d));
}

/**
 * Create a new secret. Fails if a secret with the same name already exists.
 *
 * @param {string} userId
 * @param {{ name: string, value: string, description?: string }} input
 * @returns {Promise<object>} public JSON shape.
 */
async function createSecret(userId, input) {
    if (!isVaultReady()) {
        throw new Error('Secrets vault is not configured. Set SECRETS_ENC_KEY.');
    }
    const name = String(input?.name || '').toLowerCase().trim();
    const value = String(input?.value || '');
    if (!name) throw new Error('Secret name is required.');
    if (!value) throw new Error('Secret value is required.');
    const existing = await Secret.findOne({ userId, name }).lean();
    if (existing) throw new Error(`A secret named "${name}" already exists.`);
    const encryptedValue = encryptSecret(value);
    const created = await Secret.create({
        userId,
        name,
        encryptedValue,
        maskedHint: buildMaskedHint(value),
        description: String(input?.description || '').trim().slice(0, 200),
    });
    return Secret.toPublicJSON(created.toObject());
}

/**
 * Rotate an existing secret's value. Description can also be updated; name is immutable.
 *
 * @param {string} userId
 * @param {string} secretId
 * @param {{ value?: string, description?: string }} updates
 * @returns {Promise<object|null>}
 */
async function updateSecret(userId, secretId, updates) {
    const secret = await Secret.findOne({ _id: secretId, userId });
    if (!secret) return null;

    if (typeof updates?.value === 'string' && updates.value.length > 0) {
        secret.encryptedValue = encryptSecret(updates.value);
        secret.maskedHint = buildMaskedHint(updates.value);
        secret.lastRotatedAt = new Date();
        cacheInvalidate(makeCacheKey(userId, secret.name));
    }
    if (typeof updates?.description === 'string') {
        secret.description = updates.description.trim().slice(0, 200);
    }

    await secret.save();
    return Secret.toPublicJSON(secret.toObject());
}

/**
 * Permanently delete a secret. Caller is responsible for warning the user
 * about flows that reference this secret name.
 *
 * @param {string} userId
 * @param {string} secretId
 * @returns {Promise<boolean>} whether a row was removed.
 */
async function deleteSecret(userId, secretId) {
    const secret = await Secret.findOne({ _id: secretId, userId });
    if (!secret) return false;
    cacheInvalidate(makeCacheKey(userId, secret.name));
    await Secret.deleteOne({ _id: secret._id });
    return true;
}

/**
 * Resolve `{{secret.<name>}}` at runtime. Returns plaintext.
 * Throws if the secret does not exist — caller decides how to surface the error
 * (typically: route to the API node's `onErrorNodeId`).
 *
 * @param {string} userId
 * @param {string} name
 * @returns {Promise<string>} plaintext.
 */
async function getSecretValue(userId, name) {
    const key = makeCacheKey(userId, name);
    const cached = cacheGet(key);
    if (cached) return cached;
    const doc = await Secret.findOne({ userId, name: String(name).toLowerCase() })
        .select('encryptedValue')
        .lean();
    if (!doc) throw new Error(`Secret "${name}" not found in vault.`);
    const plaintext = decryptSecret(doc.encryptedValue);
    cacheSet(key, plaintext);
    Secret.updateOne({ _id: doc._id }, { $set: { lastUsedAt: new Date() } }).catch(() => {});
    return plaintext;
}

module.exports = {
    listSecrets,
    createSecret,
    updateSecret,
    deleteSecret,
    getSecretValue,
};

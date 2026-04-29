/**
 * Secrets vault crypto util.
 *
 * Encrypts client-provided secrets (AI API keys, third-party tokens) at rest using AES-256-GCM.
 *
 * Key resolution order (first non-empty wins):
 *   1. SECRETS_ENC_KEY  - dedicated master key for the secrets vault. Set this in production.
 *   2. ENCRYPTION_KEY   - generic app encryption key (fallback).
 *   3. JWT_SECRET       - last-resort fallback so dev environments keep working.
 *
 * Rotation:
 *   - Set the new key as SECRETS_ENC_KEY and re-encrypt all rows by running a rotate job
 *     that decrypts with the previous key and encrypts with the new one. Never overwrite
 *     SECRETS_ENC_KEY without doing this; encrypted blobs become unrecoverable.
 *
 * Output format:
 *   base64( iv(12) || tag(16) || ciphertext )
 */

const crypto = require('crypto');

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

let cachedKey = null;
let cachedKeySource = null;

/**
 * Derive a 32-byte key from the configured master secret using SHA-256.
 *
 * @returns {{ key: Buffer, source: string }}
 * @throws {Error} when no master secret is configured.
 */
function getKey() {
    const candidates = [
        ['SECRETS_ENC_KEY', process.env.SECRETS_ENC_KEY],
        ['ENCRYPTION_KEY', process.env.ENCRYPTION_KEY],
        ['JWT_SECRET', process.env.JWT_SECRET],
    ];
    const picked = candidates.find(([, v]) => typeof v === 'string' && v.length >= 16);
    if (!picked) {
        throw new Error('Secrets vault master key missing. Set SECRETS_ENC_KEY in environment.');
    }
    const [source, value] = picked;
    if (cachedKey && cachedKeySource === source) return { key: cachedKey, source };
    cachedKey = crypto.createHash('sha256').update(value, 'utf8').digest();
    cachedKeySource = source;
    return { key: cachedKey, source };
}

/**
 * Encrypt a plaintext secret string. Throws if no master key is configured.
 *
 * @param {string} plaintext - raw secret value (e.g. an OpenAI API key).
 * @returns {string} base64-encoded ciphertext blob.
 */
function encryptSecret(plaintext) {
    if (typeof plaintext !== 'string' || plaintext.length === 0) {
        throw new Error('encryptSecret: plaintext must be a non-empty string');
    }
    const { key } = getKey();
    const iv = crypto.randomBytes(IV_LEN);
    const cipher = crypto.createCipheriv(ALGO, key, iv);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, enc]).toString('base64');
}

/**
 * Decrypt a ciphertext blob produced by encryptSecret.
 *
 * @param {string} ciphertext - base64 blob.
 * @returns {string} plaintext secret.
 * @throws {Error} when decryption fails (tampered blob, wrong key, malformed input).
 */
function decryptSecret(ciphertext) {
    if (typeof ciphertext !== 'string' || ciphertext.length === 0) {
        throw new Error('decryptSecret: ciphertext must be a non-empty string');
    }
    const { key } = getKey();
    const buf = Buffer.from(ciphertext, 'base64');
    if (buf.length < IV_LEN + TAG_LEN + 1) {
        throw new Error('decryptSecret: ciphertext blob is too short');
    }
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const enc = buf.subarray(IV_LEN + TAG_LEN);
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return dec.toString('utf8');
}

/**
 * Build a masked hint for safe display in the UI: first 4 + last 4 with the middle masked.
 * E.g. `sk-proj-abcd...x9q2`.
 *
 * @param {string} plaintext
 * @returns {string} masked preview, never the full value.
 */
function buildMaskedHint(plaintext) {
    if (typeof plaintext !== 'string' || plaintext.length === 0) return '';
    if (plaintext.length <= 8) return '*'.repeat(plaintext.length);
    const head = plaintext.slice(0, 4);
    const tail = plaintext.slice(-4);
    return `${head}${'*'.repeat(Math.max(4, plaintext.length - 8))}${tail}`;
}

/**
 * Quick health check used by the controller on first POST so we fail loudly
 * if the env is misconfigured rather than silently storing unrecoverable data.
 */
function isVaultReady() {
    try {
        getKey();
        return true;
    } catch {
        return false;
    }
}

module.exports = {
    encryptSecret,
    decryptSecret,
    buildMaskedHint,
    isVaultReady,
};

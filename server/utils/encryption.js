const crypto = require('crypto');

const ALGO = 'aes-256-gcm';
const IV_LEN = 16;
const TAG_LEN = 16;
const KEY_LEN = 32;

function getKey() {
    const key = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
    if (!key || key.length < 32) return null;
    return crypto.createHash('sha256').update(key).digest();
}

/**
 * Encrypt a JSON-serializable value. Returns base64 string or null if encryption unavailable.
 */
function encrypt(value) {
    const key = getKey();
    if (!key || value == null) return value;
    try {
        const iv = crypto.randomBytes(IV_LEN);
        const cipher = crypto.createCipheriv(ALGO, key, iv);
        const json = JSON.stringify(value);
        const enc = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
        const tag = cipher.getAuthTag();
        return Buffer.concat([iv, tag, enc]).toString('base64');
    } catch (e) {
        console.error('Encryption error:', e);
        return value;
    }
}

/**
 * Decrypt a value encrypted with encrypt(). Returns parsed object or original if not encrypted.
 */
function decrypt(encrypted) {
    const key = getKey();
    if (!key || encrypted == null || typeof encrypted !== 'string') return encrypted;
    try {
        const buf = Buffer.from(encrypted, 'base64');
        if (buf.length < IV_LEN + TAG_LEN) return encrypted;
        const iv = buf.subarray(0, IV_LEN);
        const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
        const enc = buf.subarray(IV_LEN + TAG_LEN);
        const decipher = crypto.createDecipheriv(ALGO, key, iv);
        decipher.setAuthTag(tag);
        const json = decipher.update(enc) + decipher.final('utf8');
        return JSON.parse(json);
    } catch {
        return encrypted; // Not encrypted or wrong key
    }
}

module.exports = { encrypt, decrypt };

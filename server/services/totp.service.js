const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

const ISSUER = 'ChatBot Admin';

/**
 * Generate a new TOTP secret for the user. Store secret in user.totpSecret; do not set totpEnabled until verified.
 */
function generateSecret(email) {
    const secret = speakeasy.generateSecret({
        name: `${ISSUER}:${email}`,
        length: 32
    });
    return secret;
}

/**
 * Get QR code data URL for adding to Google Authenticator etc.
 */
async function getQRDataURL(secret) {
    return await QRCode.toDataURL(secret.otpauth_url);
}

/**
 * Verify a TOTP token against the user's stored secret.
 */
function verifyToken(secret, token) {
    if (!secret || !token) return false;
    return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: String(token).trim(),
        window: 1
    });
}

module.exports = { generateSecret, getQRDataURL, verifyToken };

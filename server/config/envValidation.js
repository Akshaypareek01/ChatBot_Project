/**
 * Validate required env vars and JWT_SECRET strength on startup. Exits process if invalid.
 */
const REQUIRED = [
    'MONGODB_URI',
    'JWT_SECRET'
];

const WEAK_JWT_SECRETS = [
    'your_super_secret_jwt_key_change_this_in_production',
    'secret',
    'jwt_secret',
    'change_this',
    'dev',
    'test'
];

function validateEnv() {
    const missing = REQUIRED.filter((key) => !process.env[key] || process.env[key].trim() === '');
    if (missing.length > 0) {
        console.error('Missing required environment variables:', missing.join(', '));
        console.error('Set them in .env (see .env.example).');
        process.exit(1);
    }

    const secret = process.env.JWT_SECRET.trim();
    if (secret.length < 32) {
        console.error('JWT_SECRET must be at least 32 characters for security.');
        process.exit(1);
    }
    if (WEAK_JWT_SECRETS.some((weak) => secret === weak || secret.toLowerCase().includes(weak))) {
        console.error('JWT_SECRET must not use default or weak values. Generate a strong random string.');
        process.exit(1);
    }
}

module.exports = { validateEnv };

/**
 * Phase 5.8: Google OAuth — get auth URL and exchange code for profile.
 * Requires GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and callback URL in .env.
 */

const axios = require('axios');

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

const SCOPES = ['openid', 'email', 'profile'].join(' ');

/**
 * Build redirect URL for Google consent. callbackUrl = full URL of your /users/auth/google/callback.
 */
function getAuthUrl(callbackUrl, state = '') {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) throw new Error('GOOGLE_CLIENT_ID is not set');
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: callbackUrl,
        response_type: 'code',
        scope: SCOPES,
        access_type: 'offline',
        prompt: 'consent'
    });
    if (state) params.set('state', state);
    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange code for access token, then fetch profile. Returns { id, email, name, picture }.
 */
async function getProfileFromCode(code, callbackUrl) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set');

    const tokenRes = await axios.post(
        GOOGLE_TOKEN_URL,
        new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: callbackUrl,
            grant_type: 'authorization_code'
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 10000 }
    );

    const accessToken = tokenRes.data?.access_token;
    if (!accessToken) throw new Error('Google did not return an access token');

    const profileRes = await axios.get(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 10000
    });

    const p = profileRes.data;
    return {
        id: p.id,
        email: (p.email || '').toLowerCase().trim(),
        name: (p.name || p.email || 'User').trim(),
        picture: p.picture || null
    };
}

module.exports = { getAuthUrl, getProfileFromCode };

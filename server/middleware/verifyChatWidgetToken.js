/**
 * For POST /chat: verify widget token from body and request signature (HMAC).
 * Must run after express.json(). Returns 401 if invalid.
 * Request signing prevents replay and tampering; requires X-Widget-Timestamp and X-Widget-Signature.
 */
const crypto = require('crypto');
const widgetTokenService = require('../services/widgetToken.service');

const REPLAY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function verifyChatWidgetToken(req, res, next) {
    const token = req.body?.widgetToken;
    const userId = token ? widgetTokenService.verifyWidgetToken(token) : null;
    if (!userId) {
        return res.status(401).json({ message: 'Invalid or expired widget token.' });
    }

    const timestamp = req.headers['x-widget-timestamp'];
    const signature = req.headers['x-widget-signature'];
    if (!timestamp || !signature) {
        return res.status(401).json({ message: 'Request signature required (X-Widget-Timestamp, X-Widget-Signature).' });
    }

    const now = Date.now();
    const ts = parseInt(timestamp, 10);
    if (Number.isNaN(ts) || Math.abs(now - ts) > REPLAY_WINDOW_MS) {
        return res.status(401).json({ message: 'Request timestamp expired or invalid.' });
    }

    const path = (req.originalUrl || req.url || '').split('?')[0];
    const rawBody = (req.rawBody && req.rawBody.toString) ? req.rawBody.toString('utf8') : '';
    const payload = timestamp + '\n' + req.method + '\n' + path + '\n' + rawBody;
    const expected = crypto.createHmac('sha256', token).update(payload, 'utf8').digest('hex');
    if (expected !== signature.toLowerCase()) {
        return res.status(401).json({ message: 'Invalid request signature.' });
    }

    req.chatUserId = userId;
    next();
}

module.exports = verifyChatWidgetToken;

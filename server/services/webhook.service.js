/**
 * Phase 5.2: Trigger webhooks with retry (3 attempts, exponential backoff).
 */

const axios = require('axios');
const crypto = require('crypto');
const Webhook = require('../models/Webhook');
const WebhookLog = require('../models/WebhookLog');

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1000;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function signPayload(payload, secret) {
    if (!secret) return null;
    return crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
}

/**
 * Trigger all active webhooks for userId that are subscribed to event.
 * @param {string} userId
 * @param {string} event - one of WEBHOOK_EVENTS
 * @param {object} payload - event data
 */
async function triggerWebhooks(userId, event, payload) {
    const webhooks = await Webhook.find({ userId, isActive: true, events: event }).lean();
    const fullPayload = { event, timestamp: new Date().toISOString(), data: payload };
    for (const wh of webhooks) {
        await deliverWithRetry(wh, fullPayload);
    }
}

async function deliverWithRetry(webhook, payload) {
    const signature = signPayload(payload, webhook.secret);
    const headers = { 'Content-Type': 'application/json' };
    if (signature) headers['X-Webhook-Signature'] = 'sha256=' + signature;

    let lastError = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const start = Date.now();
        try {
            const res = await axios.post(webhook.url, payload, {
                headers,
                timeout: 15000,
                validateStatus: () => true
            });
            const responseTimeMs = Date.now() - start;
            const success = res.status >= 200 && res.status < 300;
            await WebhookLog.create({
                webhookId: webhook._id,
                event: payload.event,
                attempt,
                statusCode: res.status,
                success,
                errorMessage: success ? null : (res.data?.message || res.statusText),
                responseTimeMs
            });
            if (success) return;
            lastError = res.status;
        } catch (err) {
            const responseTimeMs = Date.now() - start;
            await WebhookLog.create({
                webhookId: webhook._id,
                event: payload.event,
                attempt,
                success: false,
                errorMessage: err.message || String(err),
                responseTimeMs
            });
            lastError = err.message;
        }
        if (attempt < MAX_ATTEMPTS) {
            await sleep(BASE_DELAY_MS * Math.pow(2, attempt - 1));
        }
    }
}

module.exports = { triggerWebhooks };

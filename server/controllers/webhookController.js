/**
 * Phase 5.2: CRUD for user webhooks and delivery logs.
 */

const Webhook = require('../models/Webhook');
const WebhookLog = require('../models/WebhookLog');
const { WEBHOOK_EVENTS } = require('../models/Webhook');

const list = async (req, res) => {
    try {
        const webhooks = await Webhook.find({ userId: req.userId }).sort({ createdAt: -1 }).lean();
        return res.json({ webhooks });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const create = async (req, res) => {
    try {
        const { url, events, secret } = req.body;
        if (!url || typeof url !== 'string' || !url.trim()) {
            return res.status(400).json({ message: 'url is required' });
        }
        const eventList = Array.isArray(events) ? events.filter((e) => WEBHOOK_EVENTS.includes(e)) : [];
        const webhook = await Webhook.create({
            userId: req.userId,
            url: url.trim(),
            events: eventList,
            secret: secret && typeof secret === 'string' ? secret.trim() : undefined
        });
        return res.status(201).json(webhook);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const update = async (req, res) => {
    try {
        const { url, events, secret, isActive } = req.body;
        const webhook = await Webhook.findOne({ _id: req.params.id, userId: req.userId });
        if (!webhook) return res.status(404).json({ message: 'Webhook not found' });
        if (url !== undefined) webhook.url = url.trim();
        if (events !== undefined) webhook.events = Array.isArray(events) ? events.filter((e) => WEBHOOK_EVENTS.includes(e)) : webhook.events;
        if (secret !== undefined) webhook.secret = secret && typeof secret === 'string' ? secret.trim() : undefined;
        if (typeof isActive === 'boolean') webhook.isActive = isActive;
        await webhook.save();
        return res.json(webhook);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const remove = async (req, res) => {
    try {
        const deleted = await Webhook.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        if (!deleted) return res.status(404).json({ message: 'Webhook not found' });
        return res.json({ message: 'Webhook deleted' });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const listEvents = async (req, res) => {
    return res.json({ events: WEBHOOK_EVENTS });
};

const listLogs = async (req, res) => {
    try {
        const webhook = await Webhook.findOne({ _id: req.params.id, userId: req.userId });
        if (!webhook) return res.status(404).json({ message: 'Webhook not found' });
        const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
        const logs = await WebhookLog.find({ webhookId: webhook._id })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
        return res.json({ logs });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = { list, create, update, remove, listEvents, listLogs };

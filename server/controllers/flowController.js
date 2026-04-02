/**
 * Phase 5.6: Chat Flows / Decision Trees
 * CRUD + templates for user flows.
 */

const mongoose = require('mongoose');
const ChatFlow = require('../models/ChatFlow');
const botService = require('../services/bot.service');

function ensureNodeIds(flow) {
    const ids = new Set();
    for (const n of flow.nodes || []) {
        if (!n.id) throw new Error('Each node must have an id');
        if (ids.has(n.id)) throw new Error(`Duplicate node id: ${n.id}`);
        ids.add(n.id);
    }
    if (!ids.has(flow.startNodeId)) throw new Error('startNodeId must exist in nodes');
}

const listFlows = async (req, res) => {
    try {
        let botId = req.query.botId || null;
        if (!botId) {
            const defaultBot = await botService.ensureDefaultBot(req.userId);
            botId = defaultBot._id;
        }
        const flows = await ChatFlow.find({ userId: req.userId, botId })
            .select('name isActive startNodeId version createdAt updatedAt')
            .sort({ updatedAt: -1 })
            .lean();
        return res.status(200).json({ flows });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const getFlow = async (req, res) => {
    try {
        const flow = await ChatFlow.findOne({ _id: req.params.id, userId: req.userId }).lean();
        if (!flow) return res.status(404).json({ message: 'Flow not found' });
        return res.status(200).json(flow);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const createFlow = async (req, res) => {
    try {
        let botId = req.body?.botId || null;
        if (!botId) {
            const defaultBot = await botService.ensureDefaultBot(req.userId);
            botId = defaultBot._id;
        }
        const { name, nodes, startNodeId, isActive } = req.body || {};
        if (!name) return res.status(400).json({ message: 'name is required' });
        const flow = { userId: req.userId, botId, name: String(name), nodes: Array.isArray(nodes) ? nodes : [], startNodeId: String(startNodeId || ''), isActive: !!isActive };
        ensureNodeIds(flow);
        if (flow.isActive) {
            await ChatFlow.updateMany({ userId: req.userId, botId, isActive: true }, { $set: { isActive: false } });
        }
        const created = await ChatFlow.create(flow);
        return res.status(201).json(created);
    } catch (error) {
        return res.status(400).json({ message: error.message || 'Invalid flow' });
    }
};

const updateFlow = async (req, res) => {
    try {
        const existing = await ChatFlow.findOne({ _id: req.params.id, userId: req.userId });
        if (!existing) return res.status(404).json({ message: 'Flow not found' });
        const updates = {};
        if (req.body.name != null) updates.name = String(req.body.name);
        if (req.body.startNodeId != null) updates.startNodeId = String(req.body.startNodeId);
        if (req.body.nodes != null) updates.nodes = Array.isArray(req.body.nodes) ? req.body.nodes : existing.nodes;
        if (req.body.isActive != null) updates.isActive = !!req.body.isActive;
        const merged = { ...existing.toObject(), ...updates };
        ensureNodeIds(merged);
        updates.version = (existing.version || 1) + 1;
        if (updates.isActive) {
            await ChatFlow.updateMany({ userId: req.userId, botId: existing.botId, isActive: true, _id: { $ne: existing._id } }, { $set: { isActive: false } });
        }
        const saved = await ChatFlow.findByIdAndUpdate(existing._id, { $set: updates }, { new: true }).lean();
        return res.status(200).json(saved);
    } catch (error) {
        return res.status(400).json({ message: error.message || 'Invalid flow' });
    }
};

const deleteFlow = async (req, res) => {
    try {
        const flow = await ChatFlow.findOne({ _id: req.params.id, userId: req.userId }).select('_id').lean();
        if (!flow) return res.status(404).json({ message: 'Flow not found' });
        await ChatFlow.deleteOne({ _id: flow._id });
        return res.status(200).json({ message: 'Deleted' });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const listTemplates = async (req, res) => {
    const templates = [
        {
            id: 'support-routing',
            name: 'Support routing',
            flow: {
                name: 'Support routing',
                startNodeId: 'start',
                nodes: [
                    { id: 'start', type: 'message', title: 'Start', text: 'What can I help you with?', options: [
                        { id: 'o1', label: 'Order status', nextNodeId: 'order' },
                        { id: 'o2', label: 'Refund / return', nextNodeId: 'refund' },
                        { id: 'o3', label: 'Talk to sales', nextNodeId: 'sales' }
                    ]},
                    { id: 'order', type: 'question', title: 'Order', text: 'Share your order ID.', conditions: [], fallbackNextNodeId: 'order-ai' },
                    { id: 'order-ai', type: 'ai', title: 'Order AI', text: '', aiInstructions: 'You are an order support assistant. Ask 1 follow-up if needed, otherwise answer succinctly.', options: [{ id: 'b1', label: 'Back', nextNodeId: 'start' }] },
                    { id: 'refund', type: 'ai', title: 'Refund AI', text: '', aiInstructions: 'You are a returns/refunds assistant. Explain policy and next steps based on context.', options: [{ id: 'b1', label: 'Back', nextNodeId: 'start' }] },
                    { id: 'sales', type: 'ai', title: 'Sales AI', text: '', aiInstructions: 'You are a sales assistant. Qualify intent and propose next steps.', options: [{ id: 'b1', label: 'Back', nextNodeId: 'start' }] }
                ]
            }
        }
    ];
    return res.status(200).json({ templates });
};

module.exports = {
    listFlows,
    getFlow,
    createFlow,
    updateFlow,
    deleteFlow,
    listTemplates
};


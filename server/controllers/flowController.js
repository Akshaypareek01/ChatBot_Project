/**
 * Phase 5.6 / Enterprise Flow Builder \u2014 chat flow controller.
 *
 * REST surface (mounted under /api by userRoutes):
 *
 *   GET    /users/flows/templates          \u2014 list of starter templates (summaries).
 *   POST   /users/flows/templates/:id      \u2014 clone a template into a new flow.
 *   GET    /users/flows                    \u2014 list flows for current user (+botId filter).
 *   POST   /users/flows                    \u2014 create a new flow.
 *   GET    /users/flows/:id                \u2014 read a flow.
 *   PUT    /users/flows/:id                \u2014 save (replaces fields).
 *   DELETE /users/flows/:id                \u2014 delete.
 *   POST   /users/flows/:id/validate       \u2014 lint draft (or published, via ?stage=).
 *   POST   /users/flows/:id/test           \u2014 dry-run with scripted messages.
 *   POST   /users/flows/:id/publish        \u2014 freeze draft \u2192 published; bumps version.
 *   POST   /users/flows/:id/unpublish      \u2014 published \u2192 draft; clears Bot.activeFlowId.
 *
 * Heavy lifting lives in:
 *   services/flowValidator.service.js
 *   services/flowTester.service.js
 *   services/flowTemplates/*
 *
 * The controller stays thin (request shaping + persistence + 4xx/5xx) so each
 * concern can be unit-tested in isolation.
 */

const ChatFlow = require('../models/ChatFlow');
const Bot = require('../models/Bot');
const Secret = require('../models/Secret');
const botService = require('../services/bot.service');
const flowTemplates = require('../services/flowTemplates');
const { validateFlow } = require('../services/flowValidator.service');
const { runTest } = require('../services/flowTester.service');
const { getFlowAnalytics } = require('../services/flowAnalytics.service');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Canvas auto-layout — assigns x/y positions via BFS so template nodes
// render as a readable top-down graph instead of a pile-up.
// ---------------------------------------------------------------------------

const CARD_W  = 280;
const CARD_H  = 100;
const H_GAP   = 80;
const V_GAP   = 110;

/**
 * Extract all direct successor node IDs from a single flow node.
 * Handles every node type's "next" pointer fields.
 *
 * @param {object} node
 * @returns {string[]}
 */
function getNodeSuccessors(node) {
    const ids = [];
    if (Array.isArray(node.options))
        node.options.forEach(o => o?.nextNodeId && ids.push(o.nextNodeId));
    if (node.fallbackNextNodeId)            ids.push(node.fallbackNextNodeId);
    if (node.capture?.nextNodeId)           ids.push(node.capture.nextNodeId);
    if (node.capture?.fallbackNextNodeId)   ids.push(node.capture.fallbackNextNodeId);
    if (Array.isArray(node.branch?.conditions))
        node.branch.conditions.forEach(c => c?.nextNodeId && ids.push(c.nextNodeId));
    if (node.branch?.fallbackNextNodeId)    ids.push(node.branch.fallbackNextNodeId);
    if (node.setVariable?.nextNodeId)       ids.push(node.setVariable.nextNodeId);
    if (node.apiAction?.onSuccessNodeId)    ids.push(node.apiAction.onSuccessNodeId);
    if (node.apiAction?.onErrorNodeId)      ids.push(node.apiAction.onErrorNodeId);
    if (node.handoff?.fallbackNextNodeId)   ids.push(node.handoff.fallbackNextNodeId);
    if (node.delay?.nextNodeId)             ids.push(node.delay.nextNodeId);
    if (node.jump?.nextNodeId)              ids.push(node.jump.nextNodeId);
    if (node.trigger?.nextNodeId)           ids.push(node.trigger.nextNodeId);
    if (Array.isArray(node.cards))
        node.cards.forEach(c =>
            Array.isArray(c?.buttons) &&
            c.buttons.forEach(b => b?.nextNodeId && ids.push(b.nextNodeId))
        );
    return [...new Set(ids.filter(Boolean))];
}

/**
 * Return a copy of `nodes` with x/y positions assigned via BFS from
 * `startNodeId`. Nodes already carrying a position are re-laid out so the
 * full graph is always coherent (templates ship without positions).
 *
 * @param {object[]} nodes
 * @param {string}   startNodeId
 * @returns {object[]}
 */
function layoutNodes(nodes, startNodeId) {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const levelMap = new Map();

    // BFS to assign depth levels
    const queue = [startNodeId];
    levelMap.set(startNodeId, 0);
    const visited = new Set();

    while (queue.length) {
        const id = queue.shift();
        if (visited.has(id)) continue;
        visited.add(id);
        const node = nodeMap.get(id);
        if (!node) continue;
        const level = levelMap.get(id) ?? 0;
        for (const succId of getNodeSuccessors(node)) {
            if (!levelMap.has(succId)) levelMap.set(succId, level + 1);
            if (!visited.has(succId)) queue.push(succId);
        }
    }

    // Orphaned nodes (not reachable from start) get placed at the bottom
    let orphanLevel = levelMap.size
        ? Math.max(...levelMap.values()) + 1
        : 0;
    nodes.forEach(n => { if (!levelMap.has(n.id)) levelMap.set(n.id, orphanLevel++); });

    // Group by level
    const byLevel = new Map();
    levelMap.forEach((lvl, id) => {
        if (!byLevel.has(lvl)) byLevel.set(lvl, []);
        byLevel.get(lvl).push(id);
    });

    // Assign x/y: each level is centred around x = 400
    const posMap = new Map();
    [...byLevel.keys()].sort((a, b) => a - b).forEach(lvl => {
        const ids = byLevel.get(lvl);
        const totalW = ids.length * CARD_W + (ids.length - 1) * H_GAP;
        const startX = 400 - totalW / 2;
        const y = 80 + lvl * (CARD_H + V_GAP);
        ids.forEach((id, i) => posMap.set(id, { x: startX + i * (CARD_W + H_GAP), y }));
    });

    return nodes.map(n => ({ ...n, position: posMap.get(n.id) ?? { x: 80, y: 80 } }));
}

// ---------------------------------------------------------------------------

/**
 * Fail fast when the same node id appears twice or startNodeId is missing.
 *
 * @param {object} flow - any object that has `nodes[]` and `startNodeId`.
 * @throws {Error}
 */
function ensureNodeIds(flow) {
    const ids = new Set();
    for (const n of flow.nodes || []) {
        if (!n.id) throw new Error('Each node must have an id');
        if (ids.has(n.id)) throw new Error(`Duplicate node id: ${n.id}`);
        ids.add(n.id);
    }
    if (!ids.has(flow.startNodeId)) throw new Error('startNodeId must exist in nodes');
}

/**
 * Pick which node array to operate on based on `?stage=draft|published`.
 * Defaults to `draftNodes` (or `nodes` when there are no drafts yet).
 *
 * @param {object} flow
 * @param {'draft'|'published'} [stage]
 * @returns {Array<object>}
 */
function pickStageNodes(flow, stage) {
    if (stage === 'published') return flow.nodes || [];
    if (Array.isArray(flow.draftNodes) && flow.draftNodes.length > 0) return flow.draftNodes;
    return flow.nodes || [];
}

async function loadFlowOr404(req, res) {
    const flow = await ChatFlow.findOne({ _id: req.params.id, userId: req.userId });
    if (!flow) {
        res.status(404).json({ message: 'Flow not found' });
        return null;
    }
    return flow;
}

async function loadKnownSecretNames(userId) {
    const docs = await Secret.find({ userId }).select('name').lean();
    return new Set(docs.map((d) => d.name));
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/**
 * List the current user's flows. Supports `?botId=`. Includes lifecycle
 * fields so the UI can show drafts vs published at a glance.
 */
const listFlows = async (req, res) => {
    try {
        let botId = req.query.botId || null;
        if (!botId) {
            const defaultBot = await botService.ensureDefaultBot(req.userId);
            botId = defaultBot._id;
        }
        const flows = await ChatFlow.find({ userId: req.userId, botId })
            .select('name status isActive startNodeId version publishedVersion publishedAt createdAt updatedAt')
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

/**
 * Create a flow. New flows start as `draft` (status='draft') with the
 * provided nodes living in `draftNodes`. The `nodes` array (the published
 * snapshot) stays empty until the first publish.
 */
const createFlow = async (req, res) => {
    try {
        let botId = req.body?.botId || null;
        if (!botId) {
            const defaultBot = await botService.ensureDefaultBot(req.userId);
            botId = defaultBot._id;
        }
        const { name, nodes, startNodeId, description, variables } = req.body || {};
        if (!name) return res.status(400).json({ message: 'name is required' });

        const draftNodes = Array.isArray(nodes) ? nodes : [];
        const merged = { startNodeId: String(startNodeId || ''), nodes: draftNodes };
        ensureNodeIds(merged);

        const created = await ChatFlow.create({
            userId: req.userId,
            botId,
            name: String(name),
            description: description || '',
            startNodeId: merged.startNodeId,
            nodes: [],
            draftNodes,
            variables: Array.isArray(variables) ? variables : [],
            status: 'draft',
            isActive: false
        });
        return res.status(201).json(created);
    } catch (error) {
        return res.status(400).json({ message: error.message || 'Invalid flow' });
    }
};

/**
 * Save a flow.
 *
 * - When `nodes` is sent, we save it to `draftNodes` (drafts always edit drafts).
 * - When `published_nodes` is sent, we overwrite `nodes` directly (used by
 *   migration tools, never the UI).
 * - Setting `isActive: true` is preserved for back-compat but the new
 *   resolver prefers `Bot.activeFlowId`.
 */
const updateFlow = async (req, res) => {
    try {
        const existing = await loadFlowOr404(req, res);
        if (!existing) return;
        const updates = {};
        if (req.body.name != null) updates.name = String(req.body.name);
        if (req.body.description != null) updates.description = String(req.body.description);
        if (req.body.startNodeId != null) updates.startNodeId = String(req.body.startNodeId);
        if (req.body.variables != null) updates.variables = Array.isArray(req.body.variables) ? req.body.variables : existing.variables;
        if (req.body.nodes != null) updates.draftNodes = Array.isArray(req.body.nodes) ? req.body.nodes : existing.draftNodes;
        if (req.body.published_nodes != null) updates.nodes = Array.isArray(req.body.published_nodes) ? req.body.published_nodes : existing.nodes;
        if (req.body.isActive != null) updates.isActive = !!req.body.isActive;

        const merged = {
            startNodeId: updates.startNodeId || existing.startNodeId,
            nodes: updates.draftNodes || existing.draftNodes || existing.nodes
        };
        if (merged.nodes && merged.nodes.length > 0) ensureNodeIds(merged);

        updates.version = (existing.version || 1) + 1;
        if (updates.isActive) {
            await ChatFlow.updateMany(
                { userId: req.userId, botId: existing.botId, isActive: true, _id: { $ne: existing._id } },
                { $set: { isActive: false } }
            );
        }
        const saved = await ChatFlow.findByIdAndUpdate(existing._id, { $set: updates }, { new: true }).lean();
        return res.status(200).json(saved);
    } catch (error) {
        return res.status(400).json({ message: error.message || 'Invalid flow' });
    }
};

const deleteFlow = async (req, res) => {
    try {
        const flow = await ChatFlow.findOne({ _id: req.params.id, userId: req.userId }).select('_id botId').lean();
        if (!flow) return res.status(404).json({ message: 'Flow not found' });
        await ChatFlow.deleteOne({ _id: flow._id });
        // Clear any bot still pointing at this flow.
        await Bot.updateMany(
            { userId: req.userId, activeFlowId: flow._id },
            { $set: { activeFlowId: null, behaviorMode: 'default' } }
        );
        return res.status(200).json({ message: 'Deleted' });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

/**
 * Catalogue of templates (summaries only). The UI uses this to render the
 * "Start from a template" picker without paying the cost of the full bodies.
 */
const listTemplates = (_req, res) => {
    return res.status(200).json({ templates: flowTemplates.listTemplateSummaries() });
};

/**
 * Clone a template into a new ChatFlow document. The cloned flow lives as a
 * draft and never overrides anything in the user's bot.
 *
 * Body: { name?, botId? }
 */
const cloneTemplate = async (req, res) => {
    try {
        const tpl = flowTemplates.getTemplate(req.params.id);
        if (!tpl) return res.status(404).json({ message: 'Template not found' });

        let botId = req.body?.botId || null;
        if (!botId) {
            const defaultBot = await botService.ensureDefaultBot(req.userId);
            botId = defaultBot._id;
        }
        const rawNodes = tpl.flow.nodes || [];
        const laidOutNodes = layoutNodes(rawNodes, tpl.flow.startNodeId);

        const created = await ChatFlow.create({
            userId: req.userId,
            botId,
            name: String(req.body?.name || tpl.flow.name || tpl.name),
            description: tpl.flow.description || tpl.description || '',
            startNodeId: tpl.flow.startNodeId,
            nodes: [],
            draftNodes: laidOutNodes,
            variables: tpl.flow.variables || [],
            status: 'draft',
            isActive: false
        });
        return res.status(201).json(created);
    } catch (error) {
        return res.status(400).json({ message: error.message || 'Could not clone template' });
    }
};

// ---------------------------------------------------------------------------
// Validate
// ---------------------------------------------------------------------------

/**
 * Run the validator against a flow. By default validates the draft; pass
 * `?stage=published` to lint the live snapshot.
 *
 * Response shape mirrors the validator service so the UI can drop it
 * straight into the ValidationPanel.
 */
const validateFlowEndpoint = async (req, res) => {
    try {
        const flow = await loadFlowOr404(req, res);
        if (!flow) return;
        const stage = req.query.stage === 'published' ? 'published' : 'draft';
        const target = {
            startNodeId: flow.startNodeId,
            nodes: pickStageNodes(flow, stage),
            variables: flow.variables || []
        };
        const knownSecretNames = await loadKnownSecretNames(req.userId);
        const report = validateFlow(target, { knownSecretNames });
        return res.status(200).json({
            stage,
            startNodeId: target.startNodeId,
            nodeCount: target.nodes.length,
            ...report
        });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ---------------------------------------------------------------------------
// Test sandbox
// ---------------------------------------------------------------------------

/**
 * Dry-run the flow against a scripted list of visitor messages.
 *
 * Body:
 *   {
 *     messages:    string[]                       required
 *     mode:        'mock' | 'live'                default 'mock'
 *     stage:       'draft' | 'published'          default 'draft'
 *     initialVariables: object                    default {}
 *     leadInfo:    { email?, name?, phone? }      default {}
 *     mockApiResponses: { [nodeId]: { ok, statusCode, data, error } }
 *     mockSecrets: { [name]: string }
 *   }
 *
 * In `live` mode the tester decrypts the user's real secrets and hits real
 * APIs (subject to the SSRF guard). `mock` is the default for builder
 * preview \u2014 fast, no side-effects.
 */
const testFlowEndpoint = async (req, res) => {
    try {
        const flow = await loadFlowOr404(req, res);
        if (!flow) return;

        const {
            messages = [],
            mode = 'mock',
            stage = 'draft',
            initialVariables = {},
            leadInfo = {},
            mockApiResponses = {},
            mockSecrets = {}
        } = req.body || {};

        if (!Array.isArray(messages)) {
            return res.status(400).json({ message: 'messages must be an array of strings' });
        }
        if (messages.length > 50) {
            return res.status(400).json({ message: 'Too many messages \u2014 max 50 per dry-run.' });
        }

        const target = {
            startNodeId: flow.startNodeId,
            nodes: pickStageNodes(flow, stage === 'published' ? 'published' : 'draft'),
            variables: flow.variables || []
        };
        if (!target.nodes.length || !target.startNodeId) {
            return res.status(400).json({ message: 'This flow has no nodes to test on the requested stage.' });
        }

        const result = await runTest(target, {
            messages,
            mode: mode === 'live' ? 'live' : 'mock',
            initialVariables,
            leadInfo,
            mockApiResponses,
            mockSecrets,
            userId: req.userId
        });
        return res.status(200).json({
            stage,
            mode,
            ...result
        });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ---------------------------------------------------------------------------
// Publish / Unpublish
// ---------------------------------------------------------------------------

/**
 * Publish a flow:
 *   1. Validate the draft. Errors > 0 \u2192 422 with the report.
 *   2. Copy `draftNodes` \u2192 `nodes`.
 *   3. Set status='published', bump publishedVersion, stamp publishedAt.
 *   4. Optionally activate it on a bot if `?activateOn=:botId` is provided.
 */
const publishFlow = async (req, res) => {
    try {
        const flow = await loadFlowOr404(req, res);
        if (!flow) return;

        const draftNodes = Array.isArray(flow.draftNodes) && flow.draftNodes.length > 0
            ? flow.draftNodes
            : flow.nodes || [];
        if (draftNodes.length === 0) {
            return res.status(400).json({ message: 'Flow has no nodes to publish.' });
        }
        const target = { startNodeId: flow.startNodeId, nodes: draftNodes, variables: flow.variables || [] };
        const knownSecretNames = await loadKnownSecretNames(req.userId);
        const report = validateFlow(target, { knownSecretNames });
        if (!report.ok) {
            return res.status(422).json({
                message: 'Flow has validation errors. Fix them before publishing.',
                report
            });
        }

        flow.nodes = draftNodes;
        flow.status = 'published';
        flow.publishedAt = new Date();
        flow.publishedVersion = (flow.publishedVersion || 0) + 1;
        flow.version = (flow.version || 1) + 1;
        await flow.save();

        const activateOn = req.body?.activateOn || req.query?.activateOn || null;
        if (activateOn) {
            try {
                await botService.setBotBehavior(req.userId, activateOn, {
                    mode: 'flow',
                    activeFlowId: flow._id
                });
            } catch (e) {
                // Non-fatal \u2014 publish succeeded but activation didn't.
                return res.status(200).json({
                    flow,
                    activation: { ok: false, error: e.message }
                });
            }
        }
        return res.status(200).json({ flow, activation: activateOn ? { ok: true, botId: activateOn } : null });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * Unpublish a flow: marks it as draft and clears any Bot still pointing at it.
 */
const unpublishFlow = async (req, res) => {
    try {
        const flow = await loadFlowOr404(req, res);
        if (!flow) return;
        flow.status = 'draft';
        flow.isActive = false;
        flow.draftNodes = flow.draftNodes && flow.draftNodes.length > 0 ? flow.draftNodes : flow.nodes;
        flow.nodes = [];
        await flow.save();
        await Bot.updateMany(
            { userId: req.userId, activeFlowId: flow._id },
            { $set: { activeFlowId: null, behaviorMode: 'default' } }
        );
        return res.status(200).json({ flow });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * GET /users/flows/:id/analytics?period=7d|30d|90d&botId=...
 *
 * Returns per-node visit counts, drop-off, and overall completion rate over
 * the requested period. Tenancy is enforced through the user scope on the
 * underlying flow document and conversations collection.
 */
const getFlowAnalyticsEndpoint = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) return res.status(401).json({ message: 'Not authenticated' });

        const { id } = req.params;
        const period = String(req.query.period || '30d');
        const botId = req.query.botId ? String(req.query.botId) : null;

        const result = await getFlowAnalytics({
            flowId: id,
            userId,
            period,
            botId
        });
        return res.status(200).json(result);
    } catch (error) {
        return res
            .status(500)
            .json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    listFlows,
    getFlow,
    createFlow,
    updateFlow,
    deleteFlow,
    listTemplates,
    cloneTemplate,
    validateFlow: validateFlowEndpoint,
    testFlow: testFlowEndpoint,
    publishFlow,
    unpublishFlow,
    getFlowAnalytics: getFlowAnalyticsEndpoint
};

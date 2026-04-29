/**
 * Per-flow runtime analytics. Computes node-level visit counts, drop-off,
 * and completion rate for a single flow over a configurable time period.
 *
 * Implementation note: we don't add a new collection. Every flow turn already
 * persists `Conversation.flowState.history` (visited node ids) and now also
 * preserves `flowState.flowId` after end. That gives us enough signal to
 * derive analytics without doubling write volume on the hot chat path.
 */

const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const ChatFlow = require('../models/ChatFlow');

const PERIODS = { '7d': 7, '30d': 30, '90d': 90 };

/**
 * Returns the start of the analytics window — `period` days back from now,
 * snapped to UTC midnight so day buckets line up.
 *
 * @param {string} period One of the keys in PERIODS. Anything unknown
 *   defaults to 30 days.
 */
function periodStart(period) {
    const days = PERIODS[period] || 30;
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - days);
    d.setUTCHours(0, 0, 0, 0);
    return d;
}

/**
 * Build a node lookup keyed by id, plus an index of "end" node ids and the
 * declared start node id. We need the type info to attribute completions.
 *
 * @param {object} flow The Mongoose ChatFlow document (lean OK).
 * @returns {{ byId: Map<string, object>, endIds: Set<string>, startId: string }}
 */
function buildNodeIndex(flow) {
    const byId = new Map();
    const endIds = new Set();
    // Prefer published nodes; fall back to draft so analytics still work for
    // unpublished flows that are being tested via TestSandbox writes.
    const nodes =
        Array.isArray(flow.nodes) && flow.nodes.length > 0
            ? flow.nodes
            : Array.isArray(flow.draftNodes)
            ? flow.draftNodes
            : [];

    nodes.forEach((n) => {
        if (!n || !n.id) return;
        byId.set(n.id, n);
        if (n.type === 'end') endIds.add(n.id);
    });
    return { byId, endIds, startId: flow.startNodeId || (nodes[0]?.id ?? null), nodes };
}

/**
 * A "completed run" is a conversation whose history ends at a node of
 * type `end`. Falls back to detecting `flowState.nodeId === null` with a
 * non-empty history (the runtime nullifies nodeId on end + on capture-fail
 * fallback), which we accept as a soft completion.
 *
 * @param {object} conv  Conversation lean doc.
 * @param {Set<string>} endIds Set of node ids whose type is 'end'.
 * @returns {boolean}
 */
function didComplete(conv, endIds) {
    const history = conv?.flowState?.history || [];
    if (!history.length) return false;
    const last = history[history.length - 1];
    if (endIds.has(last)) return true;
    // Soft completion: the runtime cleared nodeId AND we hit at least one node.
    return conv?.flowState?.nodeId == null && endIds.size > 0
        ? // Only treat null-nodeId as completed if any end node was visited
          history.some((h) => endIds.has(h))
        : false;
}

/**
 * Compute per-node visit + drop-off counts and the overall completion rate.
 *
 * @param {object} params
 * @param {string|object} params.flowId   ChatFlow id (string or ObjectId).
 * @param {string|object} params.userId   The owning user (tenant scoping).
 * @param {string} [params.period]        '7d' | '30d' | '90d'. Default '30d'.
 * @param {string|object} [params.botId]  Optional bot scope.
 * @returns {Promise<object>}
 */
async function getFlowAnalytics({ flowId, userId, period = '30d', botId = null } = {}) {
    if (!flowId) throw new Error('flowId is required');
    if (!userId) throw new Error('userId is required');

    const flowOid = mongoose.Types.ObjectId.isValid(flowId)
        ? new mongoose.Types.ObjectId(flowId)
        : flowId;
    const userOid = mongoose.Types.ObjectId.isValid(userId)
        ? new mongoose.Types.ObjectId(userId)
        : userId;

    const start = periodStart(period);

    const flow = await ChatFlow.findOne({ _id: flowOid, userId: userOid }).lean();
    if (!flow) {
        return {
            flowId: String(flowId),
            period,
            totalRuns: 0,
            completedRuns: 0,
            completionRate: 0,
            avgNodesVisited: 0,
            perNode: [],
            startedAt: start.toISOString()
        };
    }

    const { byId, endIds, startId, nodes } = buildNodeIndex(flow);

    const match = {
        userId: userOid,
        'flowState.flowId': flowOid,
        startedAt: { $gte: start }
    };
    if (botId && mongoose.Types.ObjectId.isValid(botId)) {
        match.botId = new mongoose.Types.ObjectId(botId);
    }

    // We only need flowState fields for the analytics calc — keep the
    // projection slim so this scales for clients with thousands of convs.
    const convs = await Conversation.find(match)
        .select('flowState.history flowState.nodeId status')
        .lean();

    const totalRuns = convs.length;
    let completedRuns = 0;
    let totalNodesVisited = 0;

    // visit counts per node
    const visits = new Map();
    // conversations that visited this node AND eventually completed
    const completionsFromNode = new Map();

    convs.forEach((conv) => {
        const history = conv?.flowState?.history || [];
        if (!history.length) return;

        const completed = didComplete(conv, endIds);
        if (completed) completedRuns += 1;

        totalNodesVisited += history.length;

        // Use a Set for the visit bump so we don't double-count a node that a
        // conversation passed through twice in a loop.
        const seen = new Set(history);
        seen.forEach((nodeId) => {
            visits.set(nodeId, (visits.get(nodeId) || 0) + 1);
            if (completed) {
                completionsFromNode.set(
                    nodeId,
                    (completionsFromNode.get(nodeId) || 0) + 1
                );
            }
        });
    });

    // Build the per-node table — include every node from the flow definition
    // so the UI can render a row even for unreached nodes ("zero traffic").
    const perNode = nodes
        .filter((n) => n && n.id)
        .map((n) => {
            const v = visits.get(n.id) || 0;
            const cFrom = completionsFromNode.get(n.id) || 0;
            // Drop-off = visited but never completed. End nodes have 0 by
            // definition (visiting them IS completing).
            const dropOff = endIds.has(n.id) ? 0 : Math.max(0, v - cFrom);
            const dropOffRate = v > 0 ? Math.round((100 * dropOff) / v) : 0;
            return {
                nodeId: n.id,
                nodeType: n.type,
                title: n.title || '',
                isStart: n.id === startId,
                isEnd: endIds.has(n.id),
                visits: v,
                dropOffs: dropOff,
                dropOffRate,
                completionsFromHere: cFrom
            };
        })
        .sort((a, b) => b.visits - a.visits);

    return {
        flowId: String(flow._id),
        flowName: flow.name,
        period,
        startedAt: start.toISOString(),
        totalRuns,
        completedRuns,
        completionRate:
            totalRuns > 0 ? Math.round((100 * completedRuns) / totalRuns) : 0,
        avgNodesVisited:
            totalRuns > 0 ? Math.round((10 * totalNodesVisited) / totalRuns) / 10 : 0,
        perNode
    };
}

module.exports = {
    getFlowAnalytics,
    periodStart,
    PERIODS
};

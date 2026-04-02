/**
 * Phase 5.6: Flow runtime engine.
 * Pure-ish helpers that decide next node + what to render (text + buttons).
 */

function normalizeText(s) {
    return String(s || '').trim();
}

function safeRegex(pattern) {
    try {
        return new RegExp(pattern, 'i');
    } catch {
        return null;
    }
}

function findNode(flow, nodeId) {
    if (!flow || !Array.isArray(flow.nodes)) return null;
    return flow.nodes.find((n) => n.id === nodeId) || null;
}

function getStartNode(flow) {
    return findNode(flow, flow?.startNodeId);
}

/**
 * Evaluate a question node's conditions against visitor text + optional intent.
 */
function routeByConditions(node, visitorText, intent) {
    const text = normalizeText(visitorText).toLowerCase();
    for (const c of node.conditions || []) {
        if (!c || !c.match) continue;
        const v = normalizeText(c.value);
        if (c.match === 'contains' && v && text.includes(v.toLowerCase())) return c.nextNodeId;
        if (c.match === 'equals' && v && text === v.toLowerCase()) return c.nextNodeId;
        if (c.match === 'regex') {
            const re = safeRegex(v);
            if (re && re.test(text)) return c.nextNodeId;
        }
        if (c.match === 'intent' && intent && v && String(intent).toLowerCase() === v.toLowerCase()) return c.nextNodeId;
    }
    return node.fallbackNextNodeId || null;
}

/**
 * Handle visitor message when a flow is active.
 * Returns { replyText, buttons, nextNodeId, endFlow }.
 */
function handleFlowMessage({ flow, currentNodeId, visitorText, intent }) {
    const node = currentNodeId ? findNode(flow, currentNodeId) : getStartNode(flow);
    if (!node) return { endFlow: true };

    // If node has options and visitor clicked/typed one, attempt to match by label.
    const v = normalizeText(visitorText);
    if (node.options?.length) {
        const picked = node.options.find((o) => normalizeText(o.label).toLowerCase() === v.toLowerCase());
        if (picked?.nextNodeId) {
            const next = findNode(flow, picked.nextNodeId);
            if (!next) return { replyText: node.text || '', buttons: node.options, nextNodeId: node.id };
            return renderNode(flow, next.id);
        }
    }

    // question: route via conditions based on free-text
    if (node.type === 'question') {
        const nextNodeId = routeByConditions(node, visitorText, intent);
        if (nextNodeId) return renderNode(flow, nextNodeId);
        return { replyText: node.text || 'Tell me more.', buttons: node.options || [], nextNodeId: node.id };
    }

    // message/ai/end: render current node (do not advance unless user picks option)
    return renderNode(flow, node.id);
}

function renderNode(flow, nodeId) {
    const node = findNode(flow, nodeId);
    if (!node) return { endFlow: true };
    if (node.type === 'end') return { replyText: node.text || 'Done.', buttons: [], nextNodeId: null, endFlow: true };
    return {
        replyText: node.text || '',
        buttons: Array.isArray(node.options) ? node.options.map((o) => ({ label: o.label })) : [],
        nextNodeId: node.id,
        node
    };
}

module.exports = {
    findNode,
    getStartNode,
    handleFlowMessage,
    renderNode
};


/**
 * Chat Flow Runtime \u2014 enterprise state machine.
 *
 * Two entry points:
 *
 *   step({ flow, state, visitorText, intent, runtime })
 *     The new state-machine entry point. Returns
 *     { chunks, nextState, endFlow }. Use this for new code paths.
 *
 *   handleFlowMessage({ flow, currentNodeId, visitorText, intent })
 *     Backwards-compatible shim that calls step() under the hood and reshapes
 *     the result into the legacy { replyText, buttons, nextNodeId, endFlow, node }
 *     payload that the existing chatbotController already understands.
 *
 * Step lifecycle for one visitor turn:
 *
 *   1. Resolve `current node`. If state.nodeId is null \u2192 start node.
 *   2. CONSUME the visitor's message:
 *      a. If state.pendingCaptureVar is set \u2192 validate the input as a capture
 *         answer and either advance + write the variable, or stay + emit retry.
 *      b. Else if the current node has option buttons whose label matches the
 *         visitor text \u2192 advance via that option's nextNodeId.
 *      c. Else if the current node is a legacy `question` \u2192 route via conditions.
 *   3. RUN the loop:
 *      while currentNode is "non-blocking" (set_variable/branch/api/jump/delay/...)
 *         executor advance is { kind: 'auto', nextNodeId }
 *         apply state updates, append chunks, jump to nextNode.
 *      Stop when an executor returns { kind: 'wait' } or { kind: 'end' } or
 *      we hit MAX_STEPS as a safety bail-out.
 *   4. Return the accumulated chunks + the new flowState.
 */

const { runNode, consumeCaptureInput } = require('./nodeExecutors');
const { interpolate, buildSystemContext } = require('./variableInterpolator');

const MAX_STEPS_PER_TURN = 30;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function findNode(flow, nodeId) {
    if (!flow || !Array.isArray(flow.nodes)) return null;
    return flow.nodes.find((n) => n.id === nodeId) || null;
}

function getStartNode(flow) {
    return findNode(flow, flow?.startNodeId);
}

function normalizeText(s) {
    return String(s || '').trim();
}

function safeRegex(pattern) {
    try { return new RegExp(pattern, 'i'); } catch { return null; }
}

/**
 * Legacy `question` node routing: scan conditions[] in order, return matching
 * nextNodeId or fallbackNextNodeId.
 */
function routeByConditions(node, visitorText, intent) {
    const text = normalizeText(visitorText).toLowerCase();
    for (const c of node.conditions || []) {
        if (!c || !c.match) continue;
        const v = normalizeText(c.value);
        if (c.match === 'contains' && v && text.includes(v.toLowerCase())) return c.nextNodeId;
        if (c.match === 'equals'   && v && text === v.toLowerCase())     return c.nextNodeId;
        if (c.match === 'regex') {
            const re = safeRegex(v);
            if (re && re.test(text)) return c.nextNodeId;
        }
        if (c.match === 'intent' && intent && v && String(intent).toLowerCase() === v.toLowerCase()) {
            return c.nextNodeId;
        }
    }
    return node.fallbackNextNodeId || null;
}

/**
 * Match visitor text against a node's option buttons.
 * Returns the matched option's nextNodeId or null.
 */
function matchOptionLabel(node, visitorText) {
    if (!node?.options?.length || !visitorText) return null;
    const target = normalizeText(visitorText).toLowerCase();
    const opt = node.options.find((o) => normalizeText(o.label).toLowerCase() === target);
    return opt?.nextNodeId || null;
}

/**
 * Coerce a Mongoose Map/object into a plain Map for ergonomic mutation
 * during a step.
 */
function toMap(value) {
    if (value instanceof Map) return new Map(value);
    if (value && typeof value === 'object') return new Map(Object.entries(value));
    return new Map();
}

function mapToObject(m) {
    return m instanceof Map ? Object.fromEntries(m) : (m || {});
}

/**
 * Build the interpolation context handed to executors.
 */
function buildInterpContext(state, runtime) {
    return {
        vars: state.variables, // Map
        user: runtime.leadInfo || {},
        system: buildSystemContext({
            visitorId: runtime.visitorId,
            botId: runtime.botId,
            botName: runtime.botName,
            conversationId: runtime.conversationId
        }),
        api: state.apiResult || {},
        visitor: { text: runtime.visitorText || '' },
        resolveSecret: runtime.services?.getSecret || (async () => '')
    };
}

// ---------------------------------------------------------------------------
// Core step() \u2014 the new state-machine entry point.
// ---------------------------------------------------------------------------

/**
 * Execute one visitor turn against a flow.
 *
 * @param {object} params
 * @param {object} params.flow         the ChatFlow document.
 * @param {object} [params.state]      current flowState ({ nodeId, variables, retries, history, pendingCaptureVar }).
 * @param {string} [params.visitorText] visitor's latest message.
 * @param {string} [params.intent]     pre-classified intent (optional).
 * @param {object} [params.runtime]    side-channel runtime info:
 *     {
 *       visitorId, botId, botName, conversationId, leadInfo,
 *       services: { getSecret(name), runAI({ instructions, visitorText, node }) }
 *     }
 * @returns {Promise<{ chunks: object[], nextState: object, endFlow: boolean, lastNode: object|null }>}
 */
async function step({ flow, state, visitorText, intent, runtime } = {}) {
    if (!flow || !Array.isArray(flow.nodes) || flow.nodes.length === 0) {
        return { chunks: [], nextState: state || {}, endFlow: true, lastNode: null };
    }

    const initial = state || {};
    const localState = {
        nodeId: initial.nodeId || null,
        variables: toMap(initial.variables),
        retries: toMap(initial.retries),
        history: Array.isArray(initial.history) ? [...initial.history] : [],
        pendingCaptureVar: initial.pendingCaptureVar || null,
        apiResult: initial.apiResult || null
    };
    const rt = runtime || {};
    rt.visitorText = visitorText || '';
    rt.services = rt.services || {};

    let current = localState.nodeId
        ? findNode(flow, localState.nodeId)
        : getStartNode(flow);

    if (!current) {
        return { chunks: [], nextState: snapshotState(localState), endFlow: true, lastNode: null };
    }

    const chunks = [];
    let endFlow = false;
    let lastNode = current;

    // ----- 2. Consume visitor input ----------------------------------------

    if (localState.pendingCaptureVar && current.type === 'capture' && visitorText) {
        const interpCtx = buildInterpContext(localState, rt);
        const result = await consumeCaptureInput(current, visitorText, { interp: interpCtx });
        if (result.ok) {
            localState.variables.set(result.variableName, result.value);
            localState.pendingCaptureVar = null;
            localState.retries.delete(current.id);
            current = advanceFromExecutorAdvance(flow, result.advance);
        } else {
            const remaining = (localState.retries.get(current.id) ?? result.maxRetries) - 1;
            if (remaining < 0) {
                // give up: route to fallback or end
                localState.pendingCaptureVar = null;
                localState.retries.delete(current.id);
                current = result.fallbackNextNodeId
                    ? findNode(flow, result.fallbackNextNodeId)
                    : null;
                if (!current) {
                    return {
                        chunks: [{ type: 'text', text: result.retryText }],
                        nextState: snapshotState(localState),
                        endFlow: true,
                        lastNode: null
                    };
                }
            } else {
                localState.retries.set(current.id, remaining);
                return {
                    chunks: [{ type: 'text', text: result.retryText }],
                    nextState: snapshotState(localState),
                    endFlow: false,
                    lastNode: current
                };
            }
        }
    } else if (current && current.type === 'question' && visitorText) {
        const nextId = routeByConditions(current, visitorText, intent);
        if (nextId) current = findNode(flow, nextId);
    } else if (current && visitorText) {
        const nextId = matchOptionLabel(current, visitorText);
        if (nextId) current = findNode(flow, nextId);
    }

    // ----- 3. Run the auto-advance loop ------------------------------------

    let steps = 0;
    while (current && steps < MAX_STEPS_PER_TURN) {
        steps += 1;
        lastNode = current;
        if (!localState.history.includes(current.id)) {
            localState.history.push(current.id);
        }

        const interpCtx = buildInterpContext(localState, rt);
        const result = await runNode(current, { interp: interpCtx, services: rt.services, visitorText: rt.visitorText });

        if (result.chunks?.length) chunks.push(...result.chunks);
        applyStateUpdates(localState, result.stateUpdates);

        if (current.type === 'capture') {
            localState.pendingCaptureVar = current.capture?.variable || null;
        }

        if (result.advance.kind === 'wait') {
            localState.nodeId = current.id;
            return {
                chunks,
                nextState: snapshotState(localState),
                endFlow: false,
                lastNode
            };
        }
        if (result.advance.kind === 'end') {
            endFlow = true;
            current = null;
            break;
        }
        current = findNode(flow, result.advance.nextNodeId);
    }

    if (steps >= MAX_STEPS_PER_TURN && current) {
        chunks.push({
            type: 'error',
            text: 'Flow exceeded the per-turn step limit. Please simplify the flow or add a wait node.'
        });
        endFlow = true;
    }

    if (endFlow) {
        localState.nodeId = null;
        localState.pendingCaptureVar = null;
    }

    return {
        chunks,
        nextState: snapshotState(localState),
        endFlow,
        lastNode
    };
}

function advanceFromExecutorAdvance(flow, advance) {
    if (!advance) return null;
    if (advance.kind === 'end') return null;
    if (advance.kind === 'wait') return null;
    return findNode(flow, advance.nextNodeId);
}

function applyStateUpdates(state, updates) {
    if (!updates) return;
    if (updates.variables) {
        for (const [k, v] of Object.entries(updates.variables)) {
            state.variables.set(k, v);
        }
    }
    if (updates.retries) {
        for (const [k, v] of Object.entries(updates.retries)) {
            state.retries.set(k, v);
        }
    }
    if (typeof updates.pendingCaptureVar !== 'undefined') {
        state.pendingCaptureVar = updates.pendingCaptureVar;
    }
    if (typeof updates.apiResult !== 'undefined') {
        state.apiResult = updates.apiResult;
    }
}

function snapshotState(localState) {
    return {
        nodeId: localState.nodeId,
        variables: mapToObject(localState.variables),
        retries: mapToObject(localState.retries),
        history: localState.history.slice(),
        pendingCaptureVar: localState.pendingCaptureVar,
        apiResult: localState.apiResult || null
    };
}

// ---------------------------------------------------------------------------
// Backwards-compat shim
// ---------------------------------------------------------------------------

/**
 * Compatibility wrapper for the existing chatbotController.
 *
 * Old shape: { replyText, buttons, nextNodeId, endFlow, node }
 *
 * The new step() returns chunks + state. We aggregate text/ai chunks into
 * `replyText`, buttons-chunks into `buttons`, and pull `node` from `lastNode`.
 * AI nodes still surface here so the old controller continues to invoke
 * the chat service externally (preserves token-tracking, etc.).
 *
 * @param {object} params
 * @returns {Promise<{ replyText: string, buttons: object[], nextNodeId: string|null, endFlow: boolean, node: object|null }>}
 */
async function handleFlowMessage({ flow, currentNodeId, visitorText, intent }) {
    const result = await step({
        flow,
        state: { nodeId: currentNodeId },
        visitorText,
        intent,
        runtime: {}
    });

    let replyText = '';
    let buttons = [];
    for (const c of result.chunks) {
        if (c.type === 'text' || c.type === 'ai') {
            replyText += (replyText ? '\n' : '') + (c.text || '');
        } else if (c.type === 'buttons') {
            buttons = c.buttons || [];
        }
    }

    // The legacy controller specifically checks `out.node.type === 'ai'` to
    // run the chat service. Keep that hook working: if the lastNode is an AI
    // node and our executor returned a marker (we don't have an AI service
    // wired into this shim), surface the node so the caller can still take
    // the AI branch.
    return {
        replyText: replyText || result.lastNode?.text || '',
        buttons,
        nextNodeId: result.endFlow ? null : (result.nextState.nodeId || null),
        endFlow: result.endFlow,
        node: result.lastNode || null
    };
}

// ---------------------------------------------------------------------------
// Legacy helpers retained so other modules that already import them keep
// working without code changes.
// ---------------------------------------------------------------------------

function renderNode(flow, nodeId) {
    const node = findNode(flow, nodeId);
    if (!node) return { endFlow: true };
    if (node.type === 'end') {
        return { replyText: node.text || 'Done.', buttons: [], nextNodeId: null, endFlow: true };
    }
    return {
        replyText: node.text || '',
        buttons: Array.isArray(node.options) ? node.options.map((o) => ({ label: o.label })) : [],
        nextNodeId: node.id,
        node
    };
}

module.exports = {
    step,
    handleFlowMessage,
    findNode,
    getStartNode,
    renderNode,
    MAX_STEPS_PER_TURN
};

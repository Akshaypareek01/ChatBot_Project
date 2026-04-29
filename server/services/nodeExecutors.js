/**
 * Per-node-type executors for the chat flow runtime.
 *
 * Each executor receives a normalized context and returns:
 *
 *   {
 *     chunks:  Array<Chunk>            \u2014 user-visible output for this step
 *     advance: { kind: 'auto', nextNodeId: string }   continue the loop
 *            | { kind: 'wait' }                        pause for next visitor message
 *            | { kind: 'end' }                         flow finished
 *     stateUpdates?: { variables?: object, retries?: object, pendingCaptureVar?: string|null }
 *   }
 *
 * Chunk shapes (consumed by chatbotController + widget):
 *   { type: 'text',     text }
 *   { type: 'buttons',  buttons: [{ label, value? }] }
 *   { type: 'cards',    cards: [...] }
 *   { type: 'link',     url, label }
 *   { type: 'typing',   ms }
 *   { type: 'handoff',  team, message }
 *   { type: 'error',    text }
 *   { type: 'ai',       text }                    AI-generated response (post-run)
 *
 * Executors NEVER read from / write to the database directly. Side effects
 * (Conversation persistence, agent socket emission) happen in the controller
 * after the chunks are consumed.
 */

const { interpolate, interpolateAsync, interpolateDeepAsync } = require('./variableInterpolator');
const { query: jsonPathQuery } = require('./jsonPath');
const { validateOutboundUrl } = require('./ssrfGuard');
const axios = require('axios');

const MAX_RESPONSE_BYTES = 256 * 1024; // 256 KB \u2014 anything larger is rejected.

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function ensureMap(maybeMap) {
    if (maybeMap instanceof Map) return maybeMap;
    if (maybeMap && typeof maybeMap === 'object') return new Map(Object.entries(maybeMap));
    return new Map();
}

function nextOrEnd(nextNodeId) {
    return nextNodeId
        ? { kind: 'auto', nextNodeId }
        : { kind: 'end' };
}

function makeButtons(options) {
    if (!Array.isArray(options) || options.length === 0) return null;
    return {
        type: 'buttons',
        buttons: options
            .filter((o) => o && o.label)
            .map((o) => ({ label: String(o.label), id: o.id || null }))
    };
}

/**
 * Built-in validators for capture node `inputType`.
 * Returns true when `value` is acceptable.
 */
const INPUT_VALIDATORS = {
    text: () => true,
    email: (v) => /^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(v),
    phone: (v) => /^[+\d][\d\s().-]{5,}$/.test(v),
    number: (v) => /^-?\d+(\.\d+)?$/.test(v),
    date: (v) => !Number.isNaN(Date.parse(v)),
    url: (v) => {
        try { new URL(v); return true; } catch { return false; }
    }
};

// ---------------------------------------------------------------------------
// Executors
// ---------------------------------------------------------------------------

/** message: emit text + optional buttons. Auto-advance only when no buttons. */
async function executeMessage(node, ctx) {
    const text = await interpolateAsync(node.text || '', ctx.interp);
    const chunks = [];
    if (text) chunks.push({ type: 'text', text });
    const buttonsChunk = makeButtons(node.options);
    if (buttonsChunk) chunks.push(buttonsChunk);
    if (buttonsChunk) {
        return { chunks, advance: { kind: 'wait' } };
    }
    return { chunks, advance: nextOrEnd(node.fallbackNextNodeId) };
}

/** capture: prompt visitor, then on next turn run validation. */
async function executeCapture(node, ctx) {
    const cfg = node.capture || {};
    const promptText = await interpolateAsync(node.text || '', ctx.interp);
    const chunks = promptText ? [{ type: 'text', text: promptText }] : [];
    return {
        chunks,
        advance: { kind: 'wait' },
        stateUpdates: { pendingCaptureVar: cfg.variable || null }
    };
}

/** Validate a visitor reply against a capture node. Called by the runtime, not the loop. */
async function consumeCaptureInput(node, visitorText, ctx) {
    const cfg = node.capture || {};
    const value = String(visitorText || '').trim();
    const typeOk = (INPUT_VALIDATORS[cfg.inputType] || INPUT_VALIDATORS.text)(value);
    let regexOk = true;
    if (cfg.validation && cfg.validation.regex) {
        try { regexOk = new RegExp(cfg.validation.regex).test(value); }
        catch { regexOk = false; }
    }
    if (typeOk && regexOk && value.length > 0) {
        return {
            ok: true,
            variableName: cfg.variable,
            value,
            advance: nextOrEnd(cfg.nextNodeId)
        };
    }
    const retryMsg = await interpolateAsync(
        cfg.retryMessage || cfg.validation?.errorMessage || 'That did not look right \u2014 could you try again?',
        ctx.interp
    );
    return {
        ok: false,
        retryText: retryMsg,
        fallbackNextNodeId: cfg.fallbackNextNodeId || null,
        maxRetries: cfg.retryCount ?? 2
    };
}

/** branch: pick next node by evaluating conditions against vars. Non-rendering. */
async function executeBranch(node, ctx) {
    const cfg = node.branch || {};
    const vars = ctx.interp.vars instanceof Map
        ? Object.fromEntries(ctx.interp.vars)
        : (ctx.interp.vars || {});

    for (const cond of cfg.conditions || []) {
        const lhs = vars[cond.variable];
        const rhsRaw = cond.value || '';
        const rhs = await interpolateAsync(rhsRaw, ctx.interp);
        if (matchOp(cond.op, lhs, rhs)) {
            return { chunks: [], advance: nextOrEnd(cond.nextNodeId) };
        }
    }
    return { chunks: [], advance: nextOrEnd(cfg.fallbackNextNodeId) };
}

function matchOp(op, lhs, rhs) {
    const left = lhs == null ? '' : String(lhs);
    const right = rhs == null ? '' : String(rhs);
    switch (op) {
        case 'eq':       return left === right;
        case 'neq':      return left !== right;
        case 'gt':       return Number(left) > Number(right);
        case 'lt':       return Number(left) < Number(right);
        case 'contains': return left.toLowerCase().includes(right.toLowerCase());
        case 'exists':   return lhs != null && left.length > 0;
        case 'regex': {
            try { return new RegExp(right).test(left); }
            catch { return false; }
        }
        default: return false;
    }
}

/** set_variable: assign + auto-advance. */
async function executeSetVariable(node, ctx) {
    const cfg = node.setVariable || {};
    const name = cfg.variable;
    if (!name) return { chunks: [], advance: nextOrEnd(cfg.nextNodeId) };
    const value = await interpolateAsync(cfg.value || '', ctx.interp);
    return {
        chunks: [],
        advance: nextOrEnd(cfg.nextNodeId),
        stateUpdates: { variables: { [name]: value } }
    };
}

/** delay: emit typing indicator, auto-advance. */
async function executeDelay(node) {
    const cfg = node.delay || {};
    const ms = Math.max(0, Math.min(15000, Number(cfg.ms) || 1000));
    const chunks = cfg.typingIndicator !== false ? [{ type: 'typing', ms }] : [];
    return { chunks, advance: nextOrEnd(cfg.nextNodeId) };
}

/** jump: non-rendering jump to another node. */
async function executeJump(node) {
    const cfg = node.jump || {};
    return { chunks: [], advance: nextOrEnd(cfg.nextNodeId) };
}

/** end: terminate flow with optional farewell. */
async function executeEnd(node, ctx) {
    const text = await interpolateAsync(node.text || '', ctx.interp);
    return {
        chunks: text ? [{ type: 'text', text }] : [],
        advance: { kind: 'end' }
    };
}

/** cards: render a card carousel. Stays for visitor click unless fallback. */
async function executeCards(node, ctx) {
    const cards = await Promise.all(
        (node.cards || []).map(async (c) => ({
            id: c.id,
            imageUrl: c.imageUrl || '',
            title: await interpolateAsync(c.title || '', ctx.interp),
            subtitle: await interpolateAsync(c.subtitle || '', ctx.interp),
            buttons: (c.buttons || []).map((b) => ({
                id: b.id,
                label: b.label,
                kind: b.kind || 'postback',
                url: b.url || '',
                nextNodeId: b.nextNodeId || null
            }))
        }))
    );
    return {
        chunks: [{ type: 'cards', cards }],
        advance: { kind: 'wait' }
    };
}

/** handoff: signal escalation. Controller flips Conversation.status='escalated'. */
async function executeHandoff(node, ctx) {
    const cfg = node.handoff || {};
    const message = await interpolateAsync(
        cfg.message || node.text || 'Connecting you with a human agent\u2026',
        ctx.interp
    );
    return {
        chunks: [
            { type: 'handoff', team: cfg.team || 'support', message }
        ],
        advance: { kind: 'wait' }
    };
}

/** ai: invoke the AI service via the injected callback, emit response. */
async function executeAi(node, ctx) {
    if (!ctx.services?.runAI) {
        return {
            chunks: [{ type: 'error', text: 'AI executor not configured.' }],
            advance: nextOrEnd(node.fallbackNextNodeId)
        };
    }
    const instructions = await interpolateAsync(node.aiInstructions || '', ctx.interp);
    const visitorText = ctx.visitorText || '';
    let aiText = '';
    try {
        aiText = await ctx.services.runAI({
            instructions,
            visitorText,
            node
        });
    } catch (e) {
        return {
            chunks: [{ type: 'error', text: 'AI is unavailable. Please try again.' }],
            advance: nextOrEnd(node.fallbackNextNodeId)
        };
    }
    const chunks = aiText ? [{ type: 'ai', text: aiText }] : [];
    const buttonsChunk = makeButtons(node.options);
    if (buttonsChunk) {
        chunks.push(buttonsChunk);
        return { chunks, advance: { kind: 'wait' } };
    }
    return { chunks, advance: nextOrEnd(node.fallbackNextNodeId) };
}

// ---------------------------------------------------------------------------
// API action executor (the heaviest one)
// ---------------------------------------------------------------------------

async function buildAuthHeaders(authType, authSecretRef, authHeaderName, getSecret) {
    if (!authType || authType === 'none' || !authSecretRef) return {};
    let secretValue = '';
    try {
        secretValue = await getSecret(authSecretRef);
    } catch {
        return { __authError: `Secret "${authSecretRef}" not found in vault` };
    }
    if (!secretValue) return { __authError: `Secret "${authSecretRef}" is empty` };

    switch (authType) {
        case 'bearer':
            return { Authorization: `Bearer ${secretValue}` };
        case 'apiKey':
            return { [authHeaderName || 'X-API-Key']: secretValue };
        case 'basic':
            return { Authorization: `Basic ${Buffer.from(secretValue).toString('base64')}` };
        default:
            return {};
    }
}

async function executeApiAction(node, ctx) {
    const cfg = node.apiAction || {};
    const onError = (text, apiOutcome) => ({
        chunks: text ? [{ type: 'error', text }] : [],
        advance: nextOrEnd(cfg.onErrorNodeId),
        stateUpdates: { apiResult: apiOutcome }
    });

    // Test-sandbox short-circuit: when ctx.services.mockApi is provided we
    // skip SSRF validation, axios, and secrets entirely and use the stubbed
    // response. This is opt-in (only the dry-run tester wires it).
    if (typeof ctx.services?.mockApi === 'function') {
        const stub = ctx.services.mockApi(node.id) || {};
        const ok = stub.ok !== false && (stub.statusCode == null || (stub.statusCode >= 200 && stub.statusCode < 300));
        const apiResult = {
            ok,
            statusCode: stub.statusCode || (ok ? 200 : 500),
            data: stub.data ?? {},
            error: ok ? '' : (stub.error || 'mock_error')
        };
        const variableUpdates = {};
        if (ok && Array.isArray(cfg.responseMap)) {
            for (const m of cfg.responseMap) {
                if (!m?.variable || !m?.jsonPath) continue;
                const v = jsonPathQuery(apiResult.data, m.jsonPath);
                if (v !== undefined) variableUpdates[m.variable] = v;
            }
        }
        return {
            chunks: [{ type: 'typing', ms: 200 }],
            advance: nextOrEnd(ok ? cfg.onSuccessNodeId : cfg.onErrorNodeId),
            stateUpdates: { variables: variableUpdates, apiResult }
        };
    }

    const url = await interpolateAsync(cfg.url || '', ctx.interp);
    if (!url) return onError('API node is missing a URL.', { ok: false, error: 'missing_url' });

    const validation = await validateOutboundUrl(url);
    if (!validation.ok) {
        return onError(`Blocked: ${validation.reason}`, {
            ok: false, error: 'blocked', reason: validation.reason
        });
    }

    const headerEntries = await Promise.all(
        (cfg.headers || []).map(async (h) => [
            h.key,
            await interpolateAsync(h.value || '', ctx.interp)
        ])
    );
    const headers = Object.fromEntries(headerEntries.filter(([k]) => !!k));

    const authHeaders = await buildAuthHeaders(
        cfg.authType,
        cfg.authSecretRef,
        cfg.authHeaderName,
        ctx.services.getSecret
    );
    if (authHeaders.__authError) {
        return onError(authHeaders.__authError, { ok: false, error: 'auth' });
    }
    Object.assign(headers, authHeaders);

    let body;
    if (cfg.body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(cfg.method)) {
        const bodyStr = await interpolateAsync(cfg.body, ctx.interp);
        try {
            body = JSON.parse(bodyStr);
            if (!headers['Content-Type'] && !headers['content-type']) {
                headers['Content-Type'] = 'application/json';
            }
        } catch {
            body = bodyStr;
        }
    }

    const typingChunk = { type: 'typing', ms: 1200 };
    let response;
    try {
        response = await axios.request({
            method: cfg.method || 'GET',
            url,
            headers,
            data: body,
            timeout: Math.max(500, Math.min(30000, Number(cfg.timeoutMs) || 8000)),
            maxContentLength: MAX_RESPONSE_BYTES,
            maxBodyLength: MAX_RESPONSE_BYTES,
            validateStatus: () => true
        });
    } catch (e) {
        return {
            chunks: [typingChunk, { type: 'error', text: 'API request failed.' }],
            advance: nextOrEnd(cfg.onErrorNodeId),
            stateUpdates: { apiResult: { ok: false, error: e.code || e.message } }
        };
    }

    const statusOk = response.status >= 200 && response.status < 300;
    const apiResult = {
        ok: statusOk,
        statusCode: response.status,
        data: response.data,
        error: statusOk ? '' : `HTTP ${response.status}`
    };

    const variableUpdates = {};
    if (statusOk && Array.isArray(cfg.responseMap)) {
        for (const m of cfg.responseMap) {
            if (!m?.variable || !m?.jsonPath) continue;
            const v = jsonPathQuery(response.data, m.jsonPath);
            if (v !== undefined) variableUpdates[m.variable] = v;
        }
    }

    return {
        chunks: [typingChunk],
        advance: nextOrEnd(statusOk ? cfg.onSuccessNodeId : cfg.onErrorNodeId),
        stateUpdates: { variables: variableUpdates, apiResult }
    };
}

// ---------------------------------------------------------------------------
// Trigger / legacy question \u2014 these are entry points handled at the runtime
// level, not within the loop. We still register them so unknown-type errors
// don't fire.
// ---------------------------------------------------------------------------

async function executeTrigger(node) {
    const cfg = node.trigger || {};
    return { chunks: [], advance: nextOrEnd(cfg.nextNodeId) };
}

/** Legacy `question` node \u2014 emit prompt + options, wait for visitor input. */
async function executeQuestion(node, ctx) {
    const text = await interpolateAsync(node.text || '', ctx.interp);
    const chunks = text ? [{ type: 'text', text }] : [];
    const buttonsChunk = makeButtons(node.options);
    if (buttonsChunk) chunks.push(buttonsChunk);
    return { chunks, advance: { kind: 'wait' } };
}

// ---------------------------------------------------------------------------
// Dispatch table
// ---------------------------------------------------------------------------

const EXECUTORS = {
    message: executeMessage,
    question: executeQuestion,
    capture: executeCapture,
    branch: executeBranch,
    set_variable: executeSetVariable,
    action_api: executeApiAction,
    action_handoff: executeHandoff,
    cards: executeCards,
    delay: executeDelay,
    jump: executeJump,
    ai: executeAi,
    end: executeEnd,
    trigger: executeTrigger
};

/**
 * Run a single node. Returns the executor's result, or a fallback that
 * gracefully ends the flow when the type is unknown.
 *
 * @param {object} node
 * @param {object} ctx
 * @returns {Promise<object>} executor result.
 */
async function runNode(node, ctx) {
    const fn = EXECUTORS[node.type];
    if (!fn) {
        return {
            chunks: [{ type: 'error', text: `Unsupported node type: ${node.type}` }],
            advance: { kind: 'end' }
        };
    }
    return fn(node, ctx);
}

module.exports = {
    runNode,
    consumeCaptureInput,
    INPUT_VALIDATORS,
    matchOp,
    ensureMap,
    interpolate,
    interpolateAsync,
    interpolateDeepAsync
};

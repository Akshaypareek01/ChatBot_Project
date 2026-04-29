/**
 * Variable interpolator for flow runtime.
 *
 * Replaces `{{namespace.path}}` placeholders inside any user-provided string
 * (message text, API URL/headers/body, branch values, etc.) with values from
 * a runtime context.
 *
 * Supported namespaces (resolved in this order):
 *
 *   {{vars.<name>}}          flow variables collected so far
 *                            (Conversation.flowState.variables)
 *
 *   {{secret.<name>}}        decrypted secret from the per-client vault
 *                            (resolved via secretsVault.service.getSecretValue)
 *                            ASYNC ONLY \u2014 use interpolateAsync.
 *
 *   {{user.<field>}}         end-user lead info (email, phone, name) from
 *                            Conversation.leadInfo
 *
 *   {{system.<field>}}       runtime metadata: visitorId, botId, conversationId,
 *                            now (ISO date), today (YYYY-MM-DD), botName
 *
 *   {{api.<field>}}          last API call's outcome:
 *                              statusCode, ok, error,
 *                              data.<jsonPath...> (raw response body)
 *
 *   {{visitor.text}}         the most recent visitor message
 *
 * Unknown placeholders resolve to an empty string (logged in dev). This is
 * intentional \u2014 we never leak the literal `{{...}}` to end-users.
 *
 * Path resolution supports dotted keys and `[idx]` array access:
 *   {{api.data.orders[0].id}}    \u2192 ctx.api.data.orders[0].id
 *
 * Performance: a single regex pass per string, no per-placeholder allocations
 * beyond what is strictly required.
 */

const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z_][\w.\[\]\-]*)\s*\}\}/g;

/**
 * @typedef {object} InterpContext
 * @property {Record<string, any>} [vars]      flow variables (plain object or Map flattened)
 * @property {Record<string, any>} [user]      lead info: email/phone/name
 * @property {Record<string, any>} [system]    runtime metadata
 * @property {Record<string, any>} [api]       last API outcome
 * @property {Record<string, any>} [visitor]   last visitor message etc.
 * @property {(name: string) => Promise<string>} [resolveSecret]  async secret resolver
 */

/**
 * Walk a dotted path with optional `[index]` segments.
 *
 * @param {any} root
 * @param {string} path - e.g. "data.orders[0].id"
 * @returns {any} value or undefined.
 */
function readPath(root, path) {
    if (root == null) return undefined;
    if (!path) return root;
    let cur = root;
    const parts = path.split('.');
    for (const part of parts) {
        if (cur == null) return undefined;
        const arrayMatch = part.match(/^([^\[]+)((?:\[\d+\])+)$/);
        if (arrayMatch) {
            const key = arrayMatch[1];
            cur = cur instanceof Map ? cur.get(key) : cur[key];
            const indices = arrayMatch[2].match(/\[(\d+)\]/g) || [];
            for (const idxStr of indices) {
                if (cur == null) return undefined;
                const idx = parseInt(idxStr.slice(1, -1), 10);
                cur = cur[idx];
            }
        } else {
            cur = cur instanceof Map ? cur.get(part) : cur[part];
        }
    }
    return cur;
}

/**
 * Stringify a resolved value for substitution. Objects/arrays become JSON.
 * null/undefined become empty string.
 *
 * @param {any} v
 * @returns {string}
 */
function stringify(v) {
    if (v == null) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    try {
        return JSON.stringify(v);
    } catch {
        return String(v);
    }
}

/**
 * Resolve a single placeholder synchronously. Returns undefined if the
 * placeholder needs an async lookup (e.g. secrets) so the async pipeline
 * can take over.
 *
 * @param {string} placeholder - e.g. "vars.email" or "system.now"
 * @param {InterpContext} ctx
 * @returns {string|undefined}
 */
function resolveSync(placeholder, ctx) {
    const dotIdx = placeholder.indexOf('.');
    const ns = dotIdx === -1 ? placeholder : placeholder.slice(0, dotIdx);
    const rest = dotIdx === -1 ? '' : placeholder.slice(dotIdx + 1);

    switch (ns) {
        case 'vars': {
            const source = ctx.vars instanceof Map
                ? Object.fromEntries(ctx.vars)
                : ctx.vars || {};
            return stringify(readPath(source, rest));
        }
        case 'user':
            return stringify(readPath(ctx.user || {}, rest));
        case 'system':
            return stringify(readPath(ctx.system || {}, rest));
        case 'api':
            return stringify(readPath(ctx.api || {}, rest));
        case 'visitor':
            return stringify(readPath(ctx.visitor || {}, rest));
        case 'secret':
            return undefined; // requires async resolver
        default:
            return '';
    }
}

/**
 * Interpolate placeholders in a string. Sync version \u2014 secrets resolve to ''.
 * Use this for paths that never reference {{secret.*}} (e.g. message bodies
 * meant for the visitor, branch comparison values).
 *
 * @param {string} input
 * @param {InterpContext} ctx
 * @returns {string}
 */
function interpolate(input, ctx) {
    if (typeof input !== 'string' || input.length === 0) return input || '';
    return input.replace(PLACEHOLDER_RE, (_, key) => {
        const v = resolveSync(key, ctx || {});
        return v === undefined ? '' : v;
    });
}

/**
 * Async interpolation. Resolves {{secret.x}} via ctx.resolveSecret(name).
 *
 * @param {string} input
 * @param {InterpContext} ctx
 * @returns {Promise<string>}
 */
async function interpolateAsync(input, ctx) {
    if (typeof input !== 'string' || input.length === 0) return input || '';
    const placeholders = [];
    input.replace(PLACEHOLDER_RE, (_, key, offset) => {
        placeholders.push({ key, offset, len: _.length });
        return '';
    });
    if (placeholders.length === 0) return input;

    const ctxSafe = ctx || {};
    const resolveSecretFn = typeof ctxSafe.resolveSecret === 'function'
        ? ctxSafe.resolveSecret
        : null;

    const resolved = await Promise.all(
        placeholders.map(async ({ key }) => {
            const sync = resolveSync(key, ctxSafe);
            if (sync !== undefined) return sync;
            // async path: secrets only
            if (key.startsWith('secret.')) {
                if (!resolveSecretFn) return '';
                const name = key.slice('secret.'.length);
                try {
                    const value = await resolveSecretFn(name);
                    return value || '';
                } catch {
                    return '';
                }
            }
            return '';
        })
    );

    let out = '';
    let cursor = 0;
    for (let i = 0; i < placeholders.length; i++) {
        const { offset, len } = placeholders[i];
        out += input.slice(cursor, offset) + resolved[i];
        cursor = offset + len;
    }
    out += input.slice(cursor);
    return out;
}

/**
 * Interpolate every value of an object recursively. Keys are NOT interpolated.
 * Used for HTTP headers, JSON bodies, etc.
 *
 * @param {any} value
 * @param {InterpContext} ctx
 * @returns {Promise<any>}
 */
async function interpolateDeepAsync(value, ctx) {
    if (typeof value === 'string') return interpolateAsync(value, ctx);
    if (Array.isArray(value)) {
        return Promise.all(value.map((v) => interpolateDeepAsync(v, ctx)));
    }
    if (value && typeof value === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(value)) {
            out[k] = await interpolateDeepAsync(v, ctx);
        }
        return out;
    }
    return value;
}

/**
 * Build a `system` namespace bag from a few standard runtime inputs.
 *
 * @param {{ visitorId?: string, botId?: string, botName?: string, conversationId?: string }} input
 * @returns {Record<string, any>}
 */
function buildSystemContext(input = {}) {
    const now = new Date();
    return {
        now: now.toISOString(),
        today: now.toISOString().slice(0, 10),
        visitorId: input.visitorId || '',
        botId: input.botId || '',
        botName: input.botName || '',
        conversationId: input.conversationId || ''
    };
}

module.exports = {
    interpolate,
    interpolateAsync,
    interpolateDeepAsync,
    buildSystemContext,
    readPath,
    PLACEHOLDER_RE
};

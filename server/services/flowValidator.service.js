/**
 * Flow validator (graph linter).
 *
 * Returns a structured report of errors and warnings without executing the flow.
 * Used by:
 *   - the builder UI before save / publish
 *   - the backend on POST /flows/:id/validate
 *   - the publish endpoint as a hard gate (errors > 0 \u2192 block publish)
 *
 * Severity:
 *   error    \u2014 the flow will not work correctly. Blocks publish.
 *   warning  \u2014 the flow runs but is fragile. Surfaces in UI but does not block.
 *
 * Issue codes (stable identifiers for UI translation):
 *   E001 missing_start_node
 *   E002 duplicate_node_id
 *   E003 broken_reference            (nextNodeId points to a node that doesn't exist)
 *   E004 missing_required_field
 *   E005 unknown_node_type
 *   E006 invalid_branch_op           (unknown operator)
 *   E007 invalid_regex
 *   E008 invalid_url                 (literal URL is malformed or hits SSRF deny-list)
 *   E009 unsupported_method
 *   E010 capture_without_variable
 *   E011 jump_target_missing
 *   W001 orphan_node                 (unreachable from start)
 *   W002 undefined_variable_reference  ({{vars.x}} but x is never captured/declared)
 *   W003 ai_without_instructions
 *   W004 cards_without_buttons
 *   W005 dead_end_branch             (branch has no fallback and not all conditions terminate)
 *   W006 cycle_without_exit          (path can loop without ever reaching `end`)
 *   W007 missing_handoff_team
 *   W008 secret_reference_unknown    ({{secret.x}} but x is not in the user's vault)
 */

const { PLACEHOLDER_RE } = require('./variableInterpolator');
const { isPrivateIPv4, FORBIDDEN_HOSTS } = require('./ssrfGuard');
const net = require('net');

const VALID_NODE_TYPES = new Set([
    'message', 'question', 'ai', 'end',
    'capture', 'branch', 'set_variable',
    'action_api', 'action_email', 'action_slack', 'action_handoff',
    'cards', 'delay', 'jump', 'trigger'
]);

const VALID_BRANCH_OPS = new Set(['eq', 'neq', 'gt', 'lt', 'contains', 'exists', 'regex']);
const VALID_HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * @typedef {object} Issue
 * @property {'error'|'warning'} severity
 * @property {string} code             - stable code (e.g. "E003")
 * @property {string} message          - human-readable message.
 * @property {string} [nodeId]         - node where the issue lives.
 * @property {string} [path]           - dot-path inside the node (e.g. "apiAction.url").
 */

/**
 * Lint a flow document and return a structured report.
 *
 * @param {object} flow            - { nodes: [...], startNodeId, variables: [...] }.
 * @param {object} [opts]
 * @param {Set<string>} [opts.knownSecretNames]   - vault entries owned by the user (for W008).
 * @returns {{ ok: boolean, errors: Issue[], warnings: Issue[] }}
 */
function validateFlow(flow, opts = {}) {
    const errors = [];
    const warnings = [];
    const knownSecrets = opts.knownSecretNames instanceof Set
        ? opts.knownSecretNames
        : new Set();

    const nodes = Array.isArray(flow?.nodes) ? flow.nodes : [];
    const nodeMap = new Map();
    const seenIds = new Set();

    for (const n of nodes) {
        if (!n?.id) {
            errors.push({ severity: 'error', code: 'E004', message: 'Node is missing an id', nodeId: undefined });
            continue;
        }
        if (seenIds.has(n.id)) {
            errors.push({ severity: 'error', code: 'E002', message: `Duplicate node id "${n.id}"`, nodeId: n.id });
            continue;
        }
        seenIds.add(n.id);
        nodeMap.set(n.id, n);
        if (!VALID_NODE_TYPES.has(n.type)) {
            errors.push({ severity: 'error', code: 'E005', message: `Unknown node type "${n.type}"`, nodeId: n.id });
        }
    }

    if (!flow?.startNodeId || !nodeMap.has(flow.startNodeId)) {
        errors.push({
            severity: 'error',
            code: 'E001',
            message: flow?.startNodeId
                ? `startNodeId "${flow.startNodeId}" does not exist`
                : 'startNodeId is required',
            nodeId: flow?.startNodeId || undefined
        });
    }

    // Collect declared / captured variable names (used for W002).
    const definedVars = new Set();
    for (const v of flow?.variables || []) {
        if (v?.name) definedVars.add(v.name);
    }
    for (const n of nodes) {
        if (n.type === 'capture' && n.capture?.variable) definedVars.add(n.capture.variable);
        if (n.type === 'set_variable' && n.setVariable?.variable) definedVars.add(n.setVariable.variable);
        if (n.type === 'action_api' && Array.isArray(n.apiAction?.responseMap)) {
            for (const m of n.apiAction.responseMap) if (m?.variable) definedVars.add(m.variable);
        }
    }

    // Per-node validation.
    for (const n of nodes) {
        validateReferences(n, nodeMap, errors);
        validateNodeConfig(n, errors, warnings);
        validatePlaceholders(n, definedVars, knownSecrets, warnings);
    }

    // Reachability (W001).
    if (flow?.startNodeId && nodeMap.has(flow.startNodeId)) {
        const reachable = computeReachability(flow.startNodeId, nodeMap);
        for (const n of nodes) {
            if (!reachable.has(n.id)) {
                warnings.push({
                    severity: 'warning',
                    code: 'W001',
                    message: `Node "${n.id}" is unreachable from startNodeId`,
                    nodeId: n.id
                });
            }
        }
        // W006: every path should be able to reach an `end` node OR a wait state.
        // We approximate: warn if there's a strongly-connected component of more
        // than one node with no outgoing edge that escapes the SCC. Cheap check:
        // any node that only points back into its own ancestor chain.
        detectCyclesWithoutExit(flow.startNodeId, nodeMap, warnings);
    }

    return {
        ok: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Push errors for any nextNodeId / branch / option / card target that points
 * to a missing node.
 */
function validateReferences(node, nodeMap, errors) {
    const checks = [];
    const push = (path, target) => { if (target) checks.push({ path, target }); };

    push('fallbackNextNodeId', node.fallbackNextNodeId);
    (node.options || []).forEach((o, i) => push(`options[${i}].nextNodeId`, o.nextNodeId));
    (node.conditions || []).forEach((c, i) => push(`conditions[${i}].nextNodeId`, c.nextNodeId));

    if (node.capture) {
        push('capture.nextNodeId', node.capture.nextNodeId);
        push('capture.fallbackNextNodeId', node.capture.fallbackNextNodeId);
    }
    if (node.apiAction) {
        push('apiAction.onSuccessNodeId', node.apiAction.onSuccessNodeId);
        push('apiAction.onErrorNodeId', node.apiAction.onErrorNodeId);
    }
    if (node.branch) {
        (node.branch.conditions || []).forEach((c, i) =>
            push(`branch.conditions[${i}].nextNodeId`, c.nextNodeId)
        );
        push('branch.fallbackNextNodeId', node.branch.fallbackNextNodeId);
    }
    if (node.handoff) push('handoff.fallbackNextNodeId', node.handoff.fallbackNextNodeId);
    if (node.delay) push('delay.nextNodeId', node.delay.nextNodeId);
    if (node.jump) push('jump.nextNodeId', node.jump.nextNodeId);
    if (node.setVariable) push('setVariable.nextNodeId', node.setVariable.nextNodeId);
    if (node.trigger) push('trigger.nextNodeId', node.trigger.nextNodeId);
    if (Array.isArray(node.cards)) {
        node.cards.forEach((c, i) => {
            (c.buttons || []).forEach((b, j) =>
                push(`cards[${i}].buttons[${j}].nextNodeId`, b.nextNodeId)
            );
        });
    }

    for (const { path, target } of checks) {
        if (!nodeMap.has(target)) {
            errors.push({
                severity: 'error',
                code: 'E003',
                message: `Node "${node.id}" references missing node "${target}"`,
                nodeId: node.id,
                path
            });
        }
    }
}

/**
 * Validate per-type config constraints. Every node type gets its bespoke checks.
 */
function validateNodeConfig(node, errors, warnings) {
    switch (node.type) {
        case 'capture':
            if (!node.capture?.variable) {
                errors.push({
                    severity: 'error', code: 'E010',
                    message: `Capture node "${node.id}" must define capture.variable`,
                    nodeId: node.id, path: 'capture.variable'
                });
            }
            if (node.capture?.validation?.regex) {
                try { new RegExp(node.capture.validation.regex); }
                catch {
                    errors.push({
                        severity: 'error', code: 'E007',
                        message: `Capture node "${node.id}" has an invalid validation regex`,
                        nodeId: node.id, path: 'capture.validation.regex'
                    });
                }
            }
            break;

        case 'branch':
            if (!Array.isArray(node.branch?.conditions) || node.branch.conditions.length === 0) {
                errors.push({
                    severity: 'error', code: 'E004',
                    message: `Branch node "${node.id}" needs at least one condition`,
                    nodeId: node.id, path: 'branch.conditions'
                });
            }
            (node.branch?.conditions || []).forEach((c, i) => {
                if (!VALID_BRANCH_OPS.has(c.op)) {
                    errors.push({
                        severity: 'error', code: 'E006',
                        message: `Branch op "${c.op}" is not supported`,
                        nodeId: node.id, path: `branch.conditions[${i}].op`
                    });
                }
                if (c.op === 'regex') {
                    try { new RegExp(c.value || ''); }
                    catch {
                        errors.push({
                            severity: 'error', code: 'E007',
                            message: `Branch condition has invalid regex`,
                            nodeId: node.id, path: `branch.conditions[${i}].value`
                        });
                    }
                }
            });
            if (!node.branch?.fallbackNextNodeId) {
                warnings.push({
                    severity: 'warning', code: 'W005',
                    message: `Branch "${node.id}" has no fallbackNextNodeId; visitors may get stuck if no condition matches`,
                    nodeId: node.id, path: 'branch.fallbackNextNodeId'
                });
            }
            break;

        case 'action_api': {
            const cfg = node.apiAction || {};
            if (!cfg.url) {
                errors.push({
                    severity: 'error', code: 'E004',
                    message: `API node "${node.id}" must have a url`,
                    nodeId: node.id, path: 'apiAction.url'
                });
            } else if (!cfg.url.includes('{{')) {
                // literal URL: hard SSRF check + URL validity
                try {
                    const u = new URL(cfg.url);
                    if (!['http:', 'https:'].includes(u.protocol)) {
                        errors.push({
                            severity: 'error', code: 'E008',
                            message: `API node "${node.id}" uses unsupported scheme "${u.protocol}"`,
                            nodeId: node.id, path: 'apiAction.url'
                        });
                    }
                    const host = u.hostname.toLowerCase();
                    const isPrivate = FORBIDDEN_HOSTS.has(host)
                        || host.endsWith('.local')
                        || host.endsWith('.localhost')
                        || (net.isIPv4(host) && isPrivateIPv4(host));
                    if (isPrivate) {
                        errors.push({
                            severity: 'error', code: 'E008',
                            message: `API node "${node.id}" points to a blocked host "${host}"`,
                            nodeId: node.id, path: 'apiAction.url'
                        });
                    }
                } catch {
                    errors.push({
                        severity: 'error', code: 'E008',
                        message: `API node "${node.id}" url is malformed`,
                        nodeId: node.id, path: 'apiAction.url'
                    });
                }
            }
            if (cfg.method && !VALID_HTTP_METHODS.has(cfg.method)) {
                errors.push({
                    severity: 'error', code: 'E009',
                    message: `API node "${node.id}" uses unsupported method "${cfg.method}"`,
                    nodeId: node.id, path: 'apiAction.method'
                });
            }
            break;
        }

        case 'jump':
            if (!node.jump?.nextNodeId) {
                errors.push({
                    severity: 'error', code: 'E011',
                    message: `Jump node "${node.id}" must define jump.nextNodeId`,
                    nodeId: node.id, path: 'jump.nextNodeId'
                });
            }
            break;

        case 'set_variable':
            if (!node.setVariable?.variable) {
                errors.push({
                    severity: 'error', code: 'E004',
                    message: `Set-variable node "${node.id}" must define setVariable.variable`,
                    nodeId: node.id, path: 'setVariable.variable'
                });
            }
            break;

        case 'ai':
            if (!node.aiInstructions) {
                warnings.push({
                    severity: 'warning', code: 'W003',
                    message: `AI node "${node.id}" has no instructions; it will use a generic prompt`,
                    nodeId: node.id, path: 'aiInstructions'
                });
            }
            break;

        case 'cards':
            if (!Array.isArray(node.cards) || node.cards.length === 0) {
                errors.push({
                    severity: 'error', code: 'E004',
                    message: `Cards node "${node.id}" must have at least one card`,
                    nodeId: node.id, path: 'cards'
                });
            }
            (node.cards || []).forEach((c, i) => {
                if (!Array.isArray(c.buttons) || c.buttons.length === 0) {
                    warnings.push({
                        severity: 'warning', code: 'W004',
                        message: `Card ${i} in node "${node.id}" has no buttons; visitors can't progress from it`,
                        nodeId: node.id, path: `cards[${i}].buttons`
                    });
                }
            });
            break;

        case 'action_handoff':
            if (!node.handoff?.team) {
                warnings.push({
                    severity: 'warning', code: 'W007',
                    message: `Handoff node "${node.id}" has no team set; routing will use the default queue`,
                    nodeId: node.id, path: 'handoff.team'
                });
            }
            break;

        default:
            break;
    }
}

/**
 * Walk every user-provided string in a node looking for `{{namespace.x}}`
 * placeholders. Warn on:
 *   - {{vars.x}} where x is not declared / captured anywhere in the flow
 *   - {{secret.x}} where x is not present in the user's vault (best-effort)
 */
function validatePlaceholders(node, definedVars, knownSecrets, warnings) {
    const candidateStrings = [];
    const collect = (obj) => {
        if (typeof obj === 'string') {
            candidateStrings.push(obj);
        } else if (Array.isArray(obj)) {
            obj.forEach(collect);
        } else if (obj && typeof obj === 'object') {
            for (const v of Object.values(obj)) collect(v);
        }
    };
    collect(node.text);
    collect(node.aiInstructions);
    collect(node.capture);
    collect(node.apiAction);
    collect(node.branch);
    collect(node.cards);
    collect(node.handoff);
    collect(node.setVariable);

    const re = new RegExp(PLACEHOLDER_RE.source, 'g');
    for (const s of candidateStrings) {
        let m;
        while ((m = re.exec(s)) !== null) {
            const key = m[1];
            if (key.startsWith('vars.')) {
                const name = key.slice('vars.'.length).split(/[\.\[]/)[0];
                if (!definedVars.has(name)) {
                    warnings.push({
                        severity: 'warning', code: 'W002',
                        message: `Reference to undeclared variable "${name}" \u2014 capture or declare it before use`,
                        nodeId: node.id
                    });
                }
            } else if (key.startsWith('secret.')) {
                const name = key.slice('secret.'.length).split(/[\.\[]/)[0];
                if (knownSecrets.size > 0 && !knownSecrets.has(name)) {
                    warnings.push({
                        severity: 'warning', code: 'W008',
                        message: `Reference to unknown secret "${name}" \u2014 add it to your Secrets vault`,
                        nodeId: node.id
                    });
                }
            }
        }
    }
}

function computeReachability(startId, nodeMap) {
    const seen = new Set();
    const stack = [startId];
    while (stack.length) {
        const id = stack.pop();
        if (seen.has(id) || !nodeMap.has(id)) continue;
        seen.add(id);
        const n = nodeMap.get(id);
        for (const target of outgoingTargets(n)) {
            if (target) stack.push(target);
        }
    }
    return seen;
}

function outgoingTargets(node) {
    const out = [];
    out.push(node.fallbackNextNodeId);
    (node.options || []).forEach((o) => out.push(o.nextNodeId));
    (node.conditions || []).forEach((c) => out.push(c.nextNodeId));
    if (node.capture) out.push(node.capture.nextNodeId, node.capture.fallbackNextNodeId);
    if (node.apiAction) out.push(node.apiAction.onSuccessNodeId, node.apiAction.onErrorNodeId);
    if (node.branch) {
        (node.branch.conditions || []).forEach((c) => out.push(c.nextNodeId));
        out.push(node.branch.fallbackNextNodeId);
    }
    if (node.handoff) out.push(node.handoff.fallbackNextNodeId);
    if (node.delay) out.push(node.delay.nextNodeId);
    if (node.jump) out.push(node.jump.nextNodeId);
    if (node.setVariable) out.push(node.setVariable.nextNodeId);
    if (node.trigger) out.push(node.trigger.nextNodeId);
    if (Array.isArray(node.cards)) {
        node.cards.forEach((c) => (c.buttons || []).forEach((b) => out.push(b.nextNodeId)));
    }
    return out.filter(Boolean);
}

/**
 * Lightweight cycle-without-exit detector.
 *
 * For each node, check whether all outgoing paths can ever reach an `end` node
 * or a `wait` state (capture / message-with-options / cards / handoff / ai).
 * If a node can only reach itself or other looping nodes \u2192 warn.
 */
function detectCyclesWithoutExit(startId, nodeMap, warnings) {
    const memo = new Map(); // nodeId -> bool (canEscape)
    const stack = new Set();

    function canEscape(id) {
        if (!nodeMap.has(id)) return false;
        if (memo.has(id)) return memo.get(id);
        if (stack.has(id)) return false; // currently exploring \u2014 treat as no-escape
        stack.add(id);
        const n = nodeMap.get(id);
        const isWait = ['end', 'capture', 'cards', 'action_handoff'].includes(n.type)
            || (n.type === 'message' && Array.isArray(n.options) && n.options.length > 0)
            || (n.type === 'ai');
        if (isWait || n.type === 'end') {
            memo.set(id, true);
            stack.delete(id);
            return true;
        }
        const targets = outgoingTargets(n);
        if (targets.length === 0) {
            memo.set(id, false);
            stack.delete(id);
            return false;
        }
        const escapes = targets.some(canEscape);
        memo.set(id, escapes);
        stack.delete(id);
        return escapes;
    }

    for (const [id] of nodeMap) {
        if (!canEscape(id)) {
            warnings.push({
                severity: 'warning', code: 'W006',
                message: `Path through "${id}" cannot reach an end / wait node \u2014 visitors may loop forever`,
                nodeId: id
            });
        }
    }
}

module.exports = {
    validateFlow,
    VALID_NODE_TYPES,
    VALID_BRANCH_OPS,
    VALID_HTTP_METHODS
};

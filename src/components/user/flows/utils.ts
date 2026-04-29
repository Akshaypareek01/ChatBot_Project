/**
 * Flow document helpers: id generation, empty-node factories per type, and
 * normalization from arbitrary backend payloads back into a strict
 * FlowDocument we can render. Keep this file pure (no React) so it stays
 * trivially testable.
 */

import {
    ApiActionConfig,
    BranchConfig,
    CaptureConfig,
    CardsNode,
    DelayConfig,
    FlowDocument,
    FlowNode,
    FlowNodeType,
    FlowOption,
    HandoffConfig,
    JumpConfig,
    SetVariableConfig,
    TriggerConfig,
} from './types';

export const uid = (prefix = 'n') =>
    `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

export const prettyJson = (obj: unknown) => JSON.stringify(obj, null, 2);

// ---------------------------------------------------------------------------
// Default sub-config blocks (one per node type that has extra config).
// ---------------------------------------------------------------------------

const defaultCapture = (): CaptureConfig => ({
    variable: '',
    inputType: 'text',
    validation: { regex: '', errorMessage: '' },
    retryCount: 2,
    retryMessage: 'Sorry, that didn\u2019t look right. Could you try again?',
    fallbackNextNodeId: '',
    nextNodeId: '',
});

const defaultBranch = (): BranchConfig => ({
    conditions: [],
    fallbackNextNodeId: '',
});

const defaultApiAction = (): ApiActionConfig => ({
    method: 'GET',
    url: '',
    headers: [],
    body: '',
    authType: 'none',
    authSecretRef: '',
    authHeaderName: 'Authorization',
    responseMap: [],
    timeoutMs: 8000,
    onSuccessNodeId: '',
    onErrorNodeId: '',
});

const defaultHandoff = (): HandoffConfig => ({
    team: 'support',
    message: 'Connecting you with a human agent now…',
    fallbackNextNodeId: '',
});

const defaultDelay = (): DelayConfig => ({
    ms: 800,
    typingIndicator: true,
    nextNodeId: '',
});

const defaultJump = (): JumpConfig => ({ nextNodeId: '' });

const defaultSetVariable = (): SetVariableConfig => ({
    variable: '',
    value: '',
    nextNodeId: '',
});

const defaultTrigger = (): TriggerConfig => ({
    matchType: 'firstMessage',
    keywords: [],
    intent: '',
    nextNodeId: '',
});

const defaultCard = (): CardsNode['cards'] => [
    {
        id: uid('card'),
        title: 'Card title',
        subtitle: '',
        imageUrl: '',
        buttons: [],
    },
];

// ---------------------------------------------------------------------------
// Empty-node factory \u2014 returns a FlowNode with sensible defaults for the
// requested type. The runtime tolerates empty strings everywhere.
// ---------------------------------------------------------------------------

export const createEmptyNode = (type: FlowNodeType, id?: string): FlowNode => {
    const base = {
        id: id || uid(type),
        title: defaultTitleFor(type),
        text: defaultTextFor(type),
        position: {
            x: 80 + Math.random() * 320,
            y: 80 + Math.random() * 240,
        },
    };

    switch (type) {
        case 'message':
            return { ...base, type };
        case 'question':
            return { ...base, type, options: [] };
        case 'ai':
            return { ...base, type, aiInstructions: '' };
        case 'end':
            return { ...base, type };
        case 'capture':
            return { ...base, type, capture: defaultCapture() };
        case 'branch':
            return { ...base, type, branch: defaultBranch() };
        case 'set_variable':
            return { ...base, type, setVariable: defaultSetVariable() };
        case 'action_api':
            return { ...base, type, apiAction: defaultApiAction() };
        case 'action_handoff':
            return { ...base, type, handoff: defaultHandoff() };
        case 'cards':
            return { ...base, type, cards: defaultCard() };
        case 'delay':
            return { ...base, type, delay: defaultDelay() };
        case 'jump':
            return { ...base, type, jump: defaultJump() };
        case 'trigger':
            return { ...base, type, trigger: defaultTrigger() };
    }
};

const defaultTitleFor = (type: FlowNodeType): string => {
    switch (type) {
        case 'message':        return 'Message';
        case 'question':       return 'Quick question';
        case 'ai':             return 'AI reply';
        case 'end':            return 'End';
        case 'capture':        return 'Capture input';
        case 'branch':         return 'Branch';
        case 'set_variable':   return 'Set variable';
        case 'action_api':     return 'Call API';
        case 'action_handoff': return 'Talk to a human';
        case 'cards':          return 'Cards';
        case 'delay':          return 'Pause';
        case 'jump':           return 'Jump';
        case 'trigger':        return 'Trigger';
    }
};

const defaultTextFor = (type: FlowNodeType): string => {
    switch (type) {
        case 'message':        return 'Hi! How can I help today?';
        case 'question':       return 'What would you like to do?';
        case 'ai':             return '';
        case 'end':            return 'Thanks for chatting \u2014 take care!';
        case 'capture':        return 'Could you share that with me?';
        case 'action_handoff': return 'Connecting you with a human agent\u2026';
        case 'cards':          return '';
        default:               return '';
    }
};

// ---------------------------------------------------------------------------
// Empty flow + normalize.
// ---------------------------------------------------------------------------

export const createEmptyFlow = (): FlowDocument => {
    const start = createEmptyNode('message', 'start');
    return {
        startNodeId: start.id,
        isActive: false,
        nodes: [{ ...start, title: 'Welcome', text: 'Hi! How can I help today?' }],
        variables: [],
    };
};

const sanitizeOption = (o: any): FlowOption => ({
    id: String(o?.id || uid('opt')),
    label: String(o?.label || ''),
    nextNodeId: o?.nextNodeId ? String(o.nextNodeId) : '',
});

/**
 * Coerce arbitrary backend payload into a strict FlowDocument. Missing
 * sub-configs are filled with defaults so the per-type forms can edit them
 * without null-checks.
 */
export const normalizeFlow = (raw: any): FlowDocument => {
    const rawNodes = Array.isArray(raw?.nodes) ? raw.nodes : [];
    const safeNodes: FlowNode[] = rawNodes.map((n: any) => {
        const type = (n?.type || 'message') as FlowNodeType;
        const empty = createEmptyNode(type, String(n?.id || uid(type)));
        const merged: any = {
            ...empty,
            id: String(n?.id || empty.id),
            title: n?.title ?? empty.title,
            text: n?.text ?? empty.text,
            aiInstructions: n?.aiInstructions ?? '',
            options: Array.isArray(n?.options) ? n.options.map(sanitizeOption) : [],
            conditions: Array.isArray(n?.conditions) ? n.conditions : [],
            fallbackNextNodeId: n?.fallbackNextNodeId
                ? String(n.fallbackNextNodeId)
                : '',
            // Position filled in after the full node array is built;
            // set a sentinel so autoLayoutFlow can overwrite it when needed.
            position: n?.position || null,
        };

        // copy through type-specific config blobs
        if (type === 'capture')        merged.capture       = { ...defaultCapture(), ...(n?.capture || {}) };
        if (type === 'branch')         merged.branch        = { ...defaultBranch(), ...(n?.branch || {}) };
        if (type === 'set_variable')   merged.setVariable   = { ...defaultSetVariable(), ...(n?.setVariable || {}) };
        if (type === 'action_api')     merged.apiAction     = { ...defaultApiAction(), ...(n?.apiAction || {}) };
        if (type === 'action_handoff') merged.handoff       = { ...defaultHandoff(), ...(n?.handoff || {}) };
        if (type === 'cards')          merged.cards         = Array.isArray(n?.cards) ? n.cards : defaultCard();
        if (type === 'delay')          merged.delay         = { ...defaultDelay(), ...(n?.delay || {}) };
        if (type === 'jump')           merged.jump          = { ...defaultJump(), ...(n?.jump || {}) };
        if (type === 'trigger')        merged.trigger       = { ...defaultTrigger(), ...(n?.trigger || {}) };

        return merged as FlowNode;
    });

    const rawNodes2 = safeNodes.length ? safeNodes : createEmptyFlow().nodes;
    const startNodeId = raw?.startNodeId || rawNodes2[0]?.id || 'start';

    // Run BFS auto-layout when:
    //   (a) any node is missing a position (template just cloned), OR
    //   (b) all nodes share the same position (saved while piled up)
    const positioned = rawNodes2.filter((n) => n.position);
    const allSamePos =
        positioned.length > 1 &&
        positioned.every(
            (n) =>
                n.position!.x === positioned[0].position!.x &&
                n.position!.y === positioned[0].position!.y
        );
    const needsLayout = rawNodes2.some((n) => !n.position) || allSamePos;
    const nodes = needsLayout
        ? autoLayoutFlow(rawNodes2 as FlowNode[], startNodeId)
        : (rawNodes2 as FlowNode[]);

    const variables = Array.isArray(raw?.variables)
        ? raw.variables.map((v: any) => ({
              name: String(v?.name || ''),
              defaultValue: v?.defaultValue ?? '',
              scope: v?.scope || 'flow',
              description: v?.description || '',
          }))
        : [];

    return {
        startNodeId,
        isActive: !!raw?.isActive,
        nodes,
        variables,
    };
};

// ---------------------------------------------------------------------------
// Auto-layout: BFS top-down positioning when nodes lack explicit positions.
// ---------------------------------------------------------------------------

const LAYOUT_W = 280;
const LAYOUT_H = 100;
const H_GAP    = 80;
const V_GAP    = 110;

/** Extract all direct successor IDs from any node type. */
function getSuccessorIds(n: FlowNode): string[] {
    const raw = n as any;
    const ids: string[] = [];

    if (Array.isArray(raw.options))
        raw.options.forEach((o: any) => o?.nextNodeId && ids.push(o.nextNodeId));
    if (raw.fallbackNextNodeId)             ids.push(raw.fallbackNextNodeId);
    if (raw.capture?.nextNodeId)            ids.push(raw.capture.nextNodeId);
    if (raw.capture?.fallbackNextNodeId)    ids.push(raw.capture.fallbackNextNodeId);
    if (Array.isArray(raw.branch?.conditions))
        raw.branch.conditions.forEach((c: any) => c?.nextNodeId && ids.push(c.nextNodeId));
    if (raw.branch?.fallbackNextNodeId)     ids.push(raw.branch.fallbackNextNodeId);
    if (raw.setVariable?.nextNodeId)        ids.push(raw.setVariable.nextNodeId);
    if (raw.apiAction?.onSuccessNodeId)     ids.push(raw.apiAction.onSuccessNodeId);
    if (raw.apiAction?.onErrorNodeId)       ids.push(raw.apiAction.onErrorNodeId);
    if (raw.handoff?.fallbackNextNodeId)    ids.push(raw.handoff.fallbackNextNodeId);
    if (raw.delay?.nextNodeId)              ids.push(raw.delay.nextNodeId);
    if (raw.jump?.nextNodeId)               ids.push(raw.jump.nextNodeId);
    if (raw.trigger?.nextNodeId)            ids.push(raw.trigger.nextNodeId);
    if (raw.aiConfig?.nextNodeId)           ids.push(raw.aiConfig.nextNodeId);
    if (Array.isArray(raw.cards))
        raw.cards.forEach((c: any) =>
            Array.isArray(c?.buttons) &&
            c.buttons.forEach((b: any) => b?.nextNodeId && ids.push(b.nextNodeId))
        );

    return [...new Set(ids.filter(Boolean))];
}

/**
 * Assigns x/y positions via BFS from `startNodeId` so nodes flow top-to-bottom
 * with branches spread horizontally. Used when nodes come from templates or
 * the backend without saved canvas positions.
 */
export function autoLayoutFlow(nodes: FlowNode[], startNodeId: string): FlowNode[] {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const levelMap = new Map<string, number>();

    const queue: string[] = [startNodeId];
    levelMap.set(startNodeId, 0);
    const visited = new Set<string>();

    while (queue.length) {
        const id = queue.shift()!;
        if (visited.has(id)) continue;
        visited.add(id);
        const node = nodeMap.get(id);
        if (!node) continue;
        const level = levelMap.get(id) ?? 0;
        for (const succId of getSuccessorIds(node)) {
            if (!levelMap.has(succId)) levelMap.set(succId, level + 1);
            if (!visited.has(succId)) queue.push(succId);
        }
    }

    // Orphaned nodes placed after reachable ones
    let orphanLevel = levelMap.size
        ? Math.max(...Array.from(levelMap.values())) + 1
        : 0;
    nodes.forEach((n) => {
        if (!levelMap.has(n.id)) levelMap.set(n.id, orphanLevel++);
    });

    const byLevel = new Map<number, string[]>();
    levelMap.forEach((lvl, id) => {
        if (!byLevel.has(lvl)) byLevel.set(lvl, []);
        byLevel.get(lvl)!.push(id);
    });

    const posMap = new Map<string, { x: number; y: number }>();
    Array.from(byLevel.keys())
        .sort((a, b) => a - b)
        .forEach((lvl) => {
            const ids = byLevel.get(lvl)!;
            const totalW = ids.length * LAYOUT_W + (ids.length - 1) * H_GAP;
            const startX = 400 - totalW / 2;
            const y = 80 + lvl * (LAYOUT_H + V_GAP);
            ids.forEach((id, i) => {
                posMap.set(id, { x: startX + i * (LAYOUT_W + H_GAP), y });
            });
        });

    return nodes.map((n) => ({
        ...n,
        position: posMap.get(n.id) ?? { x: 80, y: 80 },
    }));
}

/**
 * Walks every node and pulls out variable names that are written-to (capture,
 * set_variable, api response maps). Used by VariablesPanel to surface the
 * implicit vocabulary even when the author hasn\u2019t added anything to
 * `variables[]`.
 */
export const extractWrittenVariables = (flow: FlowDocument): string[] => {
    const out = new Set<string>();
    flow.nodes.forEach((n) => {
        if (n.type === 'capture' && n.capture?.variable) out.add(n.capture.variable);
        if (n.type === 'set_variable' && n.setVariable?.variable) out.add(n.setVariable.variable);
        if (n.type === 'action_api' && Array.isArray(n.apiAction?.responseMap)) {
            n.apiAction!.responseMap!.forEach((r) => r.variable && out.add(r.variable));
        }
    });
    return Array.from(out).sort();
};

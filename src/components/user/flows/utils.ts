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
    const safeNodes: FlowNode[] = rawNodes.map((n: any, idx: number) => {
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
            position: n?.position || {
                x: 120 + idx * 220,
                y: 120 + (idx % 4) * 160,
            },
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

    const nodes = safeNodes.length ? safeNodes : createEmptyFlow().nodes;
    const startNodeId = raw?.startNodeId || nodes[0]?.id || 'start';

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

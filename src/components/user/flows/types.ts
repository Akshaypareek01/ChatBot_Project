/**
 * Frontend types for the Enterprise Flow Builder.
 *
 * Mirrors the Mongoose schema in server/models/ChatFlow.js. Kept as a
 * discriminated union by `type` so the per-type config forms get full
 * compile-time safety when they narrow.
 *
 * Conventions:
 *   - All node ids are strings (matches the backend, never ObjectId).
 *   - All "next" fields are nullable strings; empty string means "unset".
 *   - The backend stores numbers (timeouts, retries) as plain numbers; the
 *     UI converts on focus/blur.
 */

// ---------------------------------------------------------------------------
// Node-type catalogue (must match server/models/ChatFlow.js NODE_TYPES).
// ---------------------------------------------------------------------------

export type FlowNodeType =
    | 'message'
    | 'question'
    | 'ai'
    | 'end'
    | 'capture'
    | 'branch'
    | 'set_variable'
    | 'action_api'
    | 'action_handoff'
    | 'cards'
    | 'delay'
    | 'jump'
    | 'trigger';

export type FlowNodeCategory = 'conversation' | 'logic' | 'action' | 'trigger';

// ---------------------------------------------------------------------------
// Per-type config blocks (match backend sub-schemas exactly).
// ---------------------------------------------------------------------------

export type FlowOption = {
    id: string;
    label: string;
    nextNodeId?: string | null;
};

export type FlowCondition = {
    match: 'contains' | 'equals' | 'regex' | 'intent';
    value: string;
    nextNodeId: string;
};

export type CaptureConfig = {
    variable: string;
    inputType: 'text' | 'email' | 'phone' | 'number' | 'date' | 'url';
    validation?: { regex?: string; errorMessage?: string };
    retryCount?: number;
    retryMessage?: string;
    fallbackNextNodeId?: string | null;
    nextNodeId?: string | null;
};

export type ApiHeader = { key: string; value: string };
export type ApiResponseMapEntry = { variable: string; jsonPath: string };

export type ApiActionConfig = {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    url: string;
    headers?: ApiHeader[];
    body?: string;
    authType: 'none' | 'bearer' | 'apiKey' | 'basic';
    authSecretRef?: string;
    authHeaderName?: string;
    responseMap?: ApiResponseMapEntry[];
    timeoutMs?: number;
    onSuccessNodeId?: string | null;
    onErrorNodeId?: string | null;
};

export type BranchCondition = {
    variable: string;
    op: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'exists' | 'regex';
    value: string;
    nextNodeId: string;
};

export type BranchConfig = {
    conditions: BranchCondition[];
    fallbackNextNodeId?: string | null;
};

export type CardButton = {
    id: string;
    label: string;
    kind: 'postback' | 'url' | 'call_api';
    url?: string;
    nextNodeId?: string | null;
    apiActionRef?: string | null;
};

export type FlowCard = {
    id: string;
    imageUrl?: string;
    title?: string;
    subtitle?: string;
    buttons?: CardButton[];
};

export type HandoffConfig = {
    team: string;
    message?: string;
    fallbackNextNodeId?: string | null;
};

export type DelayConfig = {
    ms: number;
    typingIndicator?: boolean;
    nextNodeId?: string | null;
};

export type JumpConfig = { nextNodeId: string };

export type TriggerConfig = {
    matchType: 'firstMessage' | 'keyword' | 'intent';
    keywords?: string[];
    intent?: string;
    nextNodeId?: string | null;
};

export type SetVariableConfig = {
    variable: string;
    value: string;
    nextNodeId?: string | null;
};

// ---------------------------------------------------------------------------
// FlowNode discriminated union (one variant per type).
// ---------------------------------------------------------------------------

interface FlowNodeBase {
    id: string;
    title?: string;
    text?: string;
    aiInstructions?: string;
    options?: FlowOption[];
    conditions?: FlowCondition[];
    fallbackNextNodeId?: string | null;
    position?: { x: number; y: number };
}

export type MessageNode      = FlowNodeBase & { type: 'message' };
export type QuestionNode     = FlowNodeBase & { type: 'question' };
export type AiNode           = FlowNodeBase & { type: 'ai' };
export type EndNode          = FlowNodeBase & { type: 'end' };
export type CaptureNode      = FlowNodeBase & { type: 'capture'; capture?: CaptureConfig };
export type BranchNode       = FlowNodeBase & { type: 'branch'; branch?: BranchConfig };
export type SetVariableNode  = FlowNodeBase & { type: 'set_variable'; setVariable?: SetVariableConfig };
export type ApiActionNode    = FlowNodeBase & { type: 'action_api'; apiAction?: ApiActionConfig };
export type HandoffNode      = FlowNodeBase & { type: 'action_handoff'; handoff?: HandoffConfig };
export type CardsNode        = FlowNodeBase & { type: 'cards'; cards?: FlowCard[] };
export type DelayNode        = FlowNodeBase & { type: 'delay'; delay?: DelayConfig };
export type JumpNode         = FlowNodeBase & { type: 'jump'; jump?: JumpConfig };
export type TriggerNode      = FlowNodeBase & { type: 'trigger'; trigger?: TriggerConfig };

export type FlowNode =
    | MessageNode
    | QuestionNode
    | AiNode
    | EndNode
    | CaptureNode
    | BranchNode
    | SetVariableNode
    | ApiActionNode
    | HandoffNode
    | CardsNode
    | DelayNode
    | JumpNode
    | TriggerNode;

// ---------------------------------------------------------------------------
// Flow document / lifecycle.
// ---------------------------------------------------------------------------

export type FlowVariable = {
    name: string;
    defaultValue?: string;
    scope?: 'flow' | 'session' | 'user';
    description?: string;
};

export type FlowStatus = 'draft' | 'published' | 'archived';

export type FlowDocument = {
    startNodeId: string;
    isActive: boolean;
    nodes: FlowNode[];
    variables?: FlowVariable[];
};

export type FlowSummary = {
    _id: string;
    name: string;
    isActive: boolean;
    status?: FlowStatus;
    publishedAt?: string | null;
    publishedVersion?: number;
    updatedAt?: string;
};

// ---------------------------------------------------------------------------
// Validation + Test result shapes (match server/services/flowValidator and
// server/services/flowTester).
// ---------------------------------------------------------------------------

export type ValidationIssue = {
    severity: 'error' | 'warning';
    code: string;
    message: string;
    nodeId?: string;
    path?: string;
};

export type ValidationReport = {
    ok: boolean;
    errors: ValidationIssue[];
    warnings: ValidationIssue[];
    stage?: 'draft' | 'published';
    nodeCount?: number;
    startNodeId?: string;
};

export type TestChunk =
    | { type: 'text'; text: string }
    | { type: 'ai'; text: string }
    | { type: 'buttons'; buttons: Array<{ label: string; id?: string | null }> }
    | { type: 'cards'; cards: FlowCard[] }
    | { type: 'link'; url: string; label?: string }
    | { type: 'typing'; ms: number }
    | { type: 'handoff'; team: string; message: string }
    | { type: 'error'; text: string };

export type TestTurn = {
    visitor: string | null;
    chunks: TestChunk[];
    replyText: string[];
    buttons: Array<{ label: string; id?: string | null }>;
    cards: FlowCard[];
    state: any;
    endFlow: boolean;
    lastNodeId: string | null;
    lastNodeType: FlowNodeType | null;
};

export type TestRunResult = {
    transcript: TestTurn[];
    finalState: any;
    endedAt: number | null;
    stage?: 'draft' | 'published';
    mode?: 'mock' | 'live';
};

// ---------------------------------------------------------------------------
// Templates (summary) + Secrets (vault entries).
// ---------------------------------------------------------------------------

export type TemplateSummary = {
    id: string;
    name: string;
    description: string;
    category: string;
    nodeTypes: FlowNodeType[];
    nodeCount: number;
    usesSecrets: boolean;
    usesApi: boolean;
};

export type SecretRecord = {
    _id: string;
    name: string;
    description?: string;
    maskedHint?: string;
    lastUsedAt?: string | null;
    lastRotatedAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
};

// ---------------------------------------------------------------------------
// Per-flow runtime analytics (matches server/services/flowAnalytics.service).
// ---------------------------------------------------------------------------

export type FlowAnalyticsNodeRow = {
    nodeId: string;
    nodeType: FlowNodeType;
    title?: string;
    isStart: boolean;
    isEnd: boolean;
    visits: number;
    dropOffs: number;
    dropOffRate: number;
    completionsFromHere: number;
};

export type FlowAnalyticsResult = {
    flowId: string;
    flowName?: string;
    period: '7d' | '30d' | '90d';
    startedAt: string;
    totalRuns: number;
    completedRuns: number;
    completionRate: number;
    avgNodesVisited: number;
    perNode: FlowAnalyticsNodeRow[];
};

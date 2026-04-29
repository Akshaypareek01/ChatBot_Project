/**
 * Chat Flow schema — Enterprise Flow Builder.
 *
 * Backwards compatible with the original 4-type flow model (`message`/`question`/`ai`/`end`).
 * Existing flows keep working untouched; new node types are additive.
 *
 * Node-type catalogue:
 *   message       - send text + optional buttons
 *   question      - free-text routing via conditions[] (legacy; superseded by capture+branch)
 *   capture       - prompt visitor for input, validate, store in flowState.variables
 *   ai            - LLM-grounded reply, optional KB context
 *   branch        - condition-based routing on a flowState variable
 *   set_variable  - assign a literal/interpolated value to a variable
 *   action_api    - outbound HTTP call (auth via Secrets Vault), JSONPath responseMap
 *   action_email  - send transactional email (via existing email.service)
 *   action_slack  - notify a Slack/webhook channel
 *   action_handoff- escalate to a live agent (sets Conversation.status='escalated')
 *   cards         - rich card carousel with mixed buttons (postback / url / call_api)
 *   delay         - "typing..." / wait
 *   jump          - non-rendering jump to another node (loops, "back to menu")
 *   trigger       - flow entry-point matcher (firstMessage / keyword / intent)
 *   end           - terminate flow, hand back to default AI on next visitor turn
 */

const mongoose = require('mongoose');

// ---------------------------------------------------------------------------
// Sub-schemas (per-node config blocks). All are { _id: false } — the parent
// node carries the stable string id.
// ---------------------------------------------------------------------------

const optionSchema = new mongoose.Schema({
    id: { type: String, required: true },
    label: { type: String, required: true },
    nextNodeId: { type: String, default: null }
}, { _id: false });

const conditionSchema = new mongoose.Schema({
    match: { type: String, enum: ['contains', 'equals', 'regex', 'intent'], required: true },
    value: { type: String, required: true },
    nextNodeId: { type: String, required: true }
}, { _id: false });

const captureConfigSchema = new mongoose.Schema({
    variable: { type: String, required: true },
    inputType: {
        type: String,
        enum: ['text', 'email', 'phone', 'number', 'date', 'url'],
        default: 'text'
    },
    validation: {
        regex: { type: String, default: '' },
        errorMessage: { type: String, default: '' }
    },
    retryCount: { type: Number, default: 2, min: 0, max: 5 },
    retryMessage: { type: String, default: '' },
    fallbackNextNodeId: { type: String, default: null },
    nextNodeId: { type: String, default: null }
}, { _id: false });

const apiHeaderSchema = new mongoose.Schema({
    key: { type: String, required: true },
    value: { type: String, default: '' }
}, { _id: false });

const apiResponseMapEntrySchema = new mongoose.Schema({
    variable: { type: String, required: true },
    jsonPath: { type: String, required: true }
}, { _id: false });

const apiActionConfigSchema = new mongoose.Schema({
    method: {
        type: String,
        enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        default: 'GET'
    },
    url: { type: String, default: '' },
    headers: { type: [apiHeaderSchema], default: [] },
    body: { type: String, default: '' }, // raw JSON string, supports {{vars.x}}
    authType: {
        type: String,
        enum: ['none', 'bearer', 'apiKey', 'basic'],
        default: 'none'
    },
    authSecretRef: { type: String, default: '' }, // Secret.name in vault
    authHeaderName: { type: String, default: '' }, // for apiKey: header name to set
    responseMap: { type: [apiResponseMapEntrySchema], default: [] },
    timeoutMs: { type: Number, default: 8000, min: 500, max: 30000 },
    onSuccessNodeId: { type: String, default: null },
    onErrorNodeId: { type: String, default: null }
}, { _id: false });

const branchConditionSchema = new mongoose.Schema({
    variable: { type: String, required: true },
    op: {
        type: String,
        enum: ['eq', 'neq', 'gt', 'lt', 'contains', 'exists', 'regex'],
        default: 'eq'
    },
    value: { type: String, default: '' },
    nextNodeId: { type: String, required: true }
}, { _id: false });

const branchConfigSchema = new mongoose.Schema({
    conditions: { type: [branchConditionSchema], default: [] },
    fallbackNextNodeId: { type: String, default: null }
}, { _id: false });

const cardButtonSchema = new mongoose.Schema({
    id: { type: String, required: true },
    label: { type: String, required: true },
    kind: {
        type: String,
        enum: ['postback', 'url', 'call_api'],
        default: 'postback'
    },
    url: { type: String, default: '' },
    nextNodeId: { type: String, default: null },
    apiActionRef: { type: String, default: null }
}, { _id: false });

const cardSchema = new mongoose.Schema({
    id: { type: String, required: true },
    imageUrl: { type: String, default: '' },
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    buttons: { type: [cardButtonSchema], default: [] }
}, { _id: false });

const handoffConfigSchema = new mongoose.Schema({
    team: { type: String, default: 'support' },
    message: { type: String, default: 'Connecting you with a human agent…' },
    fallbackNextNodeId: { type: String, default: null }
}, { _id: false });

const delayConfigSchema = new mongoose.Schema({
    ms: { type: Number, default: 1000, min: 0, max: 15000 },
    typingIndicator: { type: Boolean, default: true },
    nextNodeId: { type: String, default: null }
}, { _id: false });

const jumpConfigSchema = new mongoose.Schema({
    nextNodeId: { type: String, required: true }
}, { _id: false });

const triggerConfigSchema = new mongoose.Schema({
    matchType: {
        type: String,
        enum: ['firstMessage', 'keyword', 'intent'],
        default: 'firstMessage'
    },
    keywords: { type: [String], default: [] },
    intent: { type: String, default: '' },
    nextNodeId: { type: String, default: null }
}, { _id: false });

const setVariableConfigSchema = new mongoose.Schema({
    variable: { type: String, required: true },
    value: { type: String, default: '' }, // supports {{vars.x}} interpolation
    nextNodeId: { type: String, default: null }
}, { _id: false });

const NODE_TYPES = [
    // legacy
    'message', 'question', 'ai', 'end',
    // enterprise additions
    'capture', 'branch', 'set_variable',
    'action_api', 'action_email', 'action_slack', 'action_handoff',
    'cards', 'delay', 'jump', 'trigger'
];

const nodeSchema = new mongoose.Schema({
    id: { type: String, required: true },
    type: { type: String, enum: NODE_TYPES, required: true },
    title: { type: String, default: '' },
    text: { type: String, default: '' },
    aiInstructions: { type: String, default: '' },
    options: { type: [optionSchema], default: [] },
    conditions: { type: [conditionSchema], default: [] },
    fallbackNextNodeId: { type: String, default: null },

    // Per-type config blocks (only the relevant one is populated for a given node).
    capture: { type: captureConfigSchema, default: null },
    apiAction: { type: apiActionConfigSchema, default: null },
    branch: { type: branchConfigSchema, default: null },
    cards: { type: [cardSchema], default: undefined },
    handoff: { type: handoffConfigSchema, default: null },
    delay: { type: delayConfigSchema, default: null },
    jump: { type: jumpConfigSchema, default: null },
    trigger: { type: triggerConfigSchema, default: null },
    setVariable: { type: setVariableConfigSchema, default: null },

    // Builder metadata: position on canvas (so re-opening the editor preserves layout).
    position: {
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 }
    }
}, { _id: false });

// ---------------------------------------------------------------------------
// Flow-level schema
// ---------------------------------------------------------------------------

const flowVariableSchema = new mongoose.Schema({
    name: { type: String, required: true },
    defaultValue: { type: String, default: '' },
    scope: {
        type: String,
        enum: ['flow', 'session', 'user'],
        default: 'flow'
    },
    description: { type: String, default: '' }
}, { _id: false });

const chatFlowSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    botId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bot', default: null, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },

    // Lifecycle:
    //   draft     - editable WIP, never runs against live visitors.
    //   published - frozen snapshot, eligible to be set as Bot.activeFlowId.
    //   archived  - hidden from list but kept for audit.
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'draft',
        index: true
    },
    publishedAt: { type: Date, default: null },
    publishedVersion: { type: Number, default: 0 },

    // Legacy flag retained for back-compat with the existing runtime resolver.
    // The new resolver prefers Bot.behaviorMode + Bot.activeFlowId.
    isActive: { type: Boolean, default: false },

    startNodeId: { type: String, required: true },

    // Published nodes (what the runtime executes).
    nodes: { type: [nodeSchema], default: [] },
    // Draft nodes (what the builder edits). Falls back to `nodes` when empty/null
    // for flows created before the draft-publish split.
    draftNodes: { type: [nodeSchema], default: undefined },

    // Flow-level variables visible in the VariablesPanel.
    variables: { type: [flowVariableSchema], default: [] },

    version: { type: Number, default: 1 }
}, { timestamps: true });

chatFlowSchema.index({ userId: 1, botId: 1, status: 1 });
chatFlowSchema.index({ userId: 1, botId: 1, isActive: 1 });

module.exports = mongoose.model('ChatFlow', chatFlowSchema);

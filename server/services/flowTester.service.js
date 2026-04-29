/**
 * Flow tester (dry-run sandbox).
 *
 * Runs `step()` repeatedly against an in-memory state with a scripted list
 * of visitor messages, returning the full transcript and per-step state
 * snapshots for the builder UI.
 *
 * Two execution modes:
 *
 *   live    \u2014 hit real APIs and decrypt real secrets from the user's vault.
 *             Use when the client is testing their actual integration.
 *
 *   mock    \u2014 short-circuit `action_api` nodes with stub responses (the user
 *             can pre-seed responses per node id). Use for fast unit-tests in
 *             the builder before the API endpoint is even ready.
 *
 * The tester never persists anything. Conversation, leadInfo, secrets all
 * live in memory for the duration of the call.
 */

const { step } = require('./chatFlowRuntime.service');
const { runNode } = require('./nodeExecutors');
const secretsVault = require('./secretsVault.service');

/**
 * @typedef {object} TestRunOptions
 * @property {string[]} messages                  scripted visitor turns.
 * @property {Record<string, any>} [initialVariables]
 * @property {Record<string, any>} [leadInfo]     simulate a known visitor
 * @property {'live'|'mock'} [mode]               default 'mock'
 * @property {Record<string, any>} [mockApiResponses]
 *        keyed by node id \u2192 { ok?:boolean, statusCode?:number, data:any, error?:string }.
 *        Only applies when mode === 'mock'. Missing keys fall back to {ok:true,data:{}}.
 * @property {Record<string, string>} [mockSecrets]
 *        keyed by secret name. Only applies when mode === 'mock'.
 * @property {string} [userId]                    required when mode === 'live' so we can
 *                                                resolve the user's vault.
 */

/**
 * @typedef {object} TestTurn
 * @property {string|null} visitor          - the message that triggered this turn
 *                                            (null on the very first auto-played turn).
 * @property {object[]} chunks              - chunks emitted by the runtime
 *                                            (text/buttons/cards/typing/etc.).
 * @property {string[]} replyText           - flattened text/ai chunks for quick display.
 * @property {{ label: string }[]} buttons  - extracted from buttons-chunks.
 * @property {object[]} cards               - extracted from cards-chunks.
 * @property {object} state                 - full nextState snapshot after this turn.
 * @property {boolean} endFlow              - true when the runtime ended.
 * @property {string|null} lastNodeId       - id of the last node executed in this turn.
 * @property {string|null} lastNodeType     - type of the last node executed (handy for UI).
 */

/**
 * Run a scripted dry-run against a flow document.
 *
 * @param {object} flow
 * @param {TestRunOptions} options
 * @returns {Promise<{ transcript: TestTurn[], finalState: object, endedAt: number|null }>}
 */
async function runTest(flow, options = {}) {
    const messages = Array.isArray(options.messages) ? options.messages.slice() : [];
    const mode = options.mode === 'live' ? 'live' : 'mock';
    const mockApiResponses = options.mockApiResponses || {};
    const mockSecrets = options.mockSecrets || {};

    const runtime = {
        visitorId: 'test-visitor',
        botId: 'test-bot',
        botName: 'Test Bot',
        conversationId: 'test-conversation',
        leadInfo: options.leadInfo || {},
        services: {
            // Secret resolver: live \u2192 vault; mock \u2192 in-memory dict.
            getSecret: async (name) => {
                if (mode === 'mock') return mockSecrets[name] || '';
                if (!options.userId) return '';
                try {
                    const v = await secretsVault.getSecretValue(options.userId, name);
                    return v || '';
                } catch {
                    return '';
                }
            },
            // AI is stubbed in tests \u2014 returns a deterministic string so the
            // builder can show "AI would respond here" without hitting an LLM.
            // Switch this to a real AI service in live mode if needed.
            runAI: async ({ instructions }) =>
                `[ai stub] would respond using: ${(instructions || '').slice(0, 80)}\u2026`
        }
    };

    // In mock mode we wrap runNode to intercept action_api executions before
    // they hit the real network. We do this with a runtime flag the executor
    // can read; cleaner than monkey-patching axios.
    if (mode === 'mock') {
        runtime.services.mockApi = (nodeId) => {
            const stub = mockApiResponses[nodeId];
            if (stub) return stub;
            return { ok: true, statusCode: 200, data: {}, error: null };
        };
    }

    let state = {
        nodeId: null,
        variables: { ...(options.initialVariables || {}) },
        retries: {},
        history: [],
        pendingCaptureVar: null,
        apiResult: null
    };

    const transcript = [];
    let endedAt = null;

    // First turn: no visitor message, the runtime walks from the start node
    // until it hits a wait/end (welcome message + first capture, etc.).
    const firstTurn = await runOneTurn(flow, state, null, runtime);
    transcript.push(firstTurn);
    state = firstTurn.state;
    if (firstTurn.endFlow) {
        endedAt = 0;
        return { transcript, finalState: state, endedAt };
    }

    // Now feed scripted messages one by one.
    for (let i = 0; i < messages.length; i++) {
        if (state.nodeId == null) break; // nothing to drive
        const turn = await runOneTurn(flow, state, messages[i], runtime);
        transcript.push(turn);
        state = turn.state;
        if (turn.endFlow) {
            endedAt = i + 1;
            break;
        }
    }

    return { transcript, finalState: state, endedAt };
}

/**
 * Single dry-run turn. Wraps step() and reshapes the result into a
 * builder-friendly payload (chunks + replyText + buttons + cards split).
 *
 * @param {object} flow
 * @param {object} state
 * @param {string|null} visitorText
 * @param {object} runtime
 * @returns {Promise<TestTurn>}
 */
async function runOneTurn(flow, state, visitorText, runtime) {
    const result = await step({
        flow,
        state,
        visitorText: visitorText || '',
        runtime
    });

    const replyText = [];
    const buttons = [];
    const cards = [];
    for (const c of result.chunks || []) {
        if (c.type === 'text' || c.type === 'ai') {
            if (c.text) replyText.push(c.text);
        } else if (c.type === 'buttons' && Array.isArray(c.buttons)) {
            buttons.push(...c.buttons);
        } else if (c.type === 'cards' && Array.isArray(c.cards)) {
            cards.push(...c.cards);
        }
    }

    return {
        visitor: visitorText,
        chunks: result.chunks || [],
        replyText,
        buttons,
        cards,
        state: result.nextState,
        endFlow: !!result.endFlow,
        lastNodeId: result.lastNode?.id || null,
        lastNodeType: result.lastNode?.type || null
    };
}

module.exports = {
    runTest,
    runOneTurn
};

/**
 * Human handoff template.
 *
 * Minimal "talk-to-human" greeter. Captures the visitor's reason in one
 * sentence then escalates with the variable embedded in the agent message.
 *
 * Use when the client mostly wants live-chat with a thin pre-screening layer.
 */

module.exports = {
    id: 'human-handoff',
    name: 'Talk to human',
    description: 'One-question pre-screen then immediate live-agent handoff.',
    category: 'support',
    flow: {
        name: 'Talk to human',
        description: 'Capture reason and route to a live agent.',
        startNodeId: 'hh_start',
        variables: [{ name: 'reason', scope: 'session', defaultValue: '' }],
        nodes: [
            {
                id: 'hh_start', type: 'message', title: 'Greeting',
                text: 'A teammate is one message away. What\'s up?',
                fallbackNextNodeId: 'hh_capture'
            },
            {
                id: 'hh_capture', type: 'capture', title: 'Reason',
                text: 'In one sentence, how can we help?',
                capture: {
                    variable: 'reason', inputType: 'text', retryCount: 0,
                    nextNodeId: 'hh_handoff'
                }
            },
            {
                id: 'hh_handoff', type: 'action_handoff', title: 'Live agent',
                handoff: { team: 'support', message: 'Inbound: {{vars.reason}}' }
            }
        ]
    }
};

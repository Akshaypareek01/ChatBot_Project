/**
 * NPS survey template.
 *
 * Captures a 0\u201310 score, branches into Promoter / Passive / Detractor lanes,
 * captures qualitative feedback, then writes the bundle to a feedback API.
 *
 * Required Secrets:
 *   nps_api_token  - bearer token for the feedback intake endpoint.
 */

module.exports = {
    id: 'nps-survey',
    name: 'NPS survey',
    description: 'Standard 0\u201310 NPS, branched by score, posted to your feedback endpoint.',
    category: 'feedback',
    flow: {
        name: 'NPS survey',
        description: 'Net Promoter Score survey with bucketed follow-up.',
        startNodeId: 'nps_start',
        variables: [
            { name: 'score',       scope: 'session', defaultValue: '' },
            { name: 'comment',     scope: 'session', defaultValue: '' },
            { name: 'segment',     scope: 'session', defaultValue: '' }
        ],
        nodes: [
            {
                id: 'nps_start', type: 'capture', title: 'Score',
                text: 'On a scale of 0\u201310, how likely are you to recommend us?',
                capture: {
                    variable: 'score', inputType: 'number',
                    validation: { regex: '^(10|[0-9])$', errorMessage: 'Please send a number from 0 to 10.' },
                    retryCount: 2,
                    nextNodeId: 'nps_branch'
                }
            },
            {
                id: 'nps_branch', type: 'branch', title: 'Bucket',
                branch: {
                    conditions: [
                        { variable: 'score', op: 'gt', value: '8',  nextNodeId: 'nps_set_promoter' },
                        { variable: 'score', op: 'gt', value: '6',  nextNodeId: 'nps_set_passive' }
                    ],
                    fallbackNextNodeId: 'nps_set_detractor'
                }
            },
            { id: 'nps_set_promoter',  type: 'set_variable', title: 'Promoter',  setVariable: { variable: 'segment', value: 'promoter',  nextNodeId: 'nps_promoter_msg' } },
            { id: 'nps_set_passive',   type: 'set_variable', title: 'Passive',   setVariable: { variable: 'segment', value: 'passive',   nextNodeId: 'nps_passive_msg' } },
            { id: 'nps_set_detractor', type: 'set_variable', title: 'Detractor', setVariable: { variable: 'segment', value: 'detractor', nextNodeId: 'nps_detractor_msg' } },

            {
                id: 'nps_promoter_msg', type: 'message', title: 'Promoter \ud83c\udf89',
                text: 'Amazing! What do you love most? (skip if not in the mood)',
                fallbackNextNodeId: 'nps_capture_comment'
            },
            {
                id: 'nps_passive_msg', type: 'message', title: 'Passive',
                text: 'Thanks. What\'s one thing we could improve?',
                fallbackNextNodeId: 'nps_capture_comment'
            },
            {
                id: 'nps_detractor_msg', type: 'message', title: 'Detractor',
                text: 'Sorry to hear that. What went wrong? We read every reply.',
                fallbackNextNodeId: 'nps_capture_comment'
            },
            {
                id: 'nps_capture_comment', type: 'capture', title: 'Comment',
                text: 'Type your thoughts (or "skip" to move on).',
                capture: {
                    variable: 'comment', inputType: 'text', retryCount: 0,
                    nextNodeId: 'nps_post'
                }
            },
            {
                id: 'nps_post', type: 'action_api', title: 'Save feedback',
                apiAction: {
                    method: 'POST',
                    url: 'https://api.example.com/feedback/nps',
                    headers: [{ key: 'Content-Type', value: 'application/json' }],
                    authType: 'bearer',
                    authSecretRef: 'nps_api_token',
                    body: '{ "score": "{{vars.score}}", "segment": "{{vars.segment}}", "comment": "{{vars.comment}}" }',
                    timeoutMs: 5000,
                    onSuccessNodeId: 'nps_branch_after',
                    onErrorNodeId: 'nps_branch_after'
                }
            },
            {
                id: 'nps_branch_after', type: 'branch', title: 'Followup',
                branch: {
                    conditions: [
                        { variable: 'segment', op: 'eq', value: 'detractor', nextNodeId: 'nps_handoff' }
                    ],
                    fallbackNextNodeId: 'nps_thanks'
                }
            },
            {
                id: 'nps_thanks', type: 'message', title: 'Thanks',
                text: 'Thanks for the feedback. Have a great day!',
                fallbackNextNodeId: 'nps_end'
            },
            {
                id: 'nps_handoff', type: 'action_handoff', title: 'Handoff',
                handoff: { team: 'success', message: 'Detractor NPS={{vars.score}}: {{vars.comment}}' }
            },
            { id: 'nps_end', type: 'end', title: 'Done', text: '' }
        ]
    }
};

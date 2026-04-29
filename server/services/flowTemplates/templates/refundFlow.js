/**
 * Refund flow template.
 *
 * Captures the order id and reason, looks up the order, and either
 * auto-approves the refund (if eligible per the API response) or routes
 * to a human agent.
 *
 * Required Secrets:
 *   refund_api_token  - bearer token for POSTing the refund request.
 */

module.exports = {
    id: 'refund-flow',
    name: 'Refund / return',
    description: 'Capture order + reason, attempt automated refund, escalate when not eligible.',
    category: 'commerce',
    flow: {
        name: 'Refund / return',
        description: 'Eligibility check + automated refund or escalate.',
        startNodeId: 'rf_start',
        variables: [
            { name: 'order_id',     scope: 'session', defaultValue: '' },
            { name: 'reason',       scope: 'session', defaultValue: '' },
            { name: 'refund_status', scope: 'session', defaultValue: '' }
        ],
        nodes: [
            {
                id: 'rf_start', type: 'message', title: 'Greeting',
                text: 'I can help with refunds and returns. We\'ll need your order id.',
                fallbackNextNodeId: 'rf_capture_order'
            },
            {
                id: 'rf_capture_order', type: 'capture', title: 'Order id',
                text: 'What\'s the order id?',
                capture: {
                    variable: 'order_id',
                    inputType: 'text',
                    validation: { regex: '^#?\\d{4,}$', errorMessage: 'Send just the order number, e.g. #10234.' },
                    retryCount: 2,
                    nextNodeId: 'rf_capture_reason'
                }
            },
            {
                id: 'rf_capture_reason', type: 'capture', title: 'Reason',
                text: 'In one line, what\'s the reason for the return?',
                capture: {
                    variable: 'reason',
                    inputType: 'text',
                    retryCount: 0,
                    nextNodeId: 'rf_request_refund'
                }
            },
            {
                id: 'rf_request_refund', type: 'action_api', title: 'Request refund',
                apiAction: {
                    method: 'POST',
                    url: 'https://api.example.com/orders/{{vars.order_id}}/refund',
                    headers: [{ key: 'Accept', value: 'application/json' }],
                    authType: 'bearer',
                    authSecretRef: 'refund_api_token',
                    body: '{ "reason": "{{vars.reason}}" }',
                    responseMap: [{ variable: 'refund_status', jsonPath: '$.status' }],
                    timeoutMs: 12000,
                    onSuccessNodeId: 'rf_branch',
                    onErrorNodeId: 'rf_handoff'
                }
            },
            {
                id: 'rf_branch', type: 'branch', title: 'Eligibility',
                branch: {
                    conditions: [
                        { variable: 'refund_status', op: 'eq', value: 'approved', nextNodeId: 'rf_approved' },
                        { variable: 'refund_status', op: 'eq', value: 'pending',  nextNodeId: 'rf_pending' }
                    ],
                    fallbackNextNodeId: 'rf_handoff'
                }
            },
            {
                id: 'rf_approved', type: 'message', title: 'Approved',
                text: '\ud83c\udf89 Refund approved for order #{{vars.order_id}}. Funds will appear in 3\u20135 business days.',
                options: [{ id: 'rf_a1', label: 'Anything else', nextNodeId: 'rf_start' }]
            },
            {
                id: 'rf_pending', type: 'message', title: 'Pending review',
                text: 'Your refund is under review. We\'ll email you within 24h.',
                options: [{ id: 'rf_p1', label: 'Got it', nextNodeId: 'rf_end' }]
            },
            {
                id: 'rf_handoff', type: 'action_handoff', title: 'Escalate',
                text: 'I\'ll connect you with a refunds specialist for order #{{vars.order_id}}.',
                handoff: { team: 'refunds', message: 'Refund needs manual review.' }
            },
            { id: 'rf_end', type: 'end', title: 'Done', text: 'Thanks for choosing us.' }
        ]
    }
};

/**
 * Order status template.
 *
 * Walks the visitor through an order lookup against the client's commerce
 * backend (Shopify-shaped REST or any public-facing order API) and routes
 * the conversation by status.
 *
 * Required Secrets:
 *   shopify_token   - the bearer token for Authorization header.
 *
 * Customisation:
 *   Replace `https://{{vars.store_domain}}/admin/api/2024-01/orders/{{vars.order_id}}.json`
 *   with the client's actual endpoint.
 */

module.exports = {
    id: 'order-status',
    name: 'Order status lookup',
    description: 'Capture the order id, fetch live status from the client\'s order API, and route by status.',
    category: 'commerce',
    flow: {
        name: 'Order status lookup',
        description: 'Fetch order status from the merchant\'s API and route by status.',
        startNodeId: 'os_start',
        variables: [
            { name: 'order_id',     scope: 'session', defaultValue: '', description: 'Order ID typed by the visitor.' },
            { name: 'order_status', scope: 'session', defaultValue: '', description: 'Status returned by the API.' },
            { name: 'tracking_url', scope: 'session', defaultValue: '', description: 'Tracking URL extracted from the response.' }
        ],
        nodes: [
            {
                id: 'os_start', type: 'message', title: 'Greeting',
                text: 'I can look up your order. Type "track" to start.',
                fallbackNextNodeId: 'os_capture_id'
            },
            {
                id: 'os_capture_id', type: 'capture', title: 'Capture order id',
                text: 'What is your order ID? It usually starts with #.',
                capture: {
                    variable: 'order_id',
                    inputType: 'text',
                    validation: { regex: '^#?\\d{4,}$', errorMessage: 'That doesn\'t look like an order id.' },
                    retryCount: 2,
                    retryMessage: 'Please send just the order number, e.g. #10234.',
                    nextNodeId: 'os_call_api',
                    fallbackNextNodeId: 'os_handoff'
                }
            },
            {
                id: 'os_call_api', type: 'action_api', title: 'Fetch order',
                apiAction: {
                    method: 'GET',
                    url: 'https://api.example.com/orders/{{vars.order_id}}',
                    headers: [{ key: 'Accept', value: 'application/json' }],
                    authType: 'bearer',
                    authSecretRef: 'shopify_token',
                    responseMap: [
                        { variable: 'order_status', jsonPath: '$.order.status' },
                        { variable: 'tracking_url', jsonPath: '$.order.tracking_url' }
                    ],
                    timeoutMs: 8000,
                    onSuccessNodeId: 'os_branch',
                    onErrorNodeId: 'os_not_found'
                }
            },
            {
                id: 'os_branch', type: 'branch', title: 'Route by status',
                branch: {
                    conditions: [
                        { variable: 'order_status', op: 'eq',       value: 'shipped',   nextNodeId: 'os_shipped' },
                        { variable: 'order_status', op: 'eq',       value: 'delivered', nextNodeId: 'os_delivered' },
                        { variable: 'order_status', op: 'eq',       value: 'cancelled', nextNodeId: 'os_cancelled' },
                        { variable: 'order_status', op: 'contains', value: 'process',   nextNodeId: 'os_processing' }
                    ],
                    fallbackNextNodeId: 'os_unknown_status'
                }
            },
            {
                id: 'os_shipped', type: 'message', title: 'Shipped',
                text: 'Your order #{{vars.order_id}} has shipped. Track it here: {{vars.tracking_url}}',
                options: [
                    { id: 'os_b1', label: 'Anything else',  nextNodeId: 'os_start' },
                    { id: 'os_b2', label: 'Talk to a human', nextNodeId: 'os_handoff' }
                ]
            },
            {
                id: 'os_delivered', type: 'message', title: 'Delivered',
                text: '\u2705 Order #{{vars.order_id}} was delivered. Need help with it?',
                options: [
                    { id: 'os_d1', label: 'Return / refund',  nextNodeId: 'os_handoff' },
                    { id: 'os_d2', label: 'No, thanks',       nextNodeId: 'os_end' }
                ]
            },
            {
                id: 'os_processing', type: 'message', title: 'Processing',
                text: 'Order #{{vars.order_id}} is being prepared. We will email you when it ships.',
                options: [{ id: 'os_p1', label: 'Anything else', nextNodeId: 'os_start' }]
            },
            {
                id: 'os_cancelled', type: 'message', title: 'Cancelled',
                text: 'Order #{{vars.order_id}} was cancelled. I\'ll connect you with our refunds team.',
                fallbackNextNodeId: 'os_handoff'
            },
            {
                id: 'os_unknown_status', type: 'message', title: 'Unknown status',
                text: 'Order #{{vars.order_id}} is in an unusual state ({{vars.order_status}}). Let me get a human.',
                fallbackNextNodeId: 'os_handoff'
            },
            {
                id: 'os_not_found', type: 'message', title: 'Not found',
                text: 'I couldn\'t find that order. Want to try a different ID, or talk to a human?',
                options: [
                    { id: 'os_nf1', label: 'Try again',     nextNodeId: 'os_capture_id' },
                    { id: 'os_nf2', label: 'Talk to human', nextNodeId: 'os_handoff' }
                ]
            },
            {
                id: 'os_handoff', type: 'action_handoff', title: 'Live agent',
                handoff: { team: 'support', message: 'Connecting you with a support specialist\u2026' }
            },
            { id: 'os_end', type: 'end', title: 'Done', text: 'Glad I could help \u2014 have a great day!' }
        ]
    }
};

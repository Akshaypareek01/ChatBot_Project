/**
 * Support routing template (legacy-compatible).
 *
 * Original template kept for back-compat with clients who already imported it
 * before the enterprise rewrite. Uses the legacy `question` + `ai` types so
 * existing flows that reference it keep working.
 */

module.exports = {
    id: 'support-routing',
    name: 'Support routing',
    description: 'Triage incoming visitors into Order, Refund, or Sales lanes.',
    category: 'support',
    flow: {
        name: 'Support routing',
        startNodeId: 'sr_start',
        nodes: [
            {
                id: 'sr_start', type: 'message', title: 'Greeting',
                text: 'Hi! What can I help you with today?',
                options: [
                    { id: 'sr_o1', label: 'Order status',   nextNodeId: 'sr_order' },
                    { id: 'sr_o2', label: 'Refund / return', nextNodeId: 'sr_refund' },
                    { id: 'sr_o3', label: 'Talk to sales',   nextNodeId: 'sr_sales' }
                ]
            },
            {
                id: 'sr_order', type: 'ai', title: 'Order AI', text: '',
                aiInstructions: 'You are an order-support assistant. Ask the visitor for their order id if they have not shared it, then answer concisely using the knowledge base.',
                options: [{ id: 'sr_back1', label: 'Back to menu', nextNodeId: 'sr_start' }]
            },
            {
                id: 'sr_refund', type: 'ai', title: 'Refund AI', text: '',
                aiInstructions: 'You are a returns / refunds assistant. Explain the refund policy in 1-2 sentences and outline next steps.',
                options: [{ id: 'sr_back2', label: 'Back to menu', nextNodeId: 'sr_start' }]
            },
            {
                id: 'sr_sales', type: 'ai', title: 'Sales AI', text: '',
                aiInstructions: 'You are a sales assistant. Qualify intent and propose a discovery call with the team.',
                options: [{ id: 'sr_back3', label: 'Back to menu', nextNodeId: 'sr_start' }]
            }
        ]
    }
};

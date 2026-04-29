/**
 * Product recommendation template.
 *
 * Asks the visitor what category they care about, fetches recommendations
 * from a catalog API, and renders them as cards with "Buy now" / "Details"
 * buttons.
 *
 * Required Secrets:
 *   catalog_api_key  - API key for the product catalog endpoint.
 */

module.exports = {
    id: 'product-recommendation',
    name: 'Product recommendation',
    description: 'Personalised product picks via catalog API + interactive cards.',
    category: 'commerce',
    flow: {
        name: 'Product recommendation',
        description: 'Render recommended SKUs as cards with buy / details buttons.',
        startNodeId: 'pr_start',
        variables: [
            { name: 'category',        scope: 'session', defaultValue: '' },
            { name: 'recommendations', scope: 'session', defaultValue: '' }
        ],
        nodes: [
            {
                id: 'pr_start', type: 'message', title: 'Greeting',
                text: 'Looking for something specific? What category are you shopping for?',
                options: [
                    { id: 'pr_o1', label: 'Headphones',  nextNodeId: 'pr_set_audio' },
                    { id: 'pr_o2', label: 'Laptops',     nextNodeId: 'pr_set_laptops' },
                    { id: 'pr_o3', label: 'Accessories', nextNodeId: 'pr_set_accessories' }
                ]
            },
            { id: 'pr_set_audio',       type: 'set_variable', title: 'Audio',       setVariable: { variable: 'category', value: 'audio',       nextNodeId: 'pr_fetch' } },
            { id: 'pr_set_laptops',     type: 'set_variable', title: 'Laptops',     setVariable: { variable: 'category', value: 'laptops',     nextNodeId: 'pr_fetch' } },
            { id: 'pr_set_accessories', type: 'set_variable', title: 'Accessories', setVariable: { variable: 'category', value: 'accessories', nextNodeId: 'pr_fetch' } },
            {
                id: 'pr_fetch', type: 'action_api', title: 'Fetch picks',
                apiAction: {
                    method: 'GET',
                    url: 'https://api.example.com/catalog/recommendations?category={{vars.category}}',
                    headers: [{ key: 'Accept', value: 'application/json' }],
                    authType: 'apiKey',
                    authSecretRef: 'catalog_api_key',
                    authHeaderName: 'X-API-Key',
                    responseMap: [{ variable: 'recommendations', jsonPath: '$.items' }],
                    timeoutMs: 6000,
                    onSuccessNodeId: 'pr_cards',
                    onErrorNodeId: 'pr_error'
                }
            },
            {
                id: 'pr_cards', type: 'cards', title: 'Picks',
                cards: [
                    {
                        id: 'pr_c1',
                        imageUrl: 'https://placehold.co/600x400/0f172a/fff?text=Top+pick',
                        title: 'Top pick for {{vars.category}}',
                        subtitle: 'Best-seller in {{vars.category}}.',
                        buttons: [
                            { id: 'pr_c1_b1', label: 'Buy now',  kind: 'url', url: 'https://example.com/buy/top' },
                            { id: 'pr_c1_b2', label: 'Details',  kind: 'postback', nextNodeId: 'pr_details' }
                        ]
                    },
                    {
                        id: 'pr_c2',
                        imageUrl: 'https://placehold.co/600x400/4f46e5/fff?text=Premium',
                        title: 'Premium choice',
                        subtitle: 'For {{vars.category}} enthusiasts.',
                        buttons: [
                            { id: 'pr_c2_b1', label: 'Buy now', kind: 'url', url: 'https://example.com/buy/premium' },
                            { id: 'pr_c2_b2', label: 'Talk to expert', kind: 'postback', nextNodeId: 'pr_handoff' }
                        ]
                    },
                    {
                        id: 'pr_c3',
                        imageUrl: 'https://placehold.co/600x400/10b981/fff?text=Value',
                        title: 'Best value',
                        subtitle: 'Most-loved in {{vars.category}}.',
                        buttons: [
                            { id: 'pr_c3_b1', label: 'Buy now',   kind: 'url', url: 'https://example.com/buy/value' },
                            { id: 'pr_c3_b2', label: 'Try again', kind: 'postback', nextNodeId: 'pr_start' }
                        ]
                    }
                ]
            },
            {
                id: 'pr_details', type: 'ai', title: 'Product AI', text: '',
                aiInstructions: 'You are a product expert. Use the knowledge base + the user\'s selected category ({{vars.category}}) to answer detailed questions.',
                options: [{ id: 'pr_back', label: 'Back to picks', nextNodeId: 'pr_cards' }]
            },
            {
                id: 'pr_error', type: 'message', title: 'Catalog down',
                text: 'I couldn\'t reach the catalog right now. Want to talk to a human?',
                options: [
                    { id: 'pr_e1', label: 'Yes please',     nextNodeId: 'pr_handoff' },
                    { id: 'pr_e2', label: 'Try again later', nextNodeId: 'pr_end' }
                ]
            },
            {
                id: 'pr_handoff', type: 'action_handoff', title: 'Handoff',
                handoff: { team: 'sales', message: 'Visitor wants details on {{vars.category}}' }
            },
            { id: 'pr_end', type: 'end', title: 'Done', text: 'Happy shopping!' }
        ]
    }
};

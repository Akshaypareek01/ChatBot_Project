/**
 * FAQ \u2192 AI template.
 *
 * Greets the visitor, surfaces the 4 most common questions as buttons, and
 * routes anything else into the AI node grounded by the user's KB.
 *
 * Demonstrates the menu \u2192 fall-through-to-AI pattern that most B2B sites
 * actually want.
 */

module.exports = {
    id: 'faq-ai',
    name: 'FAQ + AI fallback',
    description: 'Top FAQs as buttons; everything else falls through to AI.',
    category: 'support',
    flow: {
        name: 'FAQ + AI fallback',
        description: 'Surface common FAQs and let AI handle the rest.',
        startNodeId: 'faq_start',
        nodes: [
            {
                id: 'faq_start', type: 'message', title: 'Greeting',
                text: 'Hi! I can answer common questions or hand you to our team. What\'s on your mind?',
                options: [
                    { id: 'faq_o1', label: 'Pricing',     nextNodeId: 'faq_pricing' },
                    { id: 'faq_o2', label: 'Integrations', nextNodeId: 'faq_integrations' },
                    { id: 'faq_o3', label: 'Security',    nextNodeId: 'faq_security' },
                    { id: 'faq_o4', label: 'Something else', nextNodeId: 'faq_ai' }
                ]
            },
            {
                id: 'faq_pricing', type: 'message', title: 'Pricing',
                text: 'Plans start at $29/month with a 14-day free trial. Want to see the full breakdown?',
                options: [
                    { id: 'faq_p1', label: 'Yes \u2014 take me there', nextNodeId: 'faq_pricing_link' },
                    { id: 'faq_p2', label: 'Talk to sales',           nextNodeId: 'faq_handoff' },
                    { id: 'faq_p3', label: 'Back to menu',            nextNodeId: 'faq_start' }
                ]
            },
            {
                id: 'faq_pricing_link', type: 'message', title: 'Pricing link',
                text: 'Here are our plans: https://example.com/pricing',
                options: [{ id: 'faq_pl1', label: 'Back to menu', nextNodeId: 'faq_start' }]
            },
            {
                id: 'faq_integrations', type: 'message', title: 'Integrations',
                text: 'We integrate with Slack, Zapier, Salesforce, HubSpot and 30+ more. Anything specific?',
                options: [
                    { id: 'faq_i1', label: 'Ask AI',         nextNodeId: 'faq_ai' },
                    { id: 'faq_i2', label: 'Talk to a human', nextNodeId: 'faq_handoff' },
                    { id: 'faq_i3', label: 'Back to menu',    nextNodeId: 'faq_start' }
                ]
            },
            {
                id: 'faq_security', type: 'message', title: 'Security',
                text: 'We are SOC 2 Type II + GDPR compliant. Data is encrypted at rest and in transit.',
                options: [
                    { id: 'faq_s1', label: 'Read more',     nextNodeId: 'faq_security_link' },
                    { id: 'faq_s2', label: 'Back to menu',  nextNodeId: 'faq_start' }
                ]
            },
            {
                id: 'faq_security_link', type: 'message', title: 'Security link',
                text: 'Trust center: https://example.com/security',
                options: [{ id: 'faq_sl1', label: 'Back to menu', nextNodeId: 'faq_start' }]
            },
            {
                id: 'faq_ai', type: 'ai', title: 'AI fallback', text: '',
                aiInstructions: 'You are a helpful assistant for our product. Answer concisely using the knowledge base. If unsure, offer to connect them with a human.',
                options: [
                    { id: 'faq_ai_b1', label: 'Helpful, thanks!',  nextNodeId: 'faq_end' },
                    { id: 'faq_ai_b2', label: 'Talk to a human',   nextNodeId: 'faq_handoff' },
                    { id: 'faq_ai_b3', label: 'Back to menu',      nextNodeId: 'faq_start' }
                ]
            },
            {
                id: 'faq_handoff', type: 'action_handoff', title: 'Handoff',
                handoff: { team: 'support', message: 'Visitor wants a human after FAQ flow.' }
            },
            { id: 'faq_end', type: 'end', title: 'Done', text: 'Glad I could help!' }
        ]
    }
};

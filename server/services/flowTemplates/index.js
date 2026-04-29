/**
 * Enterprise flow templates.
 *
 * Each template is a *publishable* `ChatFlow` body the client can clone with
 * one click. They demonstrate every new node type and represent the most
 * common B2B chatbot use-cases (order status, refunds, lead capture, etc.).
 *
 * Templates live in this module rather than the database so:
 *   - they get versioned with the codebase
 *   - new node types ship as templates the same release they ship as code
 *   - clients can preview them without a write to their tenant
 *
 * IDs use kebab-case and a short prefix matching the template family
 * (`os_`, `rf_`, `lq_`, etc.) to avoid collisions when a client mixes two
 * templates into one flow via copy-paste.
 */

const TEMPLATES = [
    require('./templates/supportRouting'),
    require('./templates/orderStatus'),
    require('./templates/refundFlow'),
    require('./templates/leadQualification'),
    require('./templates/appointmentBooking'),
    require('./templates/productRecommendation'),
    require('./templates/humanHandoff'),
    require('./templates/faqAi'),
    require('./templates/npsSurvey')
];

/**
 * Return the static catalogue with safe summaries (no node bodies, just
 * counts and descriptions).
 */
function listTemplateSummaries() {
    return TEMPLATES.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        nodeTypes: Array.from(new Set((t.flow.nodes || []).map((n) => n.type))).sort(),
        nodeCount: (t.flow.nodes || []).length,
        usesSecrets: requiresSecrets(t.flow),
        usesApi: (t.flow.nodes || []).some((n) => n.type === 'action_api')
    }));
}

/**
 * @param {string} id
 * @returns {object|null} the full template body or null if unknown.
 */
function getTemplate(id) {
    return TEMPLATES.find((t) => t.id === id) || null;
}

/**
 * Return the full list (UI list + builder picker get the same shape:
 * `{ id, name, description, flow }`).
 */
function listTemplates() {
    return TEMPLATES.slice();
}

function requiresSecrets(flow) {
    return (flow.nodes || []).some(
        (n) => n.apiAction && n.apiAction.authType && n.apiAction.authType !== 'none'
    );
}

module.exports = {
    listTemplates,
    listTemplateSummaries,
    getTemplate
};

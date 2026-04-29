/**
 * Lead qualification template.
 *
 * Captures name + email + company size, branches by size into SMB / Mid /
 * Enterprise lanes, and either books a sales call (POST to CRM) or sends
 * an SMB self-serve link.
 *
 * Required Secrets:
 *   crm_api_key    - API key for the CRM lead intake endpoint.
 */

module.exports = {
    id: 'lead-qualification',
    name: 'Lead qualification',
    description: 'Qualify visitors, push to CRM, route SMB / Mid / Enterprise.',
    category: 'sales',
    flow: {
        name: 'Lead qualification',
        description: 'Capture lead, push to CRM, route by company size.',
        startNodeId: 'lq_start',
        variables: [
            { name: 'lead_name',    scope: 'session', defaultValue: '' },
            { name: 'lead_email',   scope: 'session', defaultValue: '' },
            { name: 'lead_size',    scope: 'session', defaultValue: '' },
            { name: 'lead_id',      scope: 'session', defaultValue: '' }
        ],
        nodes: [
            {
                id: 'lq_start', type: 'message', title: 'Greeting',
                text: 'Hi! Looking to talk to our team? I just need 30 seconds.',
                options: [
                    { id: 'lq_o1', label: 'Sure, let\'s do it', nextNodeId: 'lq_name' },
                    { id: 'lq_o2', label: 'Just browsing',     nextNodeId: 'lq_browse_end' }
                ]
            },
            { id: 'lq_browse_end', type: 'end', title: 'Browse', text: 'No worries! I\'ll be here when you\'re ready.' },
            {
                id: 'lq_name', type: 'capture', title: 'Name',
                text: 'What\'s your name?',
                capture: {
                    variable: 'lead_name', inputType: 'text', retryCount: 0,
                    nextNodeId: 'lq_email'
                }
            },
            {
                id: 'lq_email', type: 'capture', title: 'Work email',
                text: 'Nice to meet you, {{vars.lead_name}}! What\'s your work email?',
                capture: {
                    variable: 'lead_email', inputType: 'email',
                    validation: { errorMessage: 'That doesn\'t look like a valid email.' },
                    retryCount: 2,
                    nextNodeId: 'lq_size'
                }
            },
            {
                id: 'lq_size', type: 'message', title: 'Company size',
                text: 'How big is your team?',
                options: [
                    { id: 'lq_s1', label: '1\u201310',     nextNodeId: 'lq_set_smb' },
                    { id: 'lq_s2', label: '11\u2013100',   nextNodeId: 'lq_set_mid' },
                    { id: 'lq_s3', label: '100+',          nextNodeId: 'lq_set_ent' }
                ]
            },
            { id: 'lq_set_smb', type: 'set_variable', title: 'Set SMB', setVariable: { variable: 'lead_size', value: 'smb', nextNodeId: 'lq_post' } },
            { id: 'lq_set_mid', type: 'set_variable', title: 'Set Mid', setVariable: { variable: 'lead_size', value: 'mid', nextNodeId: 'lq_post' } },
            { id: 'lq_set_ent', type: 'set_variable', title: 'Set Enterprise', setVariable: { variable: 'lead_size', value: 'enterprise', nextNodeId: 'lq_post' } },
            {
                id: 'lq_post', type: 'action_api', title: 'Push to CRM',
                apiAction: {
                    method: 'POST',
                    url: 'https://api.example.com/crm/leads',
                    headers: [{ key: 'Content-Type', value: 'application/json' }],
                    authType: 'apiKey',
                    authSecretRef: 'crm_api_key',
                    authHeaderName: 'X-API-Key',
                    body: '{ "name": "{{vars.lead_name}}", "email": "{{vars.lead_email}}", "size": "{{vars.lead_size}}" }',
                    responseMap: [{ variable: 'lead_id', jsonPath: '$.id' }],
                    timeoutMs: 6000,
                    onSuccessNodeId: 'lq_branch',
                    onErrorNodeId: 'lq_branch'  // even on error, route by size for graceful UX
                }
            },
            {
                id: 'lq_branch', type: 'branch', title: 'Route by size',
                branch: {
                    conditions: [
                        { variable: 'lead_size', op: 'eq', value: 'smb',        nextNodeId: 'lq_smb' },
                        { variable: 'lead_size', op: 'eq', value: 'mid',        nextNodeId: 'lq_mid' },
                        { variable: 'lead_size', op: 'eq', value: 'enterprise', nextNodeId: 'lq_enterprise' }
                    ],
                    fallbackNextNodeId: 'lq_mid'
                }
            },
            {
                id: 'lq_smb', type: 'message', title: 'SMB self-serve',
                text: 'Perfect for SMBs \u2014 try our self-serve plan: https://example.com/start',
                options: [{ id: 'lq_b1', label: 'Open link', nextNodeId: 'lq_end' }]
            },
            {
                id: 'lq_mid', type: 'message', title: 'Mid-market handoff',
                text: 'Thanks {{vars.lead_name}}! A specialist will email you at {{vars.lead_email}} within 24h.',
                fallbackNextNodeId: 'lq_handoff'
            },
            {
                id: 'lq_enterprise', type: 'message', title: 'Enterprise handoff',
                text: 'Awesome \u2014 enterprise customers get dedicated onboarding. Connecting you now.',
                fallbackNextNodeId: 'lq_handoff'
            },
            {
                id: 'lq_handoff', type: 'action_handoff', title: 'Live agent',
                handoff: { team: 'sales', message: 'New {{vars.lead_size}} lead: {{vars.lead_name}} ({{vars.lead_email}})' }
            },
            { id: 'lq_end', type: 'end', title: 'Done', text: 'Talk soon!' }
        ]
    }
};

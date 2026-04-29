/**
 * Appointment booking template.
 *
 * Captures preferred date + email, calls a booking API, confirms or
 * suggests another slot.
 *
 * Required Secrets:
 *   booking_api_token  - bearer token for the calendar / booking endpoint.
 */

module.exports = {
    id: 'appointment-booking',
    name: 'Appointment booking',
    description: 'Capture date + email, call booking API, confirm or retry.',
    category: 'productivity',
    flow: {
        name: 'Appointment booking',
        description: 'Schedule a meeting with the team.',
        startNodeId: 'ab_start',
        variables: [
            { name: 'visitor_email', scope: 'session', defaultValue: '' },
            { name: 'preferred_date', scope: 'session', defaultValue: '' },
            { name: 'booking_id',     scope: 'session', defaultValue: '' },
            { name: 'booking_status', scope: 'session', defaultValue: '' }
        ],
        nodes: [
            {
                id: 'ab_start', type: 'message', title: 'Greeting',
                text: 'Want to book a 30-minute call with our team?',
                options: [
                    { id: 'ab_o1', label: 'Yes please', nextNodeId: 'ab_email' },
                    { id: 'ab_o2', label: 'Maybe later', nextNodeId: 'ab_later' }
                ]
            },
            { id: 'ab_later', type: 'end', title: 'Later', text: 'Sure, hit me up anytime.' },
            {
                id: 'ab_email', type: 'capture', title: 'Email',
                text: 'What\'s the best email to send the invite to?',
                capture: {
                    variable: 'visitor_email', inputType: 'email',
                    retryCount: 2,
                    validation: { errorMessage: 'That doesn\'t look like a valid email address.' },
                    nextNodeId: 'ab_date'
                }
            },
            {
                id: 'ab_date', type: 'capture', title: 'Date',
                text: 'When works for you? Please share a date and time, e.g. 2026-05-12 14:00 IST.',
                capture: {
                    variable: 'preferred_date', inputType: 'text',
                    retryCount: 2,
                    nextNodeId: 'ab_book'
                }
            },
            {
                id: 'ab_book', type: 'action_api', title: 'Create booking',
                apiAction: {
                    method: 'POST',
                    url: 'https://api.example.com/calendar/bookings',
                    headers: [{ key: 'Content-Type', value: 'application/json' }],
                    authType: 'bearer',
                    authSecretRef: 'booking_api_token',
                    body: '{ "email": "{{vars.visitor_email}}", "preferred": "{{vars.preferred_date}}" }',
                    responseMap: [
                        { variable: 'booking_id',     jsonPath: '$.id' },
                        { variable: 'booking_status', jsonPath: '$.status' }
                    ],
                    timeoutMs: 8000,
                    onSuccessNodeId: 'ab_branch',
                    onErrorNodeId: 'ab_failed'
                }
            },
            {
                id: 'ab_branch', type: 'branch', title: 'Branch',
                branch: {
                    conditions: [
                        { variable: 'booking_status', op: 'eq', value: 'confirmed',  nextNodeId: 'ab_confirmed' },
                        { variable: 'booking_status', op: 'eq', value: 'unavailable', nextNodeId: 'ab_unavailable' }
                    ],
                    fallbackNextNodeId: 'ab_failed'
                }
            },
            {
                id: 'ab_confirmed', type: 'message', title: 'Confirmed',
                text: '\u2705 Booked! Confirmation #{{vars.booking_id}} on its way to {{vars.visitor_email}}.',
                fallbackNextNodeId: 'ab_end'
            },
            {
                id: 'ab_unavailable', type: 'message', title: 'Unavailable',
                text: '{{vars.preferred_date}} isn\'t free. Want me to try a different time?',
                options: [
                    { id: 'ab_b1', label: 'Try another', nextNodeId: 'ab_date' },
                    { id: 'ab_b2', label: 'Talk to human', nextNodeId: 'ab_handoff' }
                ]
            },
            {
                id: 'ab_failed', type: 'message', title: 'Failed',
                text: 'Hmm, I couldn\'t reach the calendar. Connecting you with a human.',
                fallbackNextNodeId: 'ab_handoff'
            },
            {
                id: 'ab_handoff', type: 'action_handoff', title: 'Handoff',
                handoff: { team: 'sales', message: 'Booking pending for {{vars.visitor_email}}' }
            },
            { id: 'ab_end', type: 'end', title: 'Done', text: 'Looking forward to it!' }
        ]
    }
};

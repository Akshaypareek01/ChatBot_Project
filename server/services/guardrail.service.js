const { isLikelyInjection, looksLikeLeak } = require('../utils/promptInjection');
const audit = require('./audit.service');

/**
 * Guardrail: check user input for policy violations. Returns { pass: boolean, reason?: string }.
 * Logs blocked messages when pass is false.
 */
function checkInput(message, meta = {}) {
    if (!message || typeof message !== 'string') {
        return { pass: false, reason: 'Empty or invalid input' };
    }
    if (isLikelyInjection(message)) {
        audit.log('guardrail_blocked_input', {
            meta: { reason: 'prompt_injection', preview: message.slice(0, 100), ...meta }
        });
        return { pass: false, reason: 'Message blocked by safety filters.' };
    }
    return { pass: true };
}

/**
 * Guardrail: check model output for policy violations (e.g. prompt leak). Returns { pass: boolean, sanitized?: string }.
 * When pass is false, returns a safe fallback message.
 */
function checkOutput(output, meta = {}) {
    if (output == null) return { pass: true, sanitized: '' };
    const str = typeof output === 'string' ? output : String(output);
    if (looksLikeLeak(str)) {
        audit.log('guardrail_blocked_output', {
            meta: { reason: 'possible_leak', preview: str.slice(0, 100), ...meta }
        });
        return { pass: false, sanitized: "I don't have this information yet." };
    }
    return { pass: true, sanitized: str };
}

module.exports = { checkInput, checkOutput };

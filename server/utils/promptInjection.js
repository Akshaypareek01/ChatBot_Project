/**
 * Simple prompt injection detection: reject messages containing known patterns.
 * Log and block; do not send to model.
 */

const SUSPICIOUS_PATTERNS = [
    /ignore\s+(all\s+)?(previous|above|prior)\s+instructions?/i,
    /disregard\s+(all\s+)?(previous|above|prior)/i,
    /forget\s+(everything|all)\s+(you|we)\s+(know|learned)/i,
    /you\s+are\s+now\s+/i,
    /from\s+now\s+on\s+you\s+/i,
    /new\s+instructions?\s*:/i,
    /system\s*:\s*/i,
    /\[INST\]|\[\/INST\]/i,
    /<\|im_start\|>|<\|im_end\|>/i,
    /act\s+as\s+(a\s+)?(different|new)\s+/i,
    /pretend\s+you\s+are\s+/i,
    /roleplay\s+as\s+/i,
    /jailbreak/i,
    /DAN\s+mode/i,
    /developer\s+mode/i,
    /output\s+(the\s+)?(full\s+)?(system\s+)?prompt/i,
    /repeat\s+(the\s+)?(above|previous)\s+(message|text|content)/i,
    /what\s+are\s+your\s+instructions\??/i,
    /reveal\s+your\s+(system\s+)?prompt/i
];

const LEAK_PATTERNS = [
    /you\s+are\s+an\s+AI\s+assistant\s+for\s+a\s+specific\s+user/i,
    /you\s+must\s+ONLY\s+answer\s+based\s+on\s+the\s+provided\s+context/i,
    /context\s*:\s*\n/i,
    /do\s+not\s+hallucinate/i
];

/**
 * Returns true if message looks like prompt injection. Call before sending to LLM.
 */
function isLikelyInjection(message) {
    if (!message || typeof message !== 'string') return false;
    const normalized = message.trim();
    return SUSPICIOUS_PATTERNS.some((re) => re.test(normalized));
}

/**
 * Returns true if model output appears to leak system/context. Filter before returning to user.
 */
function looksLikeLeak(output) {
    if (!output || typeof output !== 'string') return false;
    return LEAK_PATTERNS.some((re) => re.test(output));
}

module.exports = { isLikelyInjection, looksLikeLeak };

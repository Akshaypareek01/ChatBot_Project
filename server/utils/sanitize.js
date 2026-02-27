const sanitizeHtml = require('sanitize-html');

const options = {
    allowedTags: [],
    allowedAttributes: {},
    textFilter: (text) => text.trim()
};

/**
 * Strip HTML/scripts from user input. Use for chat messages, form fields.
 * @param {string} input
 * @returns {string}
 */
function sanitizeInput(input) {
    if (input == null) return '';
    const str = typeof input === 'string' ? input : String(input);
    return sanitizeHtml(str, options).trim();
}

module.exports = { sanitizeInput };

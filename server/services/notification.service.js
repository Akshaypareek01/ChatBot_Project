/**
 * Phase 3.4: Create in-app notifications. Email sending respects user prefs elsewhere.
 */

const Notification = require('../models/Notification');

/**
 * Create a notification for a user.
 * @param {string|ObjectId} userId
 * @param {string} type - new_lead | low_balance | support_reply | summary | system
 * @param {string} title
 * @param {string} [body]
 * @param {object} [data]
 */
async function create(userId, type, title, body = '', data = null) {
    const doc = await Notification.create({
        userId,
        type,
        title,
        body,
        data: data || undefined
    });
    return doc;
}

module.exports = { create };

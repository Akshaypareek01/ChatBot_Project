const jwt = require('jsonwebtoken');

const WIDGET_JWT_EXPIRY = '365d'; // 1 year for embed script

/**
 * Issue a JWT for widget embed. Embed script includes this; /chat accepts it instead of trusting body userId.
 */
function issueWidgetToken(userId) {
    return jwt.sign(
        { userId: userId.toString(), purpose: 'widget' },
        process.env.JWT_SECRET,
        { expiresIn: WIDGET_JWT_EXPIRY }
    );
}

/**
 * Verify widget token and return userId. Returns null if invalid.
 */
function verifyWidgetToken(token) {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.purpose !== 'widget' || !decoded.userId) return null;
        return decoded.userId;
    } catch {
        return null;
    }
}

module.exports = { issueWidgetToken, verifyWidgetToken };

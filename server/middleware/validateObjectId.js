const mongoose = require('mongoose');

/**
 * Validates that req.params[paramName] is a valid MongoDB ObjectId.
 * Use for routes like /:userId, /:id to prevent injection.
 * @param {string} paramName - e.g. 'userId', 'id'
 */
function validateObjectId(paramName) {
    return (req, res, next) => {
        const value = req.params[paramName];
        if (!value || !mongoose.Types.ObjectId.isValid(value)) {
            return res.status(400).json({ message: 'Invalid ID format.' });
        }
        next();
    };
}

module.exports = { validateObjectId };

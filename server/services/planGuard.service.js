const User = require('../models/User');

/**
 * Check if user has enough tokens for an action
 * @param {string} userId 
 * @param {number} estimatedCost 
 */
const hasTokens = async (userId, estimatedCost = 100) => {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    if (user.tokenBalance < estimatedCost) {
        throw new Error("Insufficient tokens. Please recharge your account.");
    }
    return true;
};

/**
 * Validations
 */
const canUploadFile = async (userId) => hasTokens(userId, 10000); // Cost for processing a file
const canAddWebsite = async (userId) => hasTokens(userId, 5000); // Cost for scraping a site
const canSendMessage = async (userId) => hasTokens(userId, 100); // Check min required for start

module.exports = {
    canUploadFile,
    canAddWebsite,
    canSendMessage
};

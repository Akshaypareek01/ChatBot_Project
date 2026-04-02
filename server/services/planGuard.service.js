const User = require('../models/User');
const planLimit = require('./planLimit.service');

/**
 * Check if user has enough tokens for an action
 */
const hasTokens = async (userId, estimatedCost = 100) => {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    if (user.tokenBalance <= 0) {
        throw new Error("Your chatbot has been paused due to zero balance. Please recharge to resume.");
    }

    if (user.tokenBalance < estimatedCost) {
        throw new Error("Insufficient tokens. Please recharge your account.");
    }
    return true;
};

// Rate limiting state (In-memory for simplicity)
const chatBurstMap = new Map(); // userId -> { count, lastReset }

/**
 * Validations (Phase 4: plan limits + tokens)
 */
const canUploadFile = async (userId) => {
    await planLimit.checkSourcesLimit(userId);
    return hasTokens(userId, 10000);
};

const canAddWebsite = async (userId) => {
    await planLimit.checkSourcesLimit(userId);
    return hasTokens(userId, 5000);
};

const canSendMessage = async (userId) => {
    // 1. Plan chat limit (Phase 4)
    await planLimit.checkChatLimit(userId);
    // 2. Check Tokens
    await hasTokens(userId, 100);

    // 3. Burst Rate Limiting (5 msgs / minute)
    const now = Date.now();
    const userBurst = chatBurstMap.get(userId) || { count: 0, lastReset: now };

    if (now - userBurst.lastReset > 60000) {
        userBurst.count = 1;
        userBurst.lastReset = now;
    } else {
        userBurst.count++;
        if (userBurst.count > 5) {
            throw new Error("Rate limit exceeded. Please wait a minute.");
        }
    }
    chatBurstMap.set(userId, userBurst);

    return true;
};

module.exports = {
    canUploadFile,
    canAddWebsite,
    canSendMessage
};

const User = require('../models/User');
const emailService = require('./email.service');

// Constants
const TOKENS_PER_INR = 5000; // 1 INR = 5000 Tokens (Generous buffer)
const LOW_BALANCE_THRESHOLD = 10000; // Warn when ~2 conversations left

/**
 * Deduct tokens from user balance
 * @param {string} userId 
 * @param {number} tokensToDeduct 
 * @returns {Promise<number>} New balance
 */
const deductTokens = async (userId, tokensToDeduct) => {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    user.tokenBalance = Math.max(0, user.tokenBalance - tokensToDeduct);
    await user.save();

    // Check triggers
    if (user.tokenBalance === 0) {
        // Trigger Empty Email (Throttle this in production!)
        // We might want to check if email was already sent recently to avoid spamming.
        // For MVP, we just send.
        await emailService.sendEmptyBalanceEmail(user.email, user.name);
    } else if (user.tokenBalance < LOW_BALANCE_THRESHOLD && user.tokenBalance + tokensToDeduct >= LOW_BALANCE_THRESHOLD) {
        // Just crossed the threshold downwards
        await emailService.sendLowBalanceEmail(user.email, user.name, user.tokenBalance);
    }

    return user.tokenBalance;
};

/**
 * Add tokens (Recharge)
 * @param {string} userId 
 * @param {number} amountInINR 
 */
const rechargeTokens = async (userId, amountInINR) => {
    const tokensToAdd = amountInINR * TOKENS_PER_INR;
    const user = await User.findByIdAndUpdate(userId, {
        $inc: { tokenBalance: tokensToAdd }
    }, { new: true });

    return user.tokenBalance;
};

const trackFileUpload = async (userId) => {
    return await deductTokens(userId, 10000);
};

const trackWebsiteScrape = async (userId) => {
    return await deductTokens(userId, 5000);
};

module.exports = {
    deductTokens,
    rechargeTokens,
    trackFileUpload,
    trackWebsiteScrape,
    TOKENS_PER_INR
};

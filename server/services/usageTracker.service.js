const User = require('../models/User');
const Usage = require('../models/Usage');
const emailService = require('./email.service');

// Constants
const TOKENS_PER_INR = 2500; // Updated: 1 INR = 2500 Tokens (Strategic Profitability)
const AVG_TOKENS_PER_CHAT = 1800; // Industry avg for RAG (Question + Context + Search)
const LOW_BALANCE_THRESHOLD = 5000; // ~3 chats left

/**
 * Deduct tokens from user balance and log usage
 * @param {string} userId 
 * @param {number} tokensToDeduct 
 * @param {string} type - 'chat', 'upload', 'scrape'
 * @param {string} description 
 * @returns {Promise<number>} New balance
 */
const deductTokens = async (userId, tokensToDeduct, type = 'chat', description = 'AI Response') => {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    const oldBalance = user.tokenBalance;
    user.tokenBalance = Math.max(0, user.tokenBalance - tokensToDeduct);

    // Calculate current percentage
    const benchmark = Math.max(250000, user.tokenBalance + tokensToDeduct);
    const percentage = (user.tokenBalance / benchmark) * 100;

    // Trigger Emails
    if (user.tokenBalance === 0 && oldBalance > 0) {
        await emailService.sendEmptyBalanceEmail(user.email, user.name);
        user.lastAlertThreshold = 0;
    } else if (percentage <= 5 && user.lastAlertThreshold > 5) {
        await emailService.sendLowBalanceEmail(user.email, user.name, user.tokenBalance);
        user.lastAlertThreshold = 5;
    } else if (percentage <= 10 && user.lastAlertThreshold > 10) {
        await emailService.sendLowBalanceEmail(user.email, user.name, user.tokenBalance);
        user.lastAlertThreshold = 10;
    } else if (percentage <= 25 && user.lastAlertThreshold > 25) {
        await emailService.sendLowBalanceEmail(user.email, user.name, user.tokenBalance);
        user.lastAlertThreshold = 25;
    }

    await user.save();

    // LOG DETAILED USAGE
    try {
        await Usage.create({
            userId,
            type,
            description,
            tokensUsed: tokensToDeduct
        });
    } catch (err) {
        console.error("Failed to log usage:", err);
    }

    return user.tokenBalance;
};

/**
 * Add tokens (Recharge) with Tiered Bonus Logic
 * @param {string} userId 
 * @param {number} amountInINR 
 */
const rechargeTokens = async (userId, amountInINR) => {
    let baseTokens = amountInINR * TOKENS_PER_INR;
    let bonusMultiplier = 1.0;

    // Strategic Bonus Tiers
    if (amountInINR >= 999) {
        bonusMultiplier = 1.15; // +15%
    } else if (amountInINR >= 499) {
        bonusMultiplier = 1.10; // +10%
    } else if (amountInINR >= 199) {
        bonusMultiplier = 1.05; // +5%
    }

    const totalTokens = Math.floor(baseTokens * bonusMultiplier);

    const user = await User.findByIdAndUpdate(userId, {
        $inc: { tokenBalance: totalTokens },
        $set: { lastAlertThreshold: 100 }
    }, { new: true });

    return user.tokenBalance;
};

/**
 * Get estimated chats remaining
 * @param {number} tokenBalance 
 * @returns {number}
 */
const getEstimatedChats = (tokenBalance) => {
    return Math.floor(tokenBalance / AVG_TOKENS_PER_CHAT);
};

const trackFileUpload = async (userId, fileName) => {
    return await deductTokens(userId, 10000, 'upload', `File: ${fileName}`);
};

const trackWebsiteScrape = async (userId, url) => {
    return await deductTokens(userId, 5000, 'scrape', `URL: ${url}`);
};

module.exports = {
    deductTokens,
    rechargeTokens,
    trackFileUpload,
    trackWebsiteScrape,
    TOKENS_PER_INR
};

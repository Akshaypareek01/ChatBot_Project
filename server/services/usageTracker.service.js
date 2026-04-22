const User = require('../models/User');
const Usage = require('../models/Usage');
const emailService = require('./email.service');
const notificationService = require('./notification.service');
const webhookService = require('./webhook.service');

/**
 * ====== PRICING & CREDIT ECONOMICS ======
 *
 * Credits are the user-facing unit. 1 chat = 100 credits (fixed, predictable).
 * The pricing ladder is intentionally cheaper-per-chat at higher tiers to
 * incentivize upsell. Every tier is priced to defend 85%+ gross margin at an
 * all-in cost of ~₹0.20/chat.
 */
const CREDITS_PER_CHAT = 100;
const CREDITS_PER_CACHED_CHAT = 50; // Half — cache hits cost us ~₹0
const CREDITS_PER_UPLOAD = 500;     // Embedding + parsing
const CREDITS_PER_SCRAPE = 200;     // Crawl + embedding
const CREDITS_REFERRAL_BONUS = 500; // 5 free chats for sponsor
const FREE_TRIAL_CREDITS = 500;     // 5 free chats on signup (enough to evaluate)
const LOW_BALANCE_THRESHOLD = 300;  // ~3 chats remaining
const MIN_RECHARGE_INR = 99;

/** Canonical tiered pricing. Source of truth for backend + frontend. */
const PRICING_TIERS = [
    { amount: 99,   credits: 2500,  chats: 25,  label: 'Starter' },
    { amount: 299,  credits: 9000,  chats: 90,  label: 'Growth', popular: true },
    { amount: 799,  credits: 28000, chats: 280, label: 'Scale', best: true },
    { amount: 1999, credits: 80000, chats: 800, label: 'Business' },
];

/** Base ratio for custom (non-tier) amounts — uses the Starter tier ratio. */
const BASE_CREDITS_PER_INR = PRICING_TIERS[0].credits / PRICING_TIERS[0].amount; // ~25.25

/** Bonus multipliers on custom amounts (no bonus erodes the entry tier). */
const getBonusMultiplier = (amountInINR) => {
    if (amountInINR >= 1500) return 1.10;
    if (amountInINR >= 500) return 1.05;
    return 1.0;
};

/**
 * Compute credits earned for a given INR amount.
 * - Exact tier match → use the tier's credit grant.
 * - Custom amount → proportional at base ratio, with tier-based bonus.
 */
const computeCreditsForAmount = (amountInINR) => {
    const amount = Math.max(0, Math.floor(Number(amountInINR) || 0));
    const exact = PRICING_TIERS.find(t => t.amount === amount);
    if (exact) return exact.credits;
    const base = Math.floor(amount * BASE_CREDITS_PER_INR);
    return Math.floor(base * getBonusMultiplier(amount));
};

/**
 * Deduct credits from user balance and log usage.
 * @param {string} userId
 * @param {number} creditsToDeduct
 * @param {'chat'|'upload'|'scrape'} type
 * @param {string} description
 * @returns {Promise<number>} new balance
 */
const deductTokens = async (userId, creditsToDeduct, type = 'chat', description = 'AI Response') => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const oldBalance = user.tokenBalance;
    user.tokenBalance = Math.max(0, user.tokenBalance - creditsToDeduct);

    // Benchmark for percentage alerts — use last known peak or a sensible floor.
    const benchmark = Math.max(10000, user.tokenBalance + creditsToDeduct);
    const percentage = (user.tokenBalance / benchmark) * 100;

    const fmtChats = (credits) => Math.floor(credits / CREDITS_PER_CHAT);

    // Alert cascade: 25% → 10% → 5% → empty
    if (user.tokenBalance === 0 && oldBalance > 0) {
        await emailService.sendEmptyBalanceEmail(user.email, user.name, userId);
        user.lastAlertThreshold = 0;
        notificationService.create(userId, 'low_balance', 'Credit balance empty', 'Your chatbot has stopped. Recharge to reactivate.', { balance: 0 }).catch(() => {});
        webhookService.triggerWebhooks(userId, 'token_low', { balance: 0 }).catch(() => {});
    } else if (percentage <= 5 && user.lastAlertThreshold > 5) {
        await emailService.sendLowBalanceEmail(user.email, user.name, user.tokenBalance, userId);
        user.lastAlertThreshold = 5;
        notificationService.create(userId, 'low_balance', 'Low credit balance', `${user.tokenBalance.toLocaleString()} credits left (~${fmtChats(user.tokenBalance)} chats).`, { balance: user.tokenBalance }).catch(() => {});
        webhookService.triggerWebhooks(userId, 'token_low', { balance: user.tokenBalance }).catch(() => {});
    } else if (percentage <= 10 && user.lastAlertThreshold > 10) {
        await emailService.sendLowBalanceEmail(user.email, user.name, user.tokenBalance, userId);
        user.lastAlertThreshold = 10;
        notificationService.create(userId, 'low_balance', 'Low credit balance', `${user.tokenBalance.toLocaleString()} credits remaining (~${fmtChats(user.tokenBalance)} chats).`, { balance: user.tokenBalance }).catch(() => {});
        webhookService.triggerWebhooks(userId, 'token_low', { balance: user.tokenBalance }).catch(() => {});
    } else if (percentage <= 25 && user.lastAlertThreshold > 25) {
        await emailService.sendLowBalanceEmail(user.email, user.name, user.tokenBalance, userId);
        user.lastAlertThreshold = 25;
        notificationService.create(userId, 'low_balance', 'Credit balance alert', `You have ${user.tokenBalance.toLocaleString()} credits left (~${fmtChats(user.tokenBalance)} chats). Consider recharging.`, { balance: user.tokenBalance }).catch(() => {});
        webhookService.triggerWebhooks(userId, 'token_low', { balance: user.tokenBalance }).catch(() => {});
    }

    await user.save();

    try {
        await Usage.create({
            userId,
            type,
            description,
            tokensUsed: creditsToDeduct,
        });
    } catch (err) {
        console.error('Failed to log usage:', err);
    }

    return user.tokenBalance;
};

/**
 * Add credits (recharge) using the tiered pricing table.
 * @param {string} userId
 * @param {number} amountInINR
 * @returns {Promise<number>} new balance
 */
const rechargeTokens = async (userId, amountInINR) => {
    const credits = computeCreditsForAmount(amountInINR);

    const user = await User.findByIdAndUpdate(
        userId,
        {
            $inc: { tokenBalance: credits },
            $set: { lastAlertThreshold: 100 },
        },
        { new: true }
    );

    return user.tokenBalance;
};

/** Add bonus credits (e.g., referral credit) without a payment. */
const addBonusTokens = async (userId, credits) => {
    if (!userId || credits <= 0) return 0;
    const user = await User.findByIdAndUpdate(userId, { $inc: { tokenBalance: credits } }, { new: true });
    return user ? user.tokenBalance : 0;
};

/** Estimate remaining chats from a credit balance. */
const getEstimatedChats = (creditBalance) => Math.floor((creditBalance || 0) / CREDITS_PER_CHAT);

const trackFileUpload = async (userId, fileName) =>
    deductTokens(userId, CREDITS_PER_UPLOAD, 'upload', `File: ${fileName}`);

const trackWebsiteScrape = async (userId, url) =>
    deductTokens(userId, CREDITS_PER_SCRAPE, 'scrape', `URL: ${url}`);

module.exports = {
    deductTokens,
    rechargeTokens,
    addBonusTokens,
    trackFileUpload,
    trackWebsiteScrape,
    computeCreditsForAmount,
    getEstimatedChats,
    PRICING_TIERS,
    CREDITS_PER_CHAT,
    CREDITS_PER_CACHED_CHAT,
    CREDITS_PER_UPLOAD,
    CREDITS_PER_SCRAPE,
    CREDITS_REFERRAL_BONUS,
    FREE_TRIAL_CREDITS,
    LOW_BALANCE_THRESHOLD,
    MIN_RECHARGE_INR,
    // Legacy export alias (kept for backwards compatibility with callers expecting it).
    TOKENS_PER_INR: BASE_CREDITS_PER_INR,
};

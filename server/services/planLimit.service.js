/**
 * Phase 4: Plan limits and usage (chats per month, sources).
 * Free tier: 100 chats/month, 3 sources. Others from Plan model.
 */

const User = require('../models/User');
const Plan = require('../models/Plan');
const Conversation = require('../models/Conversation');
const Source = require('../models/Source');

const FREE_CHAT_LIMIT = 100;
const FREE_SOURCES_LIMIT = 3;

/** Start of current month UTC */
function startOfCurrentMonth() {
    const d = new Date();
    d.setUTCDate(1);
    d.setUTCHours(0, 0, 0, 0);
    return d;
}

/**
 * Get plan for user (or free tier defaults). Returns { plan, chatLimit, sourcesLimit }.
 */
async function getPlanForUser(userId) {
    const user = await User.findById(userId).select('planId').lean();
    if (!user) return null;
    let plan = null;
    if (user.planId) {
        plan = await Plan.findOne({ _id: user.planId, isActive: true }).lean();
    }
    const chatLimit = plan?.chatLimitPerMonth ?? FREE_CHAT_LIMIT;
    const sourcesLimit = plan?.sourcesLimit ?? FREE_SOURCES_LIMIT;
    return { plan, chatLimit, sourcesLimit };
}

/**
 * Get current month chat count for user.
 */
async function getChatCountThisMonth(userId) {
    const start = startOfCurrentMonth();
    return Conversation.countDocuments({ userId, startedAt: { $gte: start } });
}

/**
 * Get sources count for user.
 */
async function getSourcesCount(userId) {
    return Source.countDocuments({ userId });
}

/**
 * Get usage summary for dashboard: { chatCountThisMonth, chatLimit, sourcesCount, sourcesLimit, plan, isOverChatLimit, isOverSourcesLimit }.
 */
async function getUsageSummary(userId) {
    const planInfo = await getPlanForUser(userId);
    if (!planInfo) return null;
    const [chatCountThisMonth, sourcesCount] = await Promise.all([
        getChatCountThisMonth(userId),
        getSourcesCount(userId)
    ]);
    const { plan, chatLimit, sourcesLimit } = planInfo;
    const isOverChatLimit = chatLimit > 0 && chatCountThisMonth >= chatLimit;
    const isOverSourcesLimit = sourcesCount >= sourcesLimit;
    return {
        plan: plan ? { _id: plan._id, name: plan.name, slug: plan.slug, priceMonthly: plan.priceMonthly, priceYearly: plan.priceYearly, whitelabel: !!plan.whitelabel } : { slug: 'free', name: 'Free', whitelabel: false },
        chatCountThisMonth,
        chatLimit: chatLimit || null,
        sourcesCount,
        sourcesLimit,
        isOverChatLimit,
        isOverSourcesLimit
    };
}

/**
 * Check if user can send a chat (under plan limit). Throws if over limit.
 */
async function checkChatLimit(userId) {
    const planInfo = await getPlanForUser(userId);
    if (!planInfo) throw new Error('User not found');
    const { chatLimit } = planInfo;
    if (chatLimit === 0) return; // unlimited
    const count = await getChatCountThisMonth(userId);
    if (count >= chatLimit) {
        throw new Error(`Monthly chat limit (${chatLimit}) reached. Please upgrade to continue.`);
    }
}

/**
 * Check if user can add a source. Throws if at limit.
 */
async function checkSourcesLimit(userId) {
    const planInfo = await getPlanForUser(userId);
    if (!planInfo) throw new Error('User not found');
    const { sourcesLimit } = planInfo;
    const count = await getSourcesCount(userId);
    if (count >= sourcesLimit) {
        throw new Error(`Source limit (${sourcesLimit}) reached. Please upgrade to add more.`);
    }
}

module.exports = {
    getPlanForUser,
    getChatCountThisMonth,
    getSourcesCount,
    getUsageSummary,
    checkChatLimit,
    checkSourcesLimit,
    startOfCurrentMonth,
    FREE_CHAT_LIMIT,
    FREE_SOURCES_LIMIT
};

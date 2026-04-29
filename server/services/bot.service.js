/**
 * Phase 3.5: Multi-bot — ensure default bot, list/create bots.
 *
 * Enterprise Flow Builder additions:
 *   - setBotBehavior(userId, botId, { mode, activeFlowId }) : switch the bot between
 *     Default AI (KB-grounded) and a published flow.
 *   - resolveBotResponder(userId, botId) : returns a small descriptor used by the
 *     chatbot controller to decide which runtime path to invoke for an incoming visitor
 *     message. This replaces the old "find an isActive ChatFlow" lookup while keeping
 *     full back-compat for bots that were never touched.
 */

const Bot = require('../models/Bot');
const ChatFlow = require('../models/ChatFlow');
const WidgetConfig = require('../models/WidgetConfig');

/**
 * Ensure user has a default bot. Create if none. Returns the default bot.
 */
async function ensureDefaultBot(userId) {
    let bot = await Bot.findOne({ userId, slug: 'default' }).lean();
    if (!bot) {
        const created = await Bot.create({
            userId,
            name: 'Default',
            slug: 'default'
        });
        bot = created.toObject();
        // Ensure widget config exists for this bot (migrate existing config to this botId if any)
        const existingConfig = await WidgetConfig.findOne({ userId, botId: null });
        if (existingConfig) {
            await WidgetConfig.updateOne(
                { _id: existingConfig._id },
                { $set: { botId: created._id } }
            );
        } else {
            await WidgetConfig.create({
                userId,
                botId: created._id,
                primaryColor: '#2563EB',
                accentColor: '#22D3EE',
                position: 'bottom-right',
                size: 'standard',
                showPoweredBy: true,
                allowTalkToHuman: false,
                noAnswerMessage: "I don't have this information yet."
            });
        }
    }
    return bot;
}

/**
 * List all bots for user. Ensures default exists.
 */
async function listBots(userId) {
    await ensureDefaultBot(userId);
    return Bot.find({ userId }).sort({ createdAt: 1 }).lean();
}

/**
 * Create a new bot. Returns the new bot.
 */
async function createBot(userId, name, slug) {
    const safeSlug = (slug || name || 'bot').toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-').slice(0, 32) || 'bot';
    const existing = await Bot.findOne({ userId, slug: safeSlug });
    if (existing) throw new Error('A bot with this slug already exists');
    const bot = await Bot.create({
        userId,
        name: name || 'My Chatbot',
        slug: safeSlug
    });
    await WidgetConfig.create({
        userId,
        botId: bot._id,
        primaryColor: '#2563EB',
        accentColor: '#22D3EE',
        position: 'bottom-right',
        size: 'standard',
        showPoweredBy: true,
        allowTalkToHuman: false,
        noAnswerMessage: "I don't have this information yet."
    });
    return bot.toObject();
}

/**
 * Update bot name/slug. Returns updated bot.
 */
async function updateBot(userId, botId, updates) {
    const bot = await Bot.findOne({ _id: botId, userId });
    if (!bot) return null;
    if (updates.name !== undefined) bot.name = updates.name;
    if (updates.slug !== undefined) {
        const safe = updates.slug.toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-').slice(0, 32);
        if (safe && safe !== 'default') bot.slug = safe;
    }
    bot.updatedAt = new Date();
    await bot.save();
    return bot.toObject();
}

/**
 * Get bot by id (must belong to user).
 */
async function getBot(userId, botId) {
    return Bot.findOne({ _id: botId, userId }).lean();
}

/**
 * Switch a bot between Default AI mode and Active Flow mode.
 *
 * @param {string} userId
 * @param {string} botId
 * @param {{ mode: 'default'|'flow', activeFlowId?: string|null }} input
 * @returns {Promise<object>} the updated bot.
 * @throws {Error} when the requested flow is missing, not published, or owned by someone else.
 */
async function setBotBehavior(userId, botId, input) {
    const mode = input?.mode === 'flow' ? 'flow' : 'default';
    const bot = await Bot.findOne({ _id: botId, userId });
    if (!bot) throw new Error('Bot not found');

    if (mode === 'flow') {
        const flowId = input?.activeFlowId;
        if (!flowId) throw new Error('activeFlowId is required when mode is "flow"');
        const flow = await ChatFlow.findOne({
            _id: flowId,
            userId,
            $or: [{ botId: bot._id }, { botId: null }]
        }).select('_id status').lean();
        if (!flow) throw new Error('Flow not found or not owned by this bot');
        if (flow.status !== 'published') {
            throw new Error('Only published flows can be activated. Publish the flow first.');
        }
        bot.behaviorMode = 'flow';
        bot.activeFlowId = flow._id;
    } else {
        bot.behaviorMode = 'default';
        bot.activeFlowId = null;
    }
    bot.updatedAt = new Date();
    await bot.save();
    return bot.toObject();
}

/**
 * Decide how an incoming visitor message should be answered.
 *
 * Resolution order:
 *   1. If Bot.behaviorMode === 'flow' and Bot.activeFlowId points to a published
 *      flow owned by the same user -> return that flow.
 *   2. Otherwise (back-compat for bots that pre-date behaviorMode) check for a
 *      legacy ChatFlow with `isActive: true` on this bot.
 *   3. If neither, return { kind: 'default' } so the controller falls through
 *      to the existing AI/RAG pipeline.
 *
 * @param {string} userId
 * @param {string|null} botId
 * @returns {Promise<{ kind: 'flow', flow: object } | { kind: 'default' }>}
 */
async function resolveBotResponder(userId, botId) {
    const bot = await Bot.findOne({ _id: botId, userId })
        .select('behaviorMode activeFlowId')
        .lean();

    if (bot && bot.behaviorMode === 'flow' && bot.activeFlowId) {
        const flow = await ChatFlow.findOne({
            _id: bot.activeFlowId,
            userId,
            status: 'published'
        }).lean();
        if (flow) return { kind: 'flow', flow };
        // explicit miss: configured flow no longer exists or was unpublished -> degrade gracefully
    }

    // Legacy fallback: any flow with isActive: true on this bot.
    const legacyActive = await ChatFlow.findOne({
        userId,
        botId: botId || null,
        isActive: true
    }).lean();
    if (legacyActive) return { kind: 'flow', flow: legacyActive };

    return { kind: 'default' };
}

module.exports = {
    ensureDefaultBot,
    listBots,
    createBot,
    updateBot,
    getBot,
    setBotBehavior,
    resolveBotResponder
};

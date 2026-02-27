/**
 * Phase 3.5: Multi-bot — ensure default bot, list/create bots.
 */

const Bot = require('../models/Bot');
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
                showPoweredBy: true
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
        showPoweredBy: true
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

module.exports = {
    ensureDefaultBot,
    listBots,
    createBot,
    updateBot,
    getBot
};

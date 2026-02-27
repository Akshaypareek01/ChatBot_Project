const User = require('../models/User');
const Usage = require('../models/Usage');
const AuditLog = require('../models/AuditLog');
const Source = require('../models/Source');
const WidgetConfig = require('../models/WidgetConfig');
const Conversation = require('../models/Conversation');
const QA = require('../models/QA');
const Vector = require('../models/Vector');
const r2Storage = require('../services/r2Storage.service');
const analyticsService = require('../services/analytics.service');
const notificationService = require('../services/notification.service');
const botService = require('../services/bot.service');
const Notification = require('../models/Notification');
const Bot = require('../models/Bot');

/** Knowledge base health: chunks count, sources count, last updated */
async function getKnowledgeBaseHealth(userId) {
    const [totalChunks, sources] = await Promise.all([
        Vector.countDocuments({ userId }),
        Source.find({ userId }).select('updatedAt type status').sort({ updatedAt: -1 }).lean()
    ]);
    const lastUpdated = sources.length ? new Date(Math.max(...sources.map((s) => new Date(s.updatedAt).getTime()))) : null;
    return {
        totalChunks,
        totalSources: sources.length,
        lastUpdated: lastUpdated ? lastUpdated.toISOString() : null,
        byType: { file: sources.filter((s) => s.type === 'file').length, website: sources.filter((s) => s.type === 'website').length, paste: sources.filter((s) => s.type === 'paste').length }
    };
}
const bcrypt = require('bcrypt');
const audit = require('../services/audit.service');
const tokenService = require('../services/token.service');

const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json(user);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const updateProfile = async (req, res) => {
    try {
        const { name, website, brandName, onboardingCompleted } = req.body;

        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (name !== undefined) user.name = name;
        if (website !== undefined) user.website = website;
        if (brandName !== undefined) user.brandName = brandName;
        if (onboardingCompleted === true) user.onboardingCompletedAt = user.onboardingCompletedAt || new Date();

        await user.save();

        return res.status(200).json({
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                website: user.website,
                brandName: user.brandName,
                allowedDomains: user.allowedDomains
            }
        });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        user.password = hashedPassword;
        await user.save();

        return res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const updateAllowedDomains = async (req, res) => {
    try {
        const { allowedDomains } = req.body;
        if (!Array.isArray(allowedDomains)) {
            return res.status(400).json({ message: "Allowed domains must be an array" });
        }

        const user = await User.findByIdAndUpdate(
            req.userId,
            { allowedDomains },
            { new: true }
        ).select('allowedDomains');

        return res.json({ message: "Domains updated", allowedDomains: user.allowedDomains });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const getUsageHistory = async (req, res) => {
    try {
        const history = await Usage.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(100);
        return res.json(history);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/** GDPR: Export all data we hold for the current user. */
const exportMyData = async (req, res) => {
    try {
        const userId = req.userId;
        const [user, usage, sources, auditLogs] = await Promise.all([
            User.findById(userId).select('-password -totpSecret -verificationOTP -resetOTP').lean(),
            Usage.find({ userId }).sort({ createdAt: -1 }).lean(),
            Source.find({ userId }).select('type fileName url status createdAt').lean(),
            AuditLog.find({ $or: [{ actorId: userId }, { targetId: userId }] }).sort({ createdAt: -1 }).limit(500).lean()
        ]);
        if (!user) return res.status(404).json({ message: 'User not found' });
        audit.log('gdpr_export', { actorId: userId, ...audit.getReqMeta(req) });
        return res.status(200).json({
            exportedAt: new Date().toISOString(),
            user,
            usage,
            sources,
            auditLogs
        });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/** GDPR: Delete account and related data (anonymize user, delete tokens, keep audit trail anonymized). */
const deleteMyData = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        await tokenService.revokeAllSessions(userId);
        user.name = 'Deleted User';
        user.email = `deleted-${userId}@deleted.local`;
        user.password = await bcrypt.hash(require('crypto').randomBytes(16).toString('hex'), 10);
        user.website = '';
        user.brandName = '';
        user.isActive = false;
        user.verificationOTP = undefined;
        user.verificationOTPExpires = undefined;
        user.resetOTP = undefined;
        user.resetOTPExpires = undefined;
        user.totpSecret = undefined;
        user.totpEnabled = false;
        user.allowedDomains = [];
        await user.save();
        audit.log('gdpr_delete', { actorId: userId, targetId: userId, targetType: 'User', ...audit.getReqMeta(req) });
        return res.status(200).json({ message: 'Account and personal data have been deleted.' });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/** List conversations for the current user (paginated). */
const getConversations = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const skip = (page - 1) * limit;
        const status = req.query.status;
        const keyword = (req.query.keyword || '').trim();
        const dateFrom = req.query.dateFrom;
        const dateTo = req.query.dateTo;
        const feedbackFilter = req.query.feedback;

        const q = { userId: req.userId };
        if (req.query.botId) q.botId = req.query.botId;
        if (status) q.status = status;
        if (feedbackFilter === 'negative') {
            q['messages.feedback'] = -1;
        }
        if (dateFrom || dateTo) {
            q.startedAt = {};
            if (dateFrom) q.startedAt.$gte = new Date(dateFrom);
            if (dateTo) q.startedAt.$lte = new Date(dateTo);
        }
        if (keyword) {
            q['messages.content'] = { $regex: keyword, $options: 'i' };
        }

        const [list, total] = await Promise.all([
            Conversation.find(q).sort({ startedAt: -1 }).skip(skip).limit(limit).lean(),
            Conversation.countDocuments(q)
        ]);
        return res.json({ conversations: list, total, page, limit });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/** Get a single conversation by id (must belong to user). */
const getConversationById = async (req, res) => {
    try {
        const conv = await Conversation.findOne({ _id: req.params.id, userId: req.userId }).lean();
        if (!conv) return res.status(404).json({ message: 'Conversation not found' });
        return res.json(conv);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/** Update conversation (status, rating) - owner only. */
const updateConversation = async (req, res) => {
    try {
        const updates = {};
        if (req.body.status !== undefined) updates.status = req.body.status;
        if (req.body.rating !== undefined) updates.rating = req.body.rating;
        const conv = await Conversation.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            { $set: updates },
            { new: true }
        ).lean();
        if (!conv) return res.status(404).json({ message: 'Conversation not found' });
        return res.json(conv);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/** Export leads (conversations with leadInfo) as CSV. */
const exportLeads = async (req, res) => {
    try {
        const convs = await Conversation.find({
            userId: req.userId,
            $or: [
                { 'leadInfo.email': { $exists: true, $ne: '' } },
                { 'leadInfo.phone': { $exists: true, $ne: '' } },
                { 'leadInfo.name': { $exists: true, $ne: '' } }
            ]
        }).sort({ startedAt: -1 }).limit(2000).lean();
        const header = 'Conversation ID,Visitor ID,Name,Email,Phone,Started\n';
        const rows = convs.map((c) => {
            const id = String(c._id);
            const visitor = (c.visitorId || '').replace(/"/g, '""');
            const name = (c.leadInfo?.name || '').replace(/"/g, '""');
            const email = (c.leadInfo?.email || '').replace(/"/g, '""');
            const phone = (c.leadInfo?.phone || '').replace(/"/g, '""');
            const started = c.startedAt ? new Date(c.startedAt).toISOString() : '';
            return `"${id}","${visitor}","${name}","${email}","${phone}","${started}"`;
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
        return res.send(header + rows.join('\n'));
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/** Export conversations as CSV. */
const exportConversations = async (req, res) => {
    try {
        const convs = await Conversation.find({ userId: req.userId }).sort({ startedAt: -1 }).limit(1000).lean();
        const header = 'Conversation ID,Visitor ID,Started,Status,Messages\n';
        const rows = convs.map((c) => {
            const msgCount = (c.messages && c.messages.length) || 0;
            const started = c.startedAt ? new Date(c.startedAt).toISOString() : '';
            const id = String(c._id);
            const visitor = (c.visitorId || '').replace(/"/g, '""');
            return `"${id}","${visitor}","${started}","${c.status || ''}",${msgCount}`;
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=conversations.csv');
        return res.send(header + rows.join('\n'));
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/** Get feedback stats (thumbs up/down) for the user's conversations. */
const getFeedbackStats = async (req, res) => {
    try {
        const convs = await Conversation.find({ userId: req.userId }).select('messages').lean();
        let positive = 0;
        let negative = 0;
        convs.forEach((c) => {
            (c.messages || []).forEach((m) => {
                if (m.feedback === 1) positive++;
                if (m.feedback === -1) negative++;
            });
        });
        const total = positive + negative;
        return res.json({
            positive,
            negative,
            total,
            percentPositive: total ? Math.round((100 * positive) / total) : null
        });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/** Auto-generate suggested questions from KB (QA by frequency + Vector chunks). */
const generateSuggestedQuestions = async (req, res) => {
    try {
        const userId = req.userId;
        const max = 5;
        const fromQA = await QA.find({ userId }).sort({ frequency: -1 }).limit(max).select('question').lean();
        const list = fromQA.map((q) => (q.question || '').trim()).filter(Boolean);
        if (list.length < max) {
            const vectors = await Vector.find({ userId }).select('chunkContent').limit(20).lean();
            const used = new Set(list);
            for (const v of vectors) {
                if (list.length >= max) break;
                const content = (v.chunkContent || '').trim();
                if (!content || used.has(content)) continue;
                const firstSentence = content.split(/[.!?]/)[0].trim().slice(0, 80);
                if (firstSentence.length > 10) {
                    list.push(firstSentence.endsWith('?') ? firstSentence : firstSentence + '?');
                    used.add(content);
                }
            }
        }
        return res.json({ suggestedQuestions: list.slice(0, max) });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/** Get knowledge base health (chunks, sources, last updated). */
const getSourcesHealth = async (req, res) => {
    try {
        const health = await getKnowledgeBaseHealth(req.userId);
        return res.json(health);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/** Analytics dashboard: chat volume, totals, token breakdown, peak hours, satisfaction, etc. */
const getAnalytics = async (req, res) => {
    try {
        const period = ['7d', '30d', '90d'].includes(req.query.period) ? req.query.period : '30d';
        const botId = req.query.botId || null;
        const data = await analyticsService.getUserAnalytics(req.userId, period, botId);
        return res.json(data);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/** Phase 3.4: List in-app notifications (paginated). */
const getNotifications = async (req, res) => {
    try {
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const before = req.query.before;
        const q = { userId: req.userId };
        if (before) q.createdAt = { $lt: new Date(before) };
        const list = await Notification.find(q).sort({ createdAt: -1 }).limit(limit).lean();
        const unreadCount = await Notification.countDocuments({ userId: req.userId, readAt: null });
        return res.json({ notifications: list, unreadCount });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/** Phase 3.4: Mark notification as read. */
const markNotificationRead = async (req, res) => {
    try {
        const n = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            { $set: { readAt: new Date() } },
            { new: true }
        ).lean();
        if (!n) return res.status(404).json({ message: 'Notification not found' });
        return res.json(n);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/** Phase 3.4: Get notification preferences. */
const getNotificationPrefs = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('emailOnNewLead emailOnLowBalance emailSummary').lean();
        if (!user) return res.status(404).json({ message: 'User not found' });
        return res.json({
            emailOnNewLead: user.emailOnNewLead !== false,
            emailOnLowBalance: user.emailOnLowBalance !== false,
            emailSummary: user.emailSummary || 'weekly'
        });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/** Phase 3.5: List bots for current user (ensures default bot exists). */
const listBots = async (req, res) => {
    try {
        const bots = await botService.listBots(req.userId);
        return res.json({ bots });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/** Phase 3.5: Create a new bot. */
const createBot = async (req, res) => {
    try {
        const { name, slug } = req.body;
        const bot = await botService.createBot(req.userId, name, slug);
        return res.status(201).json(bot);
    } catch (error) {
        if (error.message && error.message.includes('already exists')) {
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/** Phase 3.5: Update bot (name/slug). */
const updateBot = async (req, res) => {
    try {
        const bot = await botService.updateBot(req.userId, req.params.id, req.body);
        if (!bot) return res.status(404).json({ message: 'Bot not found' });
        return res.json(bot);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/** Phase 3.4: Update notification preferences. */
const updateNotificationPrefs = async (req, res) => {
    try {
        const updates = {};
        if (req.body.emailOnNewLead !== undefined) updates.emailOnNewLead = !!req.body.emailOnNewLead;
        if (req.body.emailOnLowBalance !== undefined) updates.emailOnLowBalance = !!req.body.emailOnLowBalance;
        if (['none', 'daily', 'weekly'].includes(req.body.emailSummary)) updates.emailSummary = req.body.emailSummary;
        const user = await User.findByIdAndUpdate(req.userId, { $set: updates }, { new: true })
            .select('emailOnNewLead emailOnLowBalance emailSummary').lean();
        return res.json(user);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/** Get widget customization config for the current user (optional botId for multi-bot). */
const getWidgetConfig = async (req, res) => {
    try {
        let botId = req.query.botId || req.body?.botId;
        if (!botId) {
            const defaultBot = await botService.ensureDefaultBot(req.userId);
            botId = defaultBot._id;
        }
        let config = await WidgetConfig.findOne({ userId: req.userId, botId }).lean();
        if (!config) {
            const defaultBot = await botService.ensureDefaultBot(req.userId);
            botId = defaultBot._id;
            config = await WidgetConfig.findOne({ userId: req.userId, botId }).lean();
            if (!config) {
                const legacy = await WidgetConfig.findOne({ userId: req.userId, $or: [{ botId: null }, { botId: { $exists: false } }] }).lean();
                if (legacy) {
                    await WidgetConfig.updateOne({ _id: legacy._id }, { $set: { botId } });
                    config = await WidgetConfig.findOne({ _id: legacy._id }).lean();
                }
            }
            if (!config) {
                config = await WidgetConfig.create({
                    userId: req.userId,
                    botId,
                    primaryColor: '#2563EB',
                    accentColor: '#22D3EE',
                    position: 'bottom-right',
                    size: 'standard',
                    showPoweredBy: true
                });
                config = config.toObject();
            }
        }
        const { userId, __v, ...rest } = config;
        return res.json(rest);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/** Upload widget bot avatar (image). Stores in R2 and sets botAvatarUrl. */
const uploadWidgetAvatar = async (req, res) => {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({ message: 'No image file uploaded.' });
        }
        const userId = req.userId;
        const ext = (req.file.mimetype === 'image/png') ? 'png' : (req.file.mimetype === 'image/webp') ? 'webp' : 'jpg';
        const key = `widget-avatars/${userId}.${ext}`;
        await r2Storage.uploadToR2(key, req.file.buffer, req.file.mimetype);
        const url = r2Storage.getPublicUrl(key);
        if (!url) {
            return res.status(500).json({ message: 'Storage not configured for public URLs.' });
        }
        await WidgetConfig.findOneAndUpdate(
            { userId },
            { $set: { botAvatarUrl: url, updatedAt: new Date() } },
            { upsert: true }
        );
        return res.json({ botAvatarUrl: url });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/** Update widget customization config (optional botId). */
const updateWidgetConfig = async (req, res) => {
    try {
        let botId = req.query.botId || req.body?.botId;
        if (!botId) {
            const defaultBot = await botService.ensureDefaultBot(req.userId);
            botId = defaultBot._id;
        }
        const allowed = [
            'primaryColor', 'accentColor', 'botAvatarUrl', 'position', 'welcomeMessage',
            'botName', 'size', 'autoOpenDelay', 'customCss', 'showPoweredBy', 'preChatForm', 'suggestedQuestions', 'leadCaptureWebhookUrl'
        ];
        const updates = {};
        for (const key of allowed) {
            if (req.body[key] !== undefined) updates[key] = req.body[key];
        }
        if (updates.position && !['bottom-left', 'bottom-right'].includes(updates.position)) delete updates.position;
        if (updates.size && !['compact', 'standard', 'large'].includes(updates.size)) delete updates.size;
        if (Array.isArray(updates.suggestedQuestions)) {
            updates.suggestedQuestions = updates.suggestedQuestions.filter((s) => typeof s === 'string').slice(0, 7);
        }
        updates.updatedAt = new Date();

        let config = await WidgetConfig.findOneAndUpdate(
            { userId: req.userId, botId },
            { $set: updates },
            { new: true, runValidators: true }
        ).lean();
        if (!config) {
            await botService.ensureDefaultBot(req.userId);
            config = await WidgetConfig.findOneAndUpdate(
                { userId: req.userId, botId },
                { $set: updates },
                { new: true, upsert: true, runValidators: true }
            ).lean();
        }
        const { userId, __v, ...rest } = config;
        return res.json(rest);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    getProfile,
    updateProfile,
    updatePassword,
    updateAllowedDomains,
    getUsageHistory,
    exportMyData,
    deleteMyData,
    getConversations,
    getConversationById,
    updateConversation,
    exportConversations,
    exportLeads,
    getFeedbackStats,
    getWidgetConfig,
    updateWidgetConfig,
    uploadWidgetAvatar,
    generateSuggestedQuestions,
    getSourcesHealth,
    getAnalytics,
    getNotifications,
    markNotificationRead,
    getNotificationPrefs,
    updateNotificationPrefs,
    listBots,
    createBot,
    updateBot
};

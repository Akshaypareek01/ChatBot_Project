const QA = require('../models/QA');
const User = require('../models/User');
const { getAIResponse } = require('../services/openaiService');
const chatService = require('../services/chat.service');
const scraperService = require('../services/scraperService');
const scrapeJobStore = require('../services/scrapeJobStore.service');
const fileParserService = require('../services/fileParser.service');
const usageTracker = require('../services/usageTracker.service');
const { sanitizeInput } = require('../utils/sanitize');
const widgetTokenService = require('../services/widgetToken.service');

const Source = require('../models/Source');
const WidgetConfig = require('../models/WidgetConfig');
const Conversation = require('../models/Conversation');
const mongoose = require('mongoose');
const emailService = require('../services/email.service');
const notificationService = require('../services/notification.service');
const axios = require('axios');

const CHAT_MESSAGE_MAX_LENGTH = 1000;

// Legacy Handlers
const getAnswer = async (req, res) => {
    try {
        const { userId, question } = req.body;
        if (!userId || !question) {
            return res.status(400).json({ message: 'User ID and question are required.' });
        }
        const qa = await QA.findOne({ userId, question: { $regex: question, $options: 'i' } });
        if (qa) {
            await QA.findByIdAndUpdate(qa._id, { $inc: { frequency: 1 }, updatedAt: Date.now() });
            return res.json({ answer: qa.answer, source: 'database' });
        } else {
            return res.json({ answer: null });
        }
    } catch (error) {
        console.error('Error fetching answer:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getAIResponseController = async (req, res) => {
    try {
        const { userId, question, category = 'General' } = req.body;
        if (!userId || !question) {
            return res.status(400).json({ message: 'User ID and question are required.' });
        }
        const aiAnswer = await getAIResponse(question);
        return res.json({ answer: aiAnswer, source: 'AI-generated' });
    } catch (error) {
        console.error('Error getting AI response:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/** Prefer Origin header (set by browser, harder to spoof) over Referer for domain allowlist. */
const isDomainAllowed = (user, req) => {
    if (!user.allowedDomains || user.allowedDomains.length === 0) return true;
    const origin = req.headers.origin || req.headers.referer;
    if (!origin) return false;
    try {
        const domain = new URL(origin).hostname;
        return user.allowedDomains.some(d => {
            const pattern = d.replace('*', '.*');
            return new RegExp(`^${pattern}$`, 'i').test(domain);
        });
    } catch (e) {
        return false;
    }
};

const getChatbotData = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId).select('allowedDomains isActive brandName name email tokenBalance');
        if (!user) {
            return res.status(404).json({ message: 'Chatbot not found' });
        }

        // Domain Check
        if (!isDomainAllowed(user, req)) {
            console.warn(`Blocked init request from unauthorized domain for user ${userId}`);
            return res.status(403).json({ message: 'Domain not authorized' });
        }

        const isOffline = !user.isActive || user.tokenBalance <= 0;
        const widgetToken = widgetTokenService.issueWidgetToken(userId);

        const botSlug = req.query.bot || req.query.botId;
        let botId = req.query.botId;
        if (!botId && botSlug) {
            const Bot = require('../models/Bot');
            const bot = await Bot.findOne({ userId, slug: botSlug }).select('_id').lean();
            if (bot) botId = bot._id;
        }
        if (!botId) {
            const botService = require('../services/bot.service');
            const defaultBot = await botService.ensureDefaultBot(userId);
            botId = defaultBot._id;
        }
        const widgetConfig = await WidgetConfig.findOne({ userId, botId }).lean();
        const widget = widgetConfig ? {
            primaryColor: widgetConfig.primaryColor,
            accentColor: widgetConfig.accentColor,
            botAvatarUrl: widgetConfig.botAvatarUrl || '',
            position: widgetConfig.position,
            welcomeMessage: widgetConfig.welcomeMessage || '',
            botName: widgetConfig.botName || '',
            size: widgetConfig.size,
            autoOpenDelay: widgetConfig.autoOpenDelay,
            customCss: widgetConfig.customCss || '',
            showPoweredBy: widgetConfig.showPoweredBy,
            preChatForm: widgetConfig.preChatForm || { enabled: false, welcomeMessage: '', fields: [] },
            suggestedQuestions: Array.isArray(widgetConfig.suggestedQuestions) ? widgetConfig.suggestedQuestions.slice(0, 7) : []
        } : null;

        return res.status(200).json({
            userId,
            widgetToken,
            name: user.brandName || user.name,
            email: user.email,
            isOffline,
            isActive: user.isActive,
            tokenBalance: user.tokenBalance,
            widgetConfig: widget
        });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const getUserChatbotData = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user || !user.isActive) {
            return res.status(404).json({ message: 'Chatbot not available' });
        }
        const qas = await QA.find({ userId: req.userId });
        return res.status(200).json({
            userId: req.userId,
            name: user.brandName || user.name,
            qas
        });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const logUnanswered = async (req, res) => {
    try {
        const { userId, question } = req.body;
        console.log(`Unanswered question for user ${userId}: ${question}`);
        return res.status(200).json({ message: 'Question logged successfully' });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const updateFrequency = async (req, res) => {
    try {
        const { qaId } = req.body;
        const qa = await QA.findByIdAndUpdate(qaId, { $inc: { frequency: 1 } }, { new: true });
        if (!qa) return res.status(404).json({ message: 'QA not found' });
        return res.status(200).json({ message: 'Frequency updated successfully' });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// --- NEW HANDLERS (RAG + R2) ---

/**
 * Upload and process a file for the chatbot
 */
const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded.' });
        }
        const userId = req.body.userId || req.userId;
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required.' });
        }

        const source = await fileParserService.processFile(userId, req.file);

        // Update Knowledge Version and Log Usage
        await User.findByIdAndUpdate(userId, { $inc: { knowledgeVersion: 1 } });
        await usageTracker.trackFileUpload(userId, req.file.originalname);

        return res.json({
            message: 'File processed successfully.',
            source
        });
    } catch (error) {
        console.error("Upload error:", error);
        return res.status(500).json({ message: error.message });
    }
};

/**
 * Scrape and process a website. If maxDepth > 1, returns jobId and runs in background; poll GET /scrape/status/:jobId.
 */
const scrapeWebsite = async (req, res) => {
    try {
        const { url, maxDepth: rawDepth } = req.body;
        const userId = req.body.userId || req.userId;
        if (!userId || !url) {
            return res.status(400).json({ message: 'User ID and URL are required.' });
        }
        const maxDepth = Math.min(3, Math.max(1, parseInt(rawDepth, 10) || 1));

        if (maxDepth === 1) {
            const source = await scraperService.processWebsite(userId, url);
            await User.findByIdAndUpdate(userId, { $inc: { knowledgeVersion: 1 } });
            await usageTracker.trackWebsiteScrape(userId, url);
            return res.json({ message: 'Website processed successfully.', source });
        }

        const jobId = scrapeJobStore.createJob(userId, url, maxDepth);
        setImmediate(async () => {
            try {
                const source = await scraperService.processWebsiteMulti(userId, url, maxDepth, (data) => {
                    scrapeJobStore.updateProgress(jobId, data);
                });
                await User.findByIdAndUpdate(userId, { $inc: { knowledgeVersion: 1 } });
                scrapeJobStore.setJobDone(jobId, source._id.toString());
            } catch (err) {
                console.error('Scrape job error:', err);
                scrapeJobStore.setJobFailed(jobId, err);
            }
        });
        return res.json({ jobId, message: 'Scrape started. Poll GET /scrape/status/' + jobId + ' for progress.' });
    } catch (error) {
        console.error("Scrape error:", error);
        return res.status(500).json({ message: error.message });
    }
};

/**
 * Get scrape job progress (pages found, scraped, status).
 */
const getScrapeStatus = async (req, res) => {
    try {
        const { jobId } = req.params;
        const job = scrapeJobStore.getJob(jobId);
        if (!job) return res.status(404).json({ message: 'Job not found.' });
        if (job.userId !== req.userId?.toString()) return res.status(403).json({ message: 'Forbidden.' });
        return res.json({
            jobId: job.jobId,
            status: job.status,
            pagesFound: job.pagesFound,
            pagesScraped: job.pagesScraped,
            sourceId: job.sourceId || undefined,
            error: job.error || undefined
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

/**
 * Add pasted text as a knowledge source
 */
const addPasteSource = async (req, res) => {
    try {
        const { title, content } = req.body;
        const userId = req.userId;
        if (!userId || !content) {
            return res.status(400).json({ message: 'Content is required.' });
        }
        const source = await fileParserService.processPaste(userId, title || 'Pasted text', content);
        await User.findByIdAndUpdate(userId, { $inc: { knowledgeVersion: 1 } });
        return res.json({ message: 'Pasted text added to knowledge base.', source });
    } catch (error) {
        console.error('Paste error:', error);
        return res.status(500).json({ message: error.message });
    }
};

/**
 * Fetch all sources (files/websites) for a user
 */
const getUserSources = async (req, res) => {
    try {
        // Support both authenticated user and admin querying for specific user
        const userId = req.query.userId || req.userId;

        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        const sources = await Source.find({ userId }).sort({ createdAt: -1 }).lean();
        return res.json({ sources });
    } catch (error) {
        console.error("Fetch sources error:", error);
        return res.status(500).json({ message: "Failed to fetch sources" });
    }
};

/**
 * Update a source (e.g. set scrapeSchedule for website sources).
 */
const updateSource = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const source = await Source.findOne({ _id: id, userId });
        if (!source) return res.status(404).json({ message: 'Source not found.' });
        if (req.body.scrapeSchedule !== undefined) {
            const v = req.body.scrapeSchedule;
            if (!['none', 'daily', 'weekly'].includes(v)) {
                return res.status(400).json({ message: 'scrapeSchedule must be none, daily, or weekly.' });
            }
            source.scrapeSchedule = v;
        }
        await source.save();
        return res.json(source);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

/**
 * Chat with RAG. Ownership validated via widget token (no userId from body).
 */
const chatWithBot = async (req, res) => {
    try {
        const { message } = req.body;
        const userId = req.chatUserId; // Set by verifyChatWidgetToken middleware
        if (!message) {
            return res.status(400).json({ message: 'Message is required.' });
        }

        const rawMessage = typeof message === 'string' ? message : String(message);
        const sanitized = sanitizeInput(rawMessage);
        if (!sanitized) {
            return res.status(400).json({ message: 'Message cannot be empty.' });
        }
        if (sanitized.length > CHAT_MESSAGE_MAX_LENGTH) {
            return res.status(400).json({ message: `Message must be at most ${CHAT_MESSAGE_MAX_LENGTH} characters.` });
        }

        // --- SECURITY: Domain Allow-List Check ---
        const user = await User.findById(userId).select('allowedDomains isActive');
        if (!user || !user.isActive) {
            return res.status(404).json({ message: 'Chatbot not available' });
        }

        if (!isDomainAllowed(user, req)) {
            console.warn(`Blocked chat request from unauthorized domain for user ${userId}`);
            return res.status(403).json({ message: 'Domain not authorized' });
        }
        // --- END SECURITY CHECK ---

        const response = await chatService.handleChat(userId, sanitized);
        return res.json({ answer: response, source: 'RAG' });

    } catch (error) {
        console.error("Chat error:", error);
        if (error.message.includes("limit") || error.message.includes("tokens") || error.message.includes("balance")) {
            return res.status(403).json({ message: error.message });
        }
        return res.status(500).json({ message: error.message });
    }
};

/**
 * Submit thumbs up/down feedback for a message. Widget token required.
 */
const submitFeedback = async (req, res) => {
    try {
        const userId = req.chatUserId;
        const { conversationId, messageIndex, feedback } = req.body;
        if (!conversationId || typeof messageIndex !== 'number' || messageIndex < 0) {
            return res.status(400).json({ message: 'conversationId and messageIndex required.' });
        }
        if (feedback !== 1 && feedback !== -1) {
            return res.status(400).json({ message: 'feedback must be 1 or -1.' });
        }
        const conv = await Conversation.findOne({ _id: conversationId, userId });
        if (!conv) return res.status(404).json({ message: 'Conversation not found' });
        if (messageIndex >= conv.messages.length) {
            return res.status(400).json({ message: 'Invalid messageIndex.' });
        }
        conv.messages[messageIndex].feedback = feedback;
        await conv.save();
        return res.json({ ok: true });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Server error' });
    }
};

/**
 * Start a conversation (e.g. after pre-chat form). Creates Conversation with leadInfo, returns conversationId.
 */
const startConversation = async (req, res) => {
    try {
        const userId = req.chatUserId;
        const { visitorId, leadInfo, botId: bodyBotId } = req.body;
        if (!visitorId || typeof visitorId !== 'string') {
            return res.status(400).json({ message: 'visitorId is required.' });
        }
        const user = await User.findById(userId).select('allowedDomains isActive');
        if (!user || !user.isActive) {
            return res.status(404).json({ message: 'Chatbot not available' });
        }
        if (!isDomainAllowed(user, req)) {
            return res.status(403).json({ message: 'Domain not authorized' });
        }
        let botId = null;
        if (bodyBotId) {
            const Bot = require('../models/Bot');
            if (mongoose.Types.ObjectId.isValid(bodyBotId) && String(bodyBotId).length === 24) {
                const bot = await Bot.findOne({ _id: bodyBotId, userId }).select('_id').lean();
                if (bot) botId = bot._id;
            } else {
                const bot = await Bot.findOne({ userId, slug: String(bodyBotId) }).select('_id').lean();
                if (bot) botId = bot._id;
            }
        }
        const lead = leadInfo && typeof leadInfo === 'object' ? {
            name: sanitizeInput(String(leadInfo.name || '').trim()) || undefined,
            email: sanitizeInput(String(leadInfo.email || '').trim()) || undefined,
            phone: sanitizeInput(String(leadInfo.phone || '').trim()) || undefined
        } : {};
        const conv = await Conversation.create({
            visitorId,
            userId,
            botId: botId || undefined,
            messages: [],
            leadInfo: (lead.name || lead.email || lead.phone) ? lead : undefined,
            metadata: { pageUrl: req.headers.referer || '', userAgent: req.headers['user-agent'] || '' }
        });

        const hasLead = lead.name || lead.email || lead.phone;
        if (hasLead) {
            const owner = await User.findById(userId).select('email name').lean();
            if (owner?.email) {
                emailService.sendNewLeadEmail(owner.email, owner.name, lead).catch((e) => console.error('Lead email:', e));
            }
            notificationService.create(
                userId,
                'new_lead',
                'New lead captured',
                [lead.name, lead.email, lead.phone].filter(Boolean).join(' · ') || 'New contact',
                { conversationId: conv._id.toString(), lead }
            ).catch((e) => console.error('Notification create:', e));
            const widgetConfig = await WidgetConfig.findOne(botId ? { userId, botId } : { userId }).select('leadCaptureWebhookUrl').lean();
            const webhookUrl = widgetConfig?.leadCaptureWebhookUrl?.trim();
            if (webhookUrl) {
                axios.post(webhookUrl, {
                    event: 'lead_captured',
                    conversationId: conv._id.toString(),
                    visitorId,
                    lead: { name: lead.name, email: lead.email, phone: lead.phone },
                    capturedAt: new Date().toISOString()
                }, { timeout: 5000 }).catch((e) => console.error('Lead webhook:', e.message));
            }
        }

        return res.json({ conversationId: conv._id.toString() });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Server error' });
    }
};

/**
 * Stream chat response over SSE (NDJSON). Optionally persist to Conversation when visitorId is present.
 */
const chatWithBotStream = async (req, res) => {
    const { message, visitorId, conversationId, botId: bodyBotId } = req.body;
    const userId = req.chatUserId;
    if (!message) {
        return res.status(400).json({ message: 'Message is required.' });
    }

    const rawMessage = typeof message === 'string' ? message : String(message);
    const sanitized = sanitizeInput(rawMessage);
    if (!sanitized) {
        return res.status(400).json({ message: 'Message cannot be empty.' });
    }
    if (sanitized.length > CHAT_MESSAGE_MAX_LENGTH) {
        return res.status(400).json({ message: `Message must be at most ${CHAT_MESSAGE_MAX_LENGTH} characters.` });
    }

    const user = await User.findById(userId).select('allowedDomains isActive');
    if (!user || !user.isActive) {
        return res.status(404).json({ message: 'Chatbot not available' });
    }
    if (!isDomainAllowed(user, req)) {
        return res.status(403).json({ message: 'Domain not authorized' });
    }

    let resolvedBotId = null;
    if (bodyBotId) {
        const Bot = require('../models/Bot');
        if (mongoose.Types.ObjectId.isValid(bodyBotId) && String(bodyBotId).length === 24) {
            const b = await Bot.findOne({ _id: bodyBotId, userId }).select('_id').lean();
            if (b) resolvedBotId = b._id;
        } else {
            const b = await Bot.findOne({ userId, slug: String(bodyBotId) }).select('_id').lean();
            if (b) resolvedBotId = b._id;
        }
    }

    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders && res.flushHeaders();

    const sendLine = (obj) => {
        res.write(JSON.stringify(obj) + '\n');
        if (typeof res.flush === 'function') res.flush();
    };

    const onComplete = async (err, fullContent, usage) => {
        if (!visitorId) return;
        const userMsg = { role: 'user', content: sanitized };
        const assistantMsg = { role: 'assistant', content: err ? '(Error)' : fullContent };
        try {
            if (conversationId && mongoose.Types.ObjectId.isValid(conversationId)) {
                const conv = await Conversation.findOneAndUpdate(
                    { _id: conversationId, userId },
                    { $push: { messages: { $each: [userMsg, assistantMsg] } }, updatedAt: new Date() },
                    { new: true }
                );
                if (conv) {
                    sendLine({ type: 'messageIndex', messageIndex: conv.messages.length - 1 });
                    return;
                }
            }
            const newConv = await Conversation.create({
                visitorId,
                userId,
                botId: resolvedBotId || undefined,
                messages: [userMsg, assistantMsg],
                metadata: { pageUrl: req.headers.referer || '', userAgent: req.headers['user-agent'] || '' }
            });
            sendLine({ type: 'conversationId', conversationId: newConv._id.toString() });
            sendLine({ type: 'messageIndex', messageIndex: 1 });
        } catch (e) {
            console.error('Conversation save error:', e);
        }
    };

    try {
        await chatService.handleChatStream(userId, sanitized, (chunk) => sendLine(chunk), onComplete);
    } catch (err) {
        console.error('Stream error:', err);
        sendLine({ type: 'done', error: err.message || 'Stream failed' });
    }
    res.end();
};

/** Phase 3.3: Widget pings when loaded so dashboard can show "Installation verified". No auth. */
const widgetPing = async (req, res) => {
    try {
        const userId = req.body?.userId;
        const origin = (req.body?.origin || req.get('Origin') || '').replace(/\/$/, '');
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid userId' });
        }
        await User.findByIdAndUpdate(userId, {
            lastWidgetPingAt: new Date(),
            lastWidgetPingOrigin: origin || null
        });
        return res.status(200).json({ ok: true });
    } catch (err) {
        return res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getAnswer,
    getAIResponseController,
    getChatbotData,
    getUserChatbotData,
    logUnanswered,
    updateFrequency,
    uploadFile,
    scrapeWebsite,
    getUserSources,
    chatWithBot,
    chatWithBotStream,
    startConversation,
    submitFeedback,
    getScrapeStatus,
    addPasteSource,
    updateSource,
    widgetPing
};

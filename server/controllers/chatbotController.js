const QA = require('../models/QA');
const User = require('../models/User');
const { getAIResponse } = require('../services/openaiService');
const chatService = require('../services/chat.service');
const scraperService = require('../services/scraperService');
const fileParserService = require('../services/fileParser.service');
const usageTracker = require('../services/usageTracker.service');
const { sanitizeInput } = require('../utils/sanitize');
const widgetTokenService = require('../services/widgetToken.service');

const Source = require('../models/Source');
const WidgetConfig = require('../models/WidgetConfig');
const Conversation = require('../models/Conversation');
const mongoose = require('mongoose');

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

        const widgetConfig = await WidgetConfig.findOne({ userId }).lean();
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
            showPoweredBy: widgetConfig.showPoweredBy
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
 * Scrape and process a website
 */
const scrapeWebsite = async (req, res) => {
    try {
        const { url } = req.body;
        const userId = req.body.userId || req.userId;
        if (!userId || !url) {
            return res.status(400).json({ message: 'User ID and URL are required.' });
        }

        const source = await scraperService.processWebsite(userId, url);

        // Update Knowledge Version and Log Usage
        await User.findByIdAndUpdate(userId, { $inc: { knowledgeVersion: 1 } });
        await usageTracker.trackWebsiteScrape(userId, url);

        return res.json({
            message: 'Website processed successfully.',
            source
        });
    } catch (error) {
        console.error("Scrape error:", error);
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

        const sources = await Source.find({ userId }).sort({ createdAt: -1 });
        return res.json({ sources });
    } catch (error) {
        console.error("Fetch sources error:", error);
        return res.status(500).json({ message: "Failed to fetch sources" });
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
 * Stream chat response over SSE (NDJSON). Optionally persist to Conversation when visitorId is present.
 */
const chatWithBotStream = async (req, res) => {
    const { message, visitorId, conversationId } = req.body;
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
                if (conv) return;
            }
            const newConv = await Conversation.create({
                visitorId,
                userId,
                messages: [userMsg, assistantMsg],
                metadata: { pageUrl: req.headers.referer || '', userAgent: req.headers['user-agent'] || '' }
            });
            sendLine({ type: 'conversationId', conversationId: newConv._id.toString() });
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
    chatWithBotStream
};

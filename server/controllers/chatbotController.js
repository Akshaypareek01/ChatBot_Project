const QA = require('../models/QA');
const User = require('../models/User');
const { getAIResponse } = require('../services/openaiService');
const chatService = require('../services/chat.service');
const scraperService = require('../services/scraperService');
const fileParserService = require('../services/fileParser.service');

const Source = require('../models/Source');

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

const getChatbotData = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);
        if (!user || !user.isActive) {
            return res.status(404).json({ message: 'Chatbot not available' });
        }
        const qas = await QA.find({ userId });
        return res.status(200).json({
            userId,
            name: user.brandName || user.name,
            qas
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
        const userId = req.body.userId || req.userId; // Use body or auth middleware
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required.' });
        }

        const source = await fileParserService.processFile(userId, req.file);

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
        const userId = req.body.userId || req.userId; // Use body or auth middleware
        if (!userId || !url) {
            return res.status(400).json({ message: 'User ID and URL are required.' });
        }

        const source = await scraperService.processWebsite(userId, url);

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
 * Chat with RAG
 */
const chatWithBot = async (req, res) => {
    try {
        const { userId, message } = req.body;
        if (!userId || !message) {
            return res.status(400).json({ message: 'User ID and message are required.' });
        }

        const response = await chatService.handleChat(userId, message);
        return res.json({ answer: response, source: 'RAG' });

    } catch (error) {
        console.error("Chat error:", error);
        // Return 403 for limits, 500 for others
        if (error.message.includes("limit")) {
            return res.status(403).json({ message: error.message });
        }
        return res.status(500).json({ message: error.message });
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
    chatWithBot
};

const express = require('express');
const multer = require('multer');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');
const qaController = require('../controllers/qaController');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const authMiddleware = require('../middleware/authMiddleware');
const { validateObjectId } = require('../middleware/validateObjectId');
const verifyChatWidgetToken = require('../middleware/verifyChatWidgetToken');
const validateRequest = require('../middleware/validateRequest');
const chatValidator = require('../validators/chat.validator');

const ALLOWED_MIMES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
    'application/csv',
    'text/markdown',
    'text/x-markdown',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype || !ALLOWED_MIMES.includes(file.mimetype)) {
            return cb(new Error('Allowed: PDF, DOCX, TXT, CSV, MD, XLSX.'), false);
        }
        cb(null, true);
    }
});

// Phase 3.3: widget install verification (no auth; rate-limit by IP)
router.post('/chatbot/widget-ping', (req, res, next) => {
    req.chatUserId = req.body?.userId;
    next();
}, chatbotController.widgetPing);

// Legacy / Existing Routes (ObjectId validation on params)
router.get('/chatbot/:userId', validateObjectId('userId'), chatbotController.getChatbotData);
router.post('/chatbot/log', chatbotController.logUnanswered);
router.post('/chatbot/frequency', chatbotController.updateFrequency);
router.get('/users/chatbot', authMiddleware, chatbotController.getUserChatbotData);

router.get('/qa/:userId', validateObjectId('userId'), qaController.getQAsByUserId);

router.post('/chatbot/answer', chatbotController.getAnswer);
router.post('/chatbot/ai-response', chatbotController.getAIResponseController);

// --- NEW RAG ROUTES ---

// Chat: 30 messages/min per userId (ownership via widget token)
const chatLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { message: 'Too many messages. Please slow down.' },
    keyGenerator: (req) => req.chatUserId || (req.ip ? ipKeyGenerator(req.ip) : 'anon')
});

// Chat API (RAG) — widget token required; no userId from body
router.post('/chat', verifyChatWidgetToken, chatLimiter, validateRequest(chatValidator.chat), chatbotController.chatWithBot);
// Start conversation (e.g. after pre-chat form) — returns conversationId
router.post('/chat/start', verifyChatWidgetToken, chatbotController.startConversation);
// Submit feedback (thumbs up/down) for a message
router.post('/chat/feedback', verifyChatWidgetToken, chatbotController.submitFeedback);
// Streaming chat (SSE/NDJSON)
router.post('/chat/stream', verifyChatWidgetToken, chatLimiter, validateRequest(chatValidator.chat), chatbotController.chatWithBotStream);

// Upload File (PDF/DOC)
router.post('/upload', authMiddleware, upload.single('file'), chatbotController.uploadFile);

// Scrape Website (body: url, maxDepth 1-3; maxDepth>1 returns jobId, poll status)
router.post('/scrape', authMiddleware, chatbotController.scrapeWebsite);
router.get('/scrape/status/:jobId', authMiddleware, chatbotController.getScrapeStatus);

// Get User Sources (Files & Websites)
router.get('/sources', authMiddleware, chatbotController.getUserSources);
// Add pasted text as knowledge source
router.post('/sources/paste', authMiddleware, chatbotController.addPasteSource);
// Update source (e.g. scrapeSchedule for websites)
router.patch('/sources/:id', authMiddleware, validateObjectId('id'), chatbotController.updateSource);

module.exports = router;

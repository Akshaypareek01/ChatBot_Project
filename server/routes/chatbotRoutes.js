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

const ALLOWED_MIMES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype || !ALLOWED_MIMES.includes(file.mimetype)) {
            return cb(new Error('Only PDF, DOCX, and TXT files are allowed.'), false);
        }
        cb(null, true);
    }
});

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
// Streaming chat (SSE/NDJSON)
router.post('/chat/stream', verifyChatWidgetToken, chatLimiter, validateRequest(chatValidator.chat), chatbotController.chatWithBotStream);

// Upload File (PDF/DOC)
router.post('/upload', authMiddleware, upload.single('file'), chatbotController.uploadFile);

// Scrape Website
router.post('/scrape', authMiddleware, chatbotController.scrapeWebsite);

// Get User Sources (Files & Websites)
router.get('/sources', authMiddleware, chatbotController.getUserSources);

module.exports = router;

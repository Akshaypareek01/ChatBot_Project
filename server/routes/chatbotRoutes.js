const express = require('express');
const router = express.Router();
const multer = require('multer');
const chatbotController = require('../controllers/chatbotController');
const qaController = require('../controllers/qaController');
const authMiddleware = require('../middleware/authMiddleware');

// Configure Multer for memory storage (we process then upload to R2)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Legacy / Existing Routes
router.get('/chatbot/:userId', chatbotController.getChatbotData);
router.post('/chatbot/log', chatbotController.logUnanswered);
router.post('/chatbot/frequency', chatbotController.updateFrequency);
router.get('/users/chatbot', authMiddleware, chatbotController.getUserChatbotData);

router.get('/qa/:userId', qaController.getQAsByUserId);

router.post('/chatbot/answer', chatbotController.getAnswer);
router.post('/chatbot/ai-response', chatbotController.getAIResponseController);

// --- NEW RAG ROUTES ---

// Chat API (RAG)
router.post('/chat', chatbotController.chatWithBot);

// Upload File (PDF/DOC)
router.post('/upload', upload.single('file'), chatbotController.uploadFile);

// Scrape Website
router.post('/scrape', chatbotController.scrapeWebsite);

module.exports = router;

const express = require('express');
const multer = require('multer');
const router = express.Router();
const userController = require('../controllers/userController');
const flowController = require('../controllers/flowController');
const qaController = require('../controllers/qaController');
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middleware/authMiddleware');
const { validateObjectId } = require('../middleware/validateObjectId');

const avatarUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype || !file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed.'), false);
        }
        cb(null, true);
    }
});

router.use(authMiddleware);

// Profile & Security
router.get('/users/profile', userController.getProfile);
router.put('/users/profile', userController.updateProfile);
router.put('/users/password', userController.updatePassword);
router.put('/users/domains', userController.updateAllowedDomains);
router.get('/users/usage', userController.getUsageHistory);
router.get('/users/export-my-data', userController.exportMyData);
router.delete('/users/delete-my-data', userController.deleteMyData);

// User QA
router.get('/users/qa', qaController.getUserQAs);
router.post('/users/qa', qaController.createUserQA);
router.put('/users/qa/:id', qaController.updateUserQA);
router.delete('/users/qa/:id', qaController.deleteUserQA);

// Phase 5.4: Suggested Q&A (auto-learning)
router.get('/users/suggested-qa', userController.getSuggestedQAs);
router.post('/users/suggested-qa/:id/add-to-qa', validateObjectId('id'), userController.addSuggestedQAToQA);
router.delete('/users/suggested-qa/:id', validateObjectId('id'), userController.dismissSuggestedQA);

// Transactions
router.get('/users/transactions', paymentController.getUserTransactions);

// Knowledge base health
router.get('/users/sources/health', userController.getSourcesHealth);

// Bots (Phase 3.5 multi-bot)
router.get('/users/bots', userController.listBots);
router.post('/users/bots', userController.createBot);
router.patch('/users/bots/:id', validateObjectId('id'), userController.updateBot);

// Widget customization (supports ?botId= for multi-bot)
router.get('/users/chatbot/config', userController.getWidgetConfig);
router.put('/users/chatbot/config', userController.updateWidgetConfig);
router.post('/users/chatbot/avatar', avatarUpload.single('avatar'), userController.uploadWidgetAvatar);
router.get('/users/chatbot/suggested-questions/generate', userController.generateSuggestedQuestions);

// Analytics (Phase 3.1)
router.get('/users/analytics', userController.getAnalytics);

// Notifications (Phase 3.4)
router.get('/users/notifications', userController.getNotifications);
router.patch('/users/notifications/:id/read', validateObjectId('id'), userController.markNotificationRead);
router.get('/users/notification-prefs', userController.getNotificationPrefs);
router.put('/users/notification-prefs', userController.updateNotificationPrefs);

// Conversations
router.get('/users/conversations', userController.getConversations);
router.get('/users/conversations/export', userController.exportConversations);
router.get('/users/conversations/leads/export', userController.exportLeads);
router.get('/users/feedback-stats', userController.getFeedbackStats);
router.get('/users/conversations/:id', validateObjectId('id'), userController.getConversationById);
router.patch('/users/conversations/:id', validateObjectId('id'), userController.updateConversation);

// Phase 5.6: Chat flows / decision trees
router.get('/users/flows/templates', flowController.listTemplates);
router.get('/users/flows', flowController.listFlows);
router.post('/users/flows', flowController.createFlow);
router.get('/users/flows/:id', validateObjectId('id'), flowController.getFlow);
router.put('/users/flows/:id', validateObjectId('id'), flowController.updateFlow);
router.delete('/users/flows/:id', validateObjectId('id'), flowController.deleteFlow);

// Phase 5.5: Reseller — list my clients (reseller role only)
router.get('/users/clients', userController.getResellerClients);

module.exports = router;

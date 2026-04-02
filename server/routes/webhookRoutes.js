const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/webhooks/events', authMiddleware, webhookController.listEvents);
router.get('/webhooks', authMiddleware, webhookController.list);
router.post('/webhooks', authMiddleware, webhookController.create);
router.patch('/webhooks/:id', authMiddleware, webhookController.update);
router.delete('/webhooks/:id', authMiddleware, webhookController.remove);
router.get('/webhooks/:id/logs', authMiddleware, webhookController.listLogs);

module.exports = router;

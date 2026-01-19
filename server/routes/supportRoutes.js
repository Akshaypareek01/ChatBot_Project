const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// User and Admin shared/specific routes
router.post('/ticket', supportController.createTicket);
router.get('/my-tickets', supportController.getUserTickets);
router.get('/all-tickets', supportController.getAdminTickets);
router.get('/ticket/:ticketId', supportController.getTicketById);
router.post('/ticket/:ticketId/message', supportController.addMessage);
router.patch('/ticket/:ticketId/status', supportController.updateStatus);

module.exports = router;

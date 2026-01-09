const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/payments/create-order', authMiddleware, paymentController.createOrder);
router.get('/payments/callback', paymentController.callback);
router.get('/payments/simulate/:orderId', paymentController.simulatePayment);
router.get("/transactions/:orderId", paymentController.getTransactionByOrderId);

module.exports = router;

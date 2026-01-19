const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const qaController = require('../controllers/qaController');
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// Profile & Security
router.get('/users/profile', userController.getProfile);
router.put('/users/profile', userController.updateProfile);
router.put('/users/password', userController.updatePassword);
router.put('/users/domains', userController.updateAllowedDomains);
router.get('/users/usage', userController.getUsageHistory);

// User QA
router.get('/users/qa', qaController.getUserQAs);
router.post('/users/qa', qaController.createUserQA);
router.put('/users/qa/:id', qaController.updateUserQA);
router.delete('/users/qa/:id', qaController.deleteUserQA);

// Transactions
router.get('/users/transactions', paymentController.getUserTransactions);

module.exports = router;

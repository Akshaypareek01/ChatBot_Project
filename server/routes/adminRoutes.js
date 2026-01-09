const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const paymentController = require('../controllers/paymentController');
const qaController = require('../controllers/qaController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// Users
router.get('/admin/users', adminController.getUsers);
router.post('/admin/users', adminController.createUser);
router.put('/admin/users/:id', adminController.updateUser);
router.delete('/admin/users/:id', adminController.deleteUser);
// router.put('/admin/users/:id/subscription', adminController.updateUserSubscription); // Removed

// Plans (Removed)
// router.post('/admin/plans', planController.createPlan); ...

// Transactions
router.get('/admin/transactions', paymentController.adminGetTransactions);

// QA
router.post('/admin/qa', qaController.adminCreateQA);
router.put('/admin/qa/:id', qaController.adminUpdateQA);
router.delete('/admin/qa/:id', qaController.adminDeleteQA);

// Analytics
router.get('/admin/analytics', adminController.getAnalytics);

module.exports = router;

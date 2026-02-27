const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const qaController = require('../controllers/qaController');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const dataRetention = require('../services/dataRetention.service');

router.use(authMiddleware);

// 2FA (admin only)
router.get('/admin/2fa/setup', authController.get2FASetup);
router.post('/admin/2fa/verify', authController.verify2FA);
router.post('/admin/2fa/disable', authController.disable2FA);

// Users
router.get('/admin/users', adminController.getUsers);
router.post('/admin/users', adminController.createUser);
router.put('/admin/users/:id', adminController.updateUser);
router.delete('/admin/users/:id', adminController.deleteUser);
// router.put('/admin/users/:id/subscription', adminController.updateUserSubscription); // Removed

// Plans (Removed)
// router.post('/admin/plans', planController.createPlan); ...

// Transactions
router.get('/admin/transactions', adminController.getTransactions);

// QA
router.post('/admin/qa', qaController.adminCreateQA);
router.put('/admin/qa/:id', qaController.adminUpdateQA);
router.delete('/admin/qa/:id', qaController.adminDeleteQA);

// Analytics
router.get('/admin/analytics', adminController.getAnalytics);

// Data retention (run manually or via cron; admin only)
router.post('/admin/data-retention/run', (req, res) => {
    if (!req.isAdmin) return res.status(403).json({ message: 'Admin required' });
    dataRetention.runDataRetention().then((r) => res.json(r)).catch((e) => res.status(500).json({ message: e.message }));
});

module.exports = router;

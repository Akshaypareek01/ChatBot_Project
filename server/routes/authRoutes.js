const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/admin/login', authController.adminLogin);
router.post('/users/register', authController.register);
router.post('/users/login', authController.login);
router.post('/users/verify-otp', authController.verifyOTP);
router.post('/users/resend-otp', authController.resendVerificationOTP);
router.post('/users/forgot-password', authController.forgotPassword);
router.post('/users/reset-password', authController.resetPassword);

module.exports = router;

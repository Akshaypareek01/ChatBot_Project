const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const authValidator = require('../validators/auth.validator');

router.post('/admin/login', validateRequest(authValidator.login), authController.adminLogin);
router.post('/admin/login/totp', validateRequest(authValidator.adminLoginTotp), authController.adminLoginTotp);
router.post('/users/register', validateRequest(authValidator.register), authController.register);
router.post('/users/login', validateRequest(authValidator.login), authController.login);
router.post('/users/refresh-token', validateRequest(authValidator.refreshToken), authController.refreshToken);
router.get('/users/sessions', authMiddleware, authController.listSessions);
router.delete('/users/sessions/:id', authMiddleware, authController.revokeSession);
router.delete('/users/sessions', authMiddleware, authController.revokeAllSessions);
router.post('/users/verify-otp', validateRequest(authValidator.verifyOTP), authController.verifyOTP);
router.post('/users/resend-otp', validateRequest(authValidator.resendOTP), authController.resendVerificationOTP);
router.post('/users/forgot-password', validateRequest(authValidator.forgotPassword), authController.forgotPassword);
router.post('/users/reset-password', validateRequest(authValidator.resetPassword), authController.resetPassword);

module.exports = router;

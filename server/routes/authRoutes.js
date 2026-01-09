const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/admin/login', authController.adminLogin);
router.post('/users/register', authController.register);
router.post('/users/login', authController.login);

module.exports = router;

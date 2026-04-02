const express = require('express');
const router = express.Router();
const planController = require('../controllers/planController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/plans', planController.listPlans);
router.get('/users/plan/usage', authMiddleware, planController.getMyPlanUsage);
router.patch('/users/plan', authMiddleware, planController.changePlan);

module.exports = router;

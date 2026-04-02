/**
 * Phase 4: Plans and usage (public list, user usage, change plan).
 */

const Plan = require('../models/Plan');
const User = require('../models/User');
const planLimit = require('../services/planLimit.service');

/** Public: list active plans for pricing page */
const listPlans = async (req, res) => {
    try {
        const plans = await Plan.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
        return res.json({ plans });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/** Auth: current user's plan + usage (chats this month, sources, limits) */
const getMyPlanUsage = async (req, res) => {
    try {
        const usage = await planLimit.getUsageSummary(req.userId);
        if (!usage) return res.status(404).json({ message: 'User not found' });
        return res.json(usage);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/** Auth: change plan (upgrade/downgrade). For paid plans we would integrate payment; for now just set planId. */
const changePlan = async (req, res) => {
    try {
        const { planId } = req.body;
        if (!planId) return res.status(400).json({ message: 'planId is required' });
        const plan = await Plan.findOne({ _id: planId, isActive: true });
        if (!plan) return res.status(404).json({ message: 'Plan not found' });
        await User.findByIdAndUpdate(req.userId, { $set: { planId: plan._id } });
        const usage = await planLimit.getUsageSummary(req.userId);
        return res.json({ message: 'Plan updated', usage });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    listPlans,
    getMyPlanUsage,
    changePlan
};

/**
 * Phase 4.1: Subscription plans (Free, Starter, Growth, Business, Enterprise).
 */

const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    priceMonthly: { type: Number, default: 0 },
    priceYearly: { type: Number, default: 0 },
    chatLimitPerMonth: { type: Number, default: 0 }, // 0 = unlimited
    sourcesLimit: { type: Number, default: 1 },
    features: { type: [String], default: [] },
    whitelabel: { type: Boolean, default: false },
    supportLevel: { type: String, enum: ['email', 'priority', 'dedicated'], default: 'email' },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 }
}, { timestamps: true });

planSchema.index({ isActive: 1, sortOrder: 1 });

module.exports = mongoose.model('Plan', planSchema);

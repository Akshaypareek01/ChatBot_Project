/**
 * Phase 4.2: Coupon / promo codes for token recharge.
 */

const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    type: { type: String, enum: ['percent', 'fixed'], required: true },
    value: { type: Number, required: true }, // percent (1-100) or fixed INR
    minAmount: { type: Number, default: 0 }, // minimum order amount in INR to apply
    validFrom: { type: Date, default: Date.now },
    validTo: { type: Date },
    maxRedemptions: { type: Number, default: null }, // null = unlimited
    usedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

couponSchema.index({ code: 1, isActive: 1 });

module.exports = mongoose.model('Coupon', couponSchema);

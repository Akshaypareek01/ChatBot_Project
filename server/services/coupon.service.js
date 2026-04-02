/**
 * Phase 4.2: Validate and apply coupon codes.
 */

const Coupon = require('../models/Coupon');

/**
 * Validate coupon for an order amount. Returns { valid, discountAmount, message, coupon } or { valid: false, message }.
 */
async function validateCoupon(code, orderAmountInr) {
    if (!code || typeof code !== 'string') return { valid: false, message: 'Invalid code' };
    const c = await Coupon.findOne({ code: code.trim().toUpperCase(), isActive: true });
    if (!c) return { valid: false, message: 'Coupon not found or expired' };
    const now = new Date();
    if (c.validFrom && now < c.validFrom) return { valid: false, message: 'Coupon not yet valid' };
    if (c.validTo && now > c.validTo) return { valid: false, message: 'Coupon expired' };
    if (c.maxRedemptions != null && c.usedCount >= c.maxRedemptions) return { valid: false, message: 'Coupon limit reached' };
    if (orderAmountInr < (c.minAmount || 0)) return { valid: false, message: `Minimum order amount is ₹${c.minAmount}` };

    let discountAmount = 0;
    if (c.type === 'percent') {
        discountAmount = Math.min((orderAmountInr * c.value) / 100, orderAmountInr);
    } else {
        discountAmount = Math.min(c.value, orderAmountInr);
    }
    if (discountAmount <= 0) return { valid: false, message: 'No discount applicable' };

    return {
        valid: true,
        discountAmount: Math.round(discountAmount * 100) / 100,
        message: `₹${discountAmount.toFixed(2)} off`,
        coupon: { _id: c._id, code: c.code, type: c.type, value: c.value }
    };
}

/**
 * Record coupon use (increment usedCount). Call after payment success.
 */
async function recordCouponUse(couponId) {
    await Coupon.findByIdAndUpdate(couponId, { $inc: { usedCount: 1 } });
}

module.exports = { validateCoupon, recordCouponUse };

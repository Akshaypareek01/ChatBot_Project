/**
 * Phase 4.2: Seed sample coupons (optional). Run once or manually.
 */

const Coupon = require('../models/Coupon');

async function seedCoupons() {
    const samples = [
        { code: 'WELCOME10', type: 'percent', value: 10, minAmount: 99, maxRedemptions: 100 },
        { code: 'FLAT50', type: 'fixed', value: 50, minAmount: 199 }
    ];
    for (const s of samples) {
        await Coupon.findOneAndUpdate(
            { code: s.code },
            { $set: { ...s, isActive: true } },
            { upsert: true }
        );
    }
    console.log('Coupons seeded:', samples.length);
}

module.exports = { seedCoupons };

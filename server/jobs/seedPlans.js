/**
 * Phase 4.1: Seed subscription plans (Free, Starter, Growth, Business).
 * Run once or on deploy. Idempotent: upsert by slug.
 */

const Plan = require('../models/Plan');

const PLANS = [
    { name: 'Free', slug: 'free', priceMonthly: 0, priceYearly: 0, chatLimitPerMonth: 100, sourcesLimit: 1, features: ['100 chats/month', '1 knowledge source', 'Branded widget'], whitelabel: false, supportLevel: 'email', sortOrder: 0 },
    { name: 'Starter', slug: 'starter', priceMonthly: 499, priceYearly: 4990, chatLimitPerMonth: 1000, sourcesLimit: 5, features: ['1,000 chats/month', '5 sources', 'Email support'], whitelabel: false, supportLevel: 'email', sortOrder: 1 },
    { name: 'Growth', slug: 'growth', priceMonthly: 1499, priceYearly: 14990, chatLimitPerMonth: 5000, sourcesLimit: 15, features: ['5,000 chats/month', '15 sources', 'Priority support'], whitelabel: false, supportLevel: 'priority', sortOrder: 2 },
    { name: 'Business', slug: 'business', priceMonthly: 3999, priceYearly: 39990, chatLimitPerMonth: 0, sourcesLimit: 50, features: ['Unlimited chats', '50 sources', 'Dedicated support', 'Whitelabel'], whitelabel: true, supportLevel: 'dedicated', sortOrder: 3 },
    { name: 'Enterprise', slug: 'enterprise', priceMonthly: 9999, priceYearly: 99990, chatLimitPerMonth: 0, sourcesLimit: 200, features: ['Unlimited chats', '200 sources', 'Dedicated support', 'Whitelabel', 'Custom domain', 'Custom email'], whitelabel: true, supportLevel: 'dedicated', sortOrder: 4 }
];

async function seedPlans() {
    for (const p of PLANS) {
        await Plan.findOneAndUpdate(
            { slug: p.slug },
            { $set: { ...p, isActive: true } },
            { upsert: true, new: true }
        );
    }
    console.log('Plans seeded:', PLANS.length);
}

module.exports = { seedPlans };

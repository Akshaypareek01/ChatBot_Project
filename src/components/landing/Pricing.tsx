import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';

type Plan = {
    name: string;
    price: number;
    credits: number;
    chats: number;
    savings?: string;
    badge?: string;
    features: string[];
    featured?: boolean;
};

/**
 * Canonical landing pricing. Mirrors server/services/usageTracker.service.js PRICING_TIERS.
 * Keep these in sync if tiers change.
 */
const plans: Plan[] = [
    {
        name: 'Starter',
        price: 99,
        credits: 2_500,
        chats: 25,
        features: ['25 AI chats', 'Domain whitelisting', 'PDF & URL training', 'Email support'],
    },
    {
        name: 'Growth',
        price: 299,
        credits: 9_000,
        chats: 90,
        savings: 'Save 16%',
        badge: 'Most popular',
        features: ['90 AI chats', 'Operations console', 'Smart analytics', 'Priority email'],
    },
    {
        name: 'Scale',
        price: 799,
        credits: 28_000,
        chats: 280,
        savings: 'Save 28%',
        badge: 'Best value',
        features: ['280 AI chats', 'Evaluations & versioning', 'Dedicated onboarding', 'Webhooks & API'],
        featured: true,
    },
    {
        name: 'Business',
        price: 1_999,
        credits: 80_000,
        chats: 800,
        savings: 'Save 37%',
        features: ['800 AI chats', 'Dedicated account manager', 'Custom onboarding', 'Priority support'],
    },
];

const formatINR = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const formatNum = (n: number) => n.toLocaleString('en-IN');

const Pricing = () => {
    return (
        <section className="py-24 sm:py-32 bg-[#FAFAFA]" id="pricing">
            <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
                <div className="max-w-2xl mx-auto text-center mb-16">
                    <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600 mb-5">
                        <span className="w-6 h-px bg-indigo-600" /> Pricing
                    </div>
                    <h2 className="text-3xl sm:text-5xl font-semibold tracking-[-0.02em] text-slate-950 leading-[1.05]">
                        Transparent pricing. Scales with you.
                    </h2>
                    <p className="mt-5 text-base text-slate-600 leading-relaxed">
                        Pay only for successful interactions. Credits never expire and carry forward on every recharge.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
                    {plans.map((plan, i) => (
                        <motion.div
                            key={plan.name}
                            initial={{ opacity: 0, y: 14 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-60px' }}
                            transition={{ duration: 0.45, delay: i * 0.05, ease: 'easeOut' }}
                            className={`relative flex flex-col p-7 rounded-xl bg-white border transition-all ${
                                plan.featured
                                    ? 'border-slate-900 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.25)]'
                                    : 'border-slate-900/[0.08] hover:border-slate-900/20 hover:shadow-[0_12px_30px_-20px_rgba(15,23,42,0.15)]'
                            }`}
                        >
                            {plan.badge && (
                                <div
                                    className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-[0.18em] px-3 py-1 rounded-full ${
                                        plan.featured
                                            ? 'bg-slate-900 text-white'
                                            : 'bg-indigo-600 text-white'
                                    }`}
                                >
                                    {plan.badge}
                                </div>
                            )}

                            <div className="mb-6">
                                <div className="flex items-center justify-between">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                        {plan.name}
                                    </div>
                                    {plan.savings && (
                                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                            {plan.savings}
                                        </span>
                                    )}
                                </div>
                                <div className="mt-4 flex items-baseline gap-1.5">
                                    <span className="text-4xl font-semibold tracking-[-0.02em] text-slate-950">
                                        {formatINR(plan.price)}
                                    </span>
                                    <span className="text-[12px] font-medium text-slate-400">
                                        one-time
                                    </span>
                                </div>
                                <div className="mt-3 flex flex-col gap-0.5 text-[12.5px]">
                                    <span className="font-semibold text-slate-900">
                                        {formatNum(plan.chats)} AI chats
                                    </span>
                                    <span className="text-slate-500">
                                        {formatNum(plan.credits)} credits · 100 / chat
                                    </span>
                                </div>
                            </div>

                            <ul className="space-y-3 mb-6 flex-grow">
                                {plan.features.map((f) => (
                                    <li key={f} className="flex items-start gap-2.5 text-[13px] text-slate-600">
                                        <Check className="w-4 h-4 text-slate-900 shrink-0 mt-0.5" strokeWidth={2.5} />
                                        <span>{f}</span>
                                    </li>
                                ))}
                            </ul>

                            <Link
                                to="/register"
                                className={`inline-flex items-center justify-center h-10 px-4 rounded-md text-[13px] font-medium transition-colors ${
                                    plan.featured
                                        ? 'bg-slate-900 text-white hover:bg-slate-800'
                                        : 'bg-white border border-slate-900/10 text-slate-900 hover:bg-slate-50 hover:border-slate-900/20'
                                }`}
                            >
                                Get {plan.name}
                                <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
                            </Link>
                        </motion.div>
                    ))}
                </div>

                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 text-[13px]">
                    <span className="text-slate-500">Need a custom volume or procurement contract?</span>
                    <a
                        href="https://nvhotech.com/book-appointment"
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-slate-900 hover:text-indigo-600 transition-colors inline-flex items-center gap-1"
                    >
                        Talk to our team
                        <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                </div>

                <p className="mt-8 text-center text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
                    Credits never expire · No subscription lock-in · Cancel anytime
                </p>
            </div>
        </section>
    );
};

export default Pricing;

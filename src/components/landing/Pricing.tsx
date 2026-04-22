import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

type Plan = {
    tag: string;
    name: string;
    priceMasked: string;
    tokens: string;
    chats: string;
    features: string[];
    featured?: boolean;
};

const plans: Plan[] = [
    {
        tag: 'Starter',
        name: 'Budget',
        priceMasked: '₹49',
        tokens: '122,500 tokens',
        chats: '~68 AI chats',
        features: ['Domain security', 'PDF & link training', 'Email support'],
    },
    {
        tag: 'Growth',
        name: 'Popular',
        priceMasked: '₹99',
        tokens: '247,500 tokens',
        chats: '~137 AI chats',
        features: ['Operations console', 'Smart analytics', 'Priority email support'],
    },
    {
        tag: 'Scale',
        name: 'Professional',
        priceMasked: '₹199',
        tokens: '522,375 tokens',
        chats: '~290 AI chats',
        features: ['24/7 autonomous resolution', 'Evaluations & versioning', 'Dedicated onboarding'],
        featured: true,
    },
    {
        tag: 'Enterprise',
        name: 'Enterprise',
        priceMasked: '₹499',
        tokens: '1,372,250 tokens',
        chats: '~762 AI chats',
        features: ['Data residency & BYOK', 'SSO / SAML', 'Solutions engineer'],
    },
];

const Pricing = () => {
    const appointmentUrl = 'https://nvhotech.com/book-appointment';

    return (
        <section className="py-24 sm:py-32 bg-[#FAFAFA]" id="pricing">
            <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
                <div className="max-w-2xl mx-auto text-center mb-16">
                    <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600 mb-5">
                        <span className="w-6 h-px bg-indigo-600" /> Pricing
                    </div>
                    <h2 className="text-3xl sm:text-5xl font-semibold tracking-[-0.02em] text-slate-950 leading-[1.05]">
                        Transparent pricing, calibrated to usage.
                    </h2>
                    <p className="mt-5 text-base text-slate-600 leading-relaxed">
                        Pay only for successful interactions. Credits never expire and carry forward on every recharge.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
                    {plans.map((plan, i) => (
                        <motion.div
                            key={plan.tag}
                            initial={{ opacity: 0, y: 14 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-60px' }}
                            transition={{ duration: 0.45, delay: i * 0.05, ease: 'easeOut' }}
                            className={`relative flex flex-col p-7 rounded-xl bg-white border transition-all ${
                                plan.featured
                                    ? 'border-slate-900 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.25)]'
                                    : 'border-slate-900/[0.08] hover:border-slate-900/20'
                            }`}
                        >
                            {plan.featured && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-semibold uppercase tracking-[0.18em] px-3 py-1 rounded-full">
                                    Most popular
                                </div>
                            )}

                            <div className="mb-6">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    {plan.tag}
                                </div>
                                <div className="mt-4 flex items-baseline gap-1">
                                    <span className="text-3xl font-semibold text-slate-950 blur-[6px] select-none" aria-label="Price hidden">
                                        {plan.priceMasked}
                                    </span>
                                    <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 blur-[4px] select-none" aria-hidden>
                                        / credit pack
                                    </span>
                                </div>
                                <div className="mt-2 text-[12px] font-medium text-indigo-600">
                                    {plan.tokens} · {plan.chats}
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

                            <a
                                href={appointmentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className={`inline-flex items-center justify-center h-10 px-4 rounded-md text-[13px] font-medium transition-colors ${
                                    plan.featured
                                        ? 'bg-slate-900 text-white hover:bg-slate-800'
                                        : 'bg-white border border-slate-900/10 text-slate-900 hover:bg-slate-50 hover:border-slate-900/20'
                                }`}
                            >
                                Discuss pricing
                            </a>
                        </motion.div>
                    ))}
                </div>

                <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3 text-[13px]">
                    <span className="text-slate-500">Need volume pricing or a custom contract?</span>
                    <a
                        href={appointmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-slate-900 hover:text-indigo-600 transition-colors inline-flex items-center gap-1"
                    >
                        Talk to our team
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                    </a>
                </div>
            </div>
        </section>
    );
};

export default Pricing;

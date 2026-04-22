import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, GraduationCap, Cloud, Briefcase, HeartPulse, Banknote } from 'lucide-react';

const industries = [
    {
        icon: ShoppingBag,
        title: 'E-commerce & Retail',
        desc: 'Guided shopping, returns automation, and proactive cart recovery across storefronts.',
        metric: '38% conversion lift',
    },
    {
        icon: Cloud,
        title: 'B2B SaaS',
        desc: 'Onboarding copilots, docs-native Q&A, and in-product support that scales with ARR.',
        metric: '62% ticket deflection',
    },
    {
        icon: GraduationCap,
        title: 'EdTech',
        desc: 'Always-on learning assistants across courses, cohorts, and enrollment journeys.',
        metric: '4.9 / 5 learner CSAT',
    },
    {
        icon: HeartPulse,
        title: 'Healthcare',
        desc: 'HIPAA-aware intake, appointment triage, and patient messaging with audit trails.',
        metric: '24/7 triage coverage',
    },
    {
        icon: Banknote,
        title: 'Financial Services',
        desc: 'Compliance-grounded agents for KYC flows, policy Q&A, and tier-1 disputes.',
        metric: 'SOC 2 Type II',
    },
    {
        icon: Briefcase,
        title: 'Agencies & Services',
        desc: 'White-labeled client assistants with per-tenant branding, billing, and analytics.',
        metric: 'Multi-tenant native',
    },
];

const Industries = () => {
    return (
        <section className="py-24 sm:py-32 bg-white" id="industries">
            <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
                <div className="max-w-2xl mb-16">
                    <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600 mb-5">
                        <span className="w-6 h-px bg-indigo-600" /> Industries
                    </div>
                    <h2 className="text-3xl sm:text-5xl font-semibold tracking-[-0.02em] text-slate-950 leading-[1.05]">
                        Purpose-built for the industries you operate in.
                    </h2>
                    <p className="mt-5 text-base text-slate-600 leading-relaxed max-w-xl">
                        Pre-trained vocabularies, workflow templates, and compliance presets — delivered out of the box.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {industries.map((item, i) => (
                        <motion.div
                            key={item.title}
                            initial={{ opacity: 0, y: 14 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-60px' }}
                            transition={{ duration: 0.45, delay: (i % 3) * 0.06, ease: 'easeOut' }}
                            className="group relative p-7 rounded-xl bg-white border border-slate-900/[0.08] hover:border-slate-900/20 hover:shadow-[0_12px_40px_-20px_rgba(15,23,42,0.15)] transition-all"
                        >
                            <div className="flex items-start justify-between mb-6">
                                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-slate-900/[0.04] text-slate-900 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <item.icon className="w-4.5 h-4.5" strokeWidth={1.75} />
                                </div>
                                <span className="text-[11px] font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                                    {item.metric}
                                </span>
                            </div>
                            <h3 className="text-[16px] font-semibold tracking-tight text-slate-950 mb-2">
                                {item.title}
                            </h3>
                            <p className="text-[13.5px] text-slate-600 leading-relaxed">
                                {item.desc}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Industries;

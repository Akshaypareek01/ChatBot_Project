import React from 'react';
import { motion } from 'framer-motion';
import {
    Clock,
    LayoutDashboard,
    CreditCard,
    ShieldCheck,
    LineChart,
    Zap,
    Globe2,
    Lock,
} from 'lucide-react';

const features = [
    {
        icon: Clock,
        title: '24/7 autonomous resolution',
        desc: 'Resolve tier-1 volume without human intervention. Agents escalate intelligently with full conversation context.',
    },
    {
        icon: LayoutDashboard,
        title: 'Operations-grade console',
        desc: 'Role-based access, evaluation suites, prompt versioning, and audit logs built for regulated enterprises.',
    },
    {
        icon: CreditCard,
        title: 'Predictable unit economics',
        desc: 'Pay only for successful interactions. Transparent token pricing, volume tiers, and never-expiring credits.',
    },
    {
        icon: ShieldCheck,
        title: 'Zero-trust domain controls',
        desc: 'Origin whitelisting, rate limits, and request signing prevent key abuse and unauthorized deployments.',
    },
    {
        icon: LineChart,
        title: 'Signal-rich analytics',
        desc: 'Resolution rate, deflection, CSAT, hallucination alerts, and cost-per-conversation — all in real time.',
    },
    {
        icon: Zap,
        title: 'Continuous training',
        desc: 'Sync from URLs, knowledge bases, and PDFs. Re-indexes on change — your agents are never stale.',
    },
    {
        icon: Globe2,
        title: 'Global-ready, multilingual',
        desc: 'Ship a single agent across 40+ languages with locale-aware tone, currency, and formatting.',
    },
    {
        icon: Lock,
        title: 'Enterprise-grade security',
        desc: 'SOC 2 Type II, ISO 27001, GDPR & DPDP aligned. Data residency and customer-managed keys on request.',
    },
];

const Capabilities = () => {
    return (
        <section className="py-24 sm:py-32 bg-[#FAFAFA] relative" id="benefits">
            {/* Top hairline */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

            <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
                <div className="max-w-2xl mb-20">
                    <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600 mb-5">
                        <span className="w-6 h-px bg-indigo-600" /> Platform
                    </div>
                    <h2 className="text-3xl sm:text-5xl font-semibold tracking-[-0.02em] text-slate-950 leading-[1.05]">
                        Engineered for the demands of modern enterprise.
                    </h2>
                    <p className="mt-5 text-base text-slate-600 leading-relaxed max-w-xl">
                        Every capability on this page is production-ready, observable, and audited. No beta flags, no surprise invoices.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 border-l border-t border-slate-900/[0.06] rounded-xl overflow-hidden bg-white">
                    {features.map((f, i) => (
                        <motion.div
                            key={f.title}
                            initial={{ opacity: 0, y: 12 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-60px' }}
                            transition={{ duration: 0.4, delay: (i % 4) * 0.05, ease: 'easeOut' }}
                            className="group relative p-8 border-r border-b border-slate-900/[0.06] hover:bg-slate-50/70 transition-colors"
                        >
                            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-slate-900/[0.04] text-slate-900 mb-5 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <f.icon className="w-4.5 h-4.5" strokeWidth={1.75} />
                            </div>
                            <h3 className="text-[15px] font-semibold tracking-tight text-slate-950 mb-2">
                                {f.title}
                            </h3>
                            <p className="text-[13.5px] text-slate-600 leading-relaxed">
                                {f.desc}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Capabilities;

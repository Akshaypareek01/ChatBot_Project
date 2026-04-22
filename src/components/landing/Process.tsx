import React from 'react';
import { motion } from 'framer-motion';
import { Code2, Database, Rocket } from 'lucide-react';

const steps = [
    {
        icon: Code2,
        tag: '01',
        title: 'Drop in a single line of code',
        desc: 'A 1.8 KB script with zero runtime dependencies. Deploys cleanly across React, Next.js, Shopify, WordPress, and custom stacks.',
    },
    {
        icon: Database,
        tag: '02',
        title: 'Connect your knowledge',
        desc: 'Ingest documentation, help centers, PDFs, Notion, and product APIs. Our retrieval engine grounds every response in your sources.',
    },
    {
        icon: Rocket,
        tag: '03',
        title: 'Ship to production',
        desc: 'Launch with observability, evaluations, and cost controls on day one. Monitor resolution rates, CSAT, and tokens in real time.',
    },
];

const Process = () => {
    return (
        <section className="py-24 sm:py-32 bg-white relative" id="how-it-works">
            <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
                <div className="max-w-2xl mb-20">
                    <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600 mb-5">
                        <span className="w-6 h-px bg-indigo-600" /> How it works
                    </div>
                    <h2 className="text-3xl sm:text-5xl font-semibold tracking-[-0.02em] text-slate-950 leading-[1.05]">
                        From zero to production-ready, in under an hour.
                    </h2>
                    <p className="mt-5 text-base text-slate-600 leading-relaxed max-w-xl">
                        A deliberate onboarding path engineered for teams that can't afford weeks of integration work.
                    </p>
                </div>

                <div className="relative grid md:grid-cols-3 gap-6 lg:gap-8">
                    {/* Connecting line */}
                    <div
                        aria-hidden
                        className="hidden md:block absolute top-8 left-[16.666%] right-[16.666%] h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"
                    />
                    {steps.map((step, i) => (
                        <motion.div
                            key={step.tag}
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-80px' }}
                            transition={{ duration: 0.5, delay: i * 0.08, ease: 'easeOut' }}
                            className="relative group"
                        >
                            <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-xl bg-white border border-slate-900/10 shadow-sm mb-6">
                                <step.icon className="w-5 h-5 text-slate-900" strokeWidth={1.75} />
                            </div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                                Step {step.tag}
                            </div>
                            <h3 className="text-[19px] font-semibold tracking-tight text-slate-950 mb-2">
                                {step.title}
                            </h3>
                            <p className="text-[14px] text-slate-600 leading-relaxed">
                                {step.desc}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Process;

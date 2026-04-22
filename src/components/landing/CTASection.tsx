import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const CTASection = () => {
    return (
        <section className="py-24 sm:py-32 px-5 sm:px-8 bg-white">
            <div className="max-w-[1200px] mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="relative overflow-hidden rounded-2xl border border-slate-900/10 bg-slate-950 px-6 sm:px-14 py-20 sm:py-28 text-center"
                >
                    {/* Gradient glow */}
                    <div
                        aria-hidden
                        className="absolute inset-x-0 top-0 h-[500px] -z-0"
                        style={{
                            background:
                                'radial-gradient(60% 80% at 50% 0%, rgba(99,102,241,0.35), rgba(59,130,246,0.12) 45%, transparent 70%)',
                        }}
                    />
                    {/* Grid texture */}
                    <div
                        aria-hidden
                        className="absolute inset-0 -z-0 opacity-[0.08]"
                        style={{
                            backgroundImage:
                                'linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.5) 1px, transparent 1px)',
                            backgroundSize: '56px 56px',
                            maskImage: 'radial-gradient(ellipse at center, black, transparent 70%)',
                        }}
                    />

                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-300 mb-6">
                            <span className="w-6 h-px bg-indigo-400/60" /> Get started
                        </div>
                        <h2 className="mx-auto max-w-3xl text-3xl sm:text-5xl lg:text-[56px] font-semibold tracking-[-0.025em] text-white leading-[1.05]">
                            Ready to ship AI your customers will actually trust?
                        </h2>
                        <p className="mx-auto max-w-xl mt-5 text-base text-slate-300 leading-relaxed">
                            Start for free with <span className="text-white font-medium">25,000 credits</span>. Upgrade only when you're ready for scale.
                        </p>
                        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
                            <Link to="/register" className="w-full sm:w-auto">
                                <button className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-6 rounded-md bg-white text-slate-950 text-[14px] font-medium hover:bg-slate-100 transition-all shadow-[0_1px_0_rgba(255,255,255,0.1)_inset,0_8px_24px_-6px_rgba(255,255,255,0.15)]">
                                    Start building for free
                                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                                </button>
                            </Link>
                            <a
                                href="https://nvhotech.com/book-appointment"
                                target="_blank"
                                rel="noreferrer"
                                className="w-full sm:w-auto inline-flex items-center justify-center h-11 px-6 rounded-md bg-white/5 border border-white/10 text-white text-[14px] font-medium hover:bg-white/10 hover:border-white/20 transition-all"
                            >
                                Talk to sales
                            </a>
                        </div>
                        <p className="mt-5 text-[12px] text-slate-400">
                            No credit card required · Launch in under an hour · Cancel anytime
                        </p>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default CTASection;

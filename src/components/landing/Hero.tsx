import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Check } from 'lucide-react';
import { useChat } from '@/context/ChatContext';

const Hero = () => {
    const { toggleChat, sendMessage } = useChat();

    /** Opens chat and seeds an integration-intent message. */
    const handleTalkToSales = () => {
        toggleChat();
        sendMessage("Hi! I'd like to evaluate IndicBot for my company. Can you walk me through the setup and enterprise plans?");
    };

    return (
        <section className="relative pt-32 sm:pt-40 lg:pt-48 pb-20 sm:pb-28 overflow-hidden bg-white">
            {/* Background grid */}
            <div
                aria-hidden
                className="absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_center_top,rgba(0,0,0,0.9),transparent_70%)]"
                style={{
                    backgroundImage:
                        'linear-gradient(to right, rgba(15,23,42,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.06) 1px, transparent 1px)',
                    backgroundSize: '56px 56px',
                }}
            />
            {/* Soft gradient glow */}
            <div
                aria-hidden
                className="absolute left-1/2 -translate-x-1/2 top-[-160px] w-[900px] h-[900px] -z-10 rounded-full opacity-60 blur-3xl"
                style={{
                    background:
                        'radial-gradient(circle at 50% 40%, rgba(79,70,229,0.18), rgba(59,130,246,0.12) 35%, transparent 65%)',
                }}
            />

            <div className="max-w-[1200px] mx-auto px-5 sm:px-8 relative">
                {/* Announcement pill */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="flex justify-center mb-8"
                >
                    <a
                        href="#benefits"
                        className="group inline-flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-white border border-slate-900/10 shadow-[0_1px_2px_rgba(15,23,42,0.04)] text-[12px] font-medium text-slate-700 hover:border-slate-900/20 transition-all"
                    >
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-semibold tracking-wide uppercase">
                            <Sparkles className="w-3 h-3" /> New
                        </span>
                        Multilingual AI agents — now generally available
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                    </a>
                </motion.div>

                {/* Headline */}
                <motion.h1
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.05, ease: 'easeOut' }}
                    className="mx-auto max-w-4xl text-center text-[40px] sm:text-6xl lg:text-[76px] font-semibold leading-[1.02] tracking-[-0.03em] text-slate-950"
                >
                    The enterprise AI support layer
                    <span className="block bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-500 bg-clip-text text-transparent">
                        your customers will trust.
                    </span>
                </motion.h1>

                {/* Subhead */}
                <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.12, ease: 'easeOut' }}
                    className="mx-auto max-w-2xl mt-6 text-center text-base sm:text-lg text-slate-600 leading-relaxed"
                >
                    Deploy production-grade AI agents trained on your product, documentation and brand voice — in minutes, not months. Built for teams operating at global scale.
                </motion.p>

                {/* CTAs */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
                    className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
                >
                    <Link to="/register" className="w-full sm:w-auto">
                        <button className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-6 rounded-md bg-slate-900 text-white text-[14px] font-medium hover:bg-slate-800 transition-all shadow-[0_1px_2px_rgba(15,23,42,0.08),0_8px_24px_-6px_rgba(79,70,229,0.25)]">
                            Start building for free
                            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                        </button>
                    </Link>
                    <button
                        type="button"
                        onClick={handleTalkToSales}
                        className="w-full sm:w-auto inline-flex items-center justify-center h-11 px-6 rounded-md bg-white border border-slate-900/10 text-slate-900 text-[14px] font-medium hover:bg-slate-50 hover:border-slate-900/20 transition-all"
                    >
                        Talk to sales
                    </button>
                </motion.div>

                {/* Trust row */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.35 }}
                    className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-slate-500"
                >
                    <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600" /> No credit card required</span>
                    <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600" /> 5 free chats to start</span>
                    <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600" /> SOC 2 &amp; ISO 27001</span>
                </motion.div>

                {/* Product preview */}
                <motion.div
                    initial={{ opacity: 0, y: 24, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="relative mt-20 mx-auto max-w-5xl"
                >
                    {/* Glow under card */}
                    <div
                        aria-hidden
                        className="absolute inset-x-10 -bottom-6 h-24 rounded-full blur-3xl opacity-60"
                        style={{ background: 'radial-gradient(50% 50% at 50% 50%, rgba(79,70,229,0.25), transparent)' }}
                    />
                    <div className="relative rounded-xl border border-slate-900/10 bg-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.15),0_0_0_1px_rgba(15,23,42,0.04)] overflow-hidden">
                        {/* Window chrome */}
                        <div className="flex items-center gap-2 px-4 h-9 border-b border-slate-900/5 bg-slate-50/60">
                            <div className="flex gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                            </div>
                            <div className="flex-1 mx-8">
                                <div className="h-5 max-w-[340px] mx-auto rounded bg-white border border-slate-900/5 text-[11px] text-slate-400 flex items-center justify-center">
                                    app.indicbot.ai / agents / support
                                </div>
                            </div>
                        </div>

                        {/* Preview body */}
                        <div className="grid md:grid-cols-[220px_1fr] min-h-[380px]">
                            {/* Sidebar */}
                            <aside className="hidden md:flex flex-col gap-1 border-r border-slate-900/5 bg-slate-50/40 p-3 text-[12px]">
                                {['Overview', 'Agents', 'Knowledge', 'Analytics', 'Integrations', 'Settings'].map((item, i) => (
                                    <div
                                        key={item}
                                        className={`px-2.5 py-1.5 rounded-md ${i === 1 ? 'bg-white text-slate-900 font-medium shadow-sm border border-slate-900/5' : 'text-slate-500'}`}
                                    >
                                        {item}
                                    </div>
                                ))}
                            </aside>

                            {/* Main */}
                            <div className="p-5 sm:p-7">
                                <div className="flex items-center justify-between mb-5">
                                    <div>
                                        <div className="text-[11px] text-slate-500 mb-1">Agent</div>
                                        <div className="text-[15px] font-semibold tracking-tight text-slate-900">Support Assistant</div>
                                    </div>
                                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Live
                                    </div>
                                </div>
                                {/* Chat */}
                                <div className="space-y-3">
                                    <div className="flex">
                                        <div className="max-w-[80%] rounded-2xl rounded-tl-md bg-slate-100 px-3.5 py-2 text-[13px] text-slate-800">
                                            How do I enable SSO for my team?
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-slate-900 text-white px-3.5 py-2 text-[13px] leading-relaxed">
                                            You can enable SAML SSO from Settings → Security. We support Okta, Azure AD and Google Workspace. Want me to walk you through it?
                                        </div>
                                    </div>
                                    <div className="flex">
                                        <div className="max-w-[80%] rounded-2xl rounded-tl-md bg-slate-100 px-3.5 py-2 text-[13px] text-slate-800">
                                            Yes — Okta, please.
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-slate-900 text-white px-3.5 py-2 text-[13px] leading-relaxed">
                                            Opening the Okta setup guide and pre-filling your workspace ID. I've drafted the IdP metadata — review &amp; confirm.
                                        </div>
                                    </div>
                                </div>
                                {/* Footer metrics */}
                                <div className="mt-6 pt-4 border-t border-slate-900/5 grid grid-cols-3 gap-4 text-[11px]">
                                    <div>
                                        <div className="text-slate-500">Resolution rate</div>
                                        <div className="text-slate-900 font-semibold text-[14px] tracking-tight">94.2%</div>
                                    </div>
                                    <div>
                                        <div className="text-slate-500">Avg response</div>
                                        <div className="text-slate-900 font-semibold text-[14px] tracking-tight">0.8s</div>
                                    </div>
                                    <div>
                                        <div className="text-slate-500">CSAT</div>
                                        <div className="text-slate-900 font-semibold text-[14px] tracking-tight">4.9 / 5</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Logo bar */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="mt-20 sm:mt-24"
                >
                    <p className="text-center text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400 mb-6">
                        Trusted by teams at
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-70">
                        {['Northwind', 'Acme Corp', 'Lumen', 'Meridian', 'Vertex', 'Hyperloop'].map((name) => (
                            <span key={name} className="text-[15px] font-semibold tracking-tight text-slate-400">
                                {name}
                            </span>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default Hero;

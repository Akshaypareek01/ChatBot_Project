import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

const Pricing = () => {
    return (
        <section className="py-32 bg-white" id="pricing">
            <div className="max-w-[1440px] mx-auto px-8 lg:px-20">
                <div className="text-center mb-24">
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary mb-6">Investment</h2>
                    <h3 className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900">Simple, Transparent Pricing</h3>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
                    {/* Budget Plan */}
                    <div className="p-8 rounded-[2.5rem] border border-slate-100 bg-white hover:border-primary/20 transition-all shadow-sm hover:shadow-md h-full flex flex-col">
                        <div className="mb-8">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Budget</span>
                            <div className="flex items-baseline gap-1 mt-4">
                                <span className="text-3xl font-bold text-slate-900">₹49</span>
                                <span className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">/ Credits</span>
                            </div>
                            <div className="mt-2 text-primary text-[10px] font-bold uppercase tracking-wider">122,500 Tokens</div>
                        </div>
                        <ul className="space-y-4 mb-8 flex-grow">
                            <li className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
                                <CheckCircle className="text-primary/40 w-3.5 h-3.5" /> ~68 AI Chats
                            </li>
                            <li className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
                                <CheckCircle className="text-primary/40 w-3.5 h-3.5" /> Domain Security
                            </li>
                            <li className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
                                <CheckCircle className="text-primary/40 w-3.5 h-3.5" /> PDF & Link Training
                            </li>
                        </ul>
                        <Link to="/register" className="block text-center w-full py-3.5 rounded-full border border-slate-200 text-[10px] font-bold uppercase tracking-button hover:border-primary hover:text-primary transition-all">
                            Select
                        </Link>
                    </div>

                    {/* Popular Plan */}
                    <div className="p-8 rounded-[2.5rem] border border-slate-100 bg-white hover:border-primary/20 transition-all shadow-sm hover:shadow-md h-full flex flex-col">
                        <div className="mb-8">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Popular</span>
                            <div className="flex items-baseline gap-1 mt-4">
                                <span className="text-3xl font-bold text-slate-900">₹99</span>
                                <span className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">/ Credits</span>
                            </div>
                            <div className="mt-2 text-primary text-[10px] font-bold uppercase tracking-wider">247,500 Tokens</div>
                        </div>
                        <ul className="space-y-4 mb-8 flex-grow">
                            <li className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
                                <CheckCircle className="text-primary/40 w-3.5 h-3.5" /> ~137 AI Chats
                            </li>
                            <li className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
                                <CheckCircle className="text-primary/40 w-3.5 h-3.5" /> Premium Dashboard
                            </li>
                            <li className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
                                <CheckCircle className="text-primary/40 w-3.5 h-3.5" /> Smart Analytics
                            </li>
                        </ul>
                        <Link to="/register" className="block text-center w-full py-3.5 rounded-full border border-slate-200 text-[10px] font-bold uppercase tracking-button hover:border-primary hover:text-primary transition-all">
                            Select
                        </Link>
                    </div>

                    {/* Professional Plan */}
                    <div className="p-10 rounded-[2.5rem] border border-primary/20 bg-white shadow-2xl shadow-primary/5 relative z-10 group h-full flex flex-col scale-105">
                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5rem]"></div>
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] shadow-lg shadow-primary/30 inner-glow whitespace-nowrap">
                            Best Value
                        </div>
                        <div className="mb-8 relative">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Professional</span>
                            <div className="flex items-baseline gap-1 mt-4">
                                <span className="text-4xl font-bold text-slate-900">₹199</span>
                                <span className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">/ Credits</span>
                            </div>
                            <div className="mt-2 text-green-600 text-[10px] font-bold uppercase tracking-wider">522,375 Tokens</div>
                        </div>
                        <ul className="space-y-4 mb-8 relative flex-grow">
                            <li className="flex items-center gap-3 text-[11px] font-medium text-slate-600">
                                <CheckCircle className="text-primary w-3.5 h-3.5" /> ~290 AI Chats
                            </li>
                            <li className="flex items-center gap-3 text-[11px] font-medium text-slate-600">
                                <CheckCircle className="text-primary w-3.5 h-3.5" /> 24/7 Intelligence
                            </li>
                            <li className="flex items-center gap-3 text-[11px] font-medium text-slate-600">
                                <CheckCircle className="text-primary w-3.5 h-3.5" /> Full Features
                            </li>
                        </ul>
                        <Link to="/register" className="block text-center w-full py-4 rounded-full bg-primary text-white text-[10px] font-bold uppercase tracking-button shadow-lg shadow-primary/20 inner-glow hover:bg-indigo-700 transition-all hover:scale-[1.02] relative z-20">
                            Get Started
                        </Link>
                    </div>

                    {/* Enterprise Plan */}
                    <div className="p-8 rounded-[2.5rem] border border-slate-100 bg-white hover:border-primary/20 transition-all shadow-sm hover:shadow-md h-full flex flex-col">
                        <div className="mb-8">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Enterprise</span>
                            <div className="flex items-baseline gap-1 mt-4">
                                <span className="text-3xl font-bold text-slate-900">₹499</span>
                                <span className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">/ Credits</span>
                            </div>
                            <div className="mt-2 text-green-600 text-[10px] font-bold uppercase tracking-wider">1,372,250 Tokens</div>
                        </div>
                        <ul className="space-y-4 mb-8 flex-grow">
                            <li className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
                                <CheckCircle className="text-primary/40 w-3.5 h-3.5" /> ~762 AI Chats
                            </li>
                            <li className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
                                <CheckCircle className="text-primary/40 w-3.5 h-3.5" /> Priority Support
                            </li>
                            <li className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
                                <CheckCircle className="text-primary/40 w-3.5 h-3.5" /> Expert Guidance
                            </li>
                        </ul>
                        <button className="w-full py-3.5 rounded-full border border-slate-200 text-[10px] font-bold uppercase tracking-button hover:border-primary hover:text-primary transition-all">
                            Contact
                        </button>
                    </div>
                </div>

                <div className="mt-16 flex flex-col items-center gap-4">
                    <p className="text-xs font-medium text-slate-600 bg-primary/5 border border-primary/10 px-6 py-3 rounded-full">
                        Need a specific amount? <span className="text-primary font-bold uppercase tracking-widest ml-2">Custom Recharge Available in Dashboard</span>
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                        * Tokens never expire and carry forward on recharge
                    </p>
                </div>
            </div>
        </section>
    );
};

export default Pricing;

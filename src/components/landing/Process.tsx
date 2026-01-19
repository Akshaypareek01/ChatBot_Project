import React from 'react';
import { Code, FileText, Zap } from 'lucide-react';

const Process = () => {
    return (
        <section className="py-32 bg-white" id="how-it-works">
            <div className="max-w-[1440px] mx-auto px-8 lg:px-20 text-center">
                <div className="mb-24">
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary mb-6">Process</h2>
                    <h3 className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900">Seamless Integration</h3>
                </div>
                <div className="grid md:grid-cols-3 gap-20">
                    <div className="group">
                        <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-10 group-hover:bg-primary/5 group-hover:border-primary/20 group-hover:text-primary transition-all duration-500">
                            <Code className="w-8 h-8" />
                        </div>
                        <h4 className="text-lg font-bold mb-4 tracking-tight">1. One-Line Script</h4>
                        <p className="text-slate-500 font-light leading-relaxed text-sm">Simply copy and paste our lightweight script into your header. Works with any stack.</p>
                    </div>
                    <div className="group">
                        <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-10 group-hover:bg-primary/5 group-hover:border-primary/20 group-hover:text-primary transition-all duration-500">
                            <FileText className="w-8 h-8" />
                        </div>
                        <h4 className="text-lg font-bold mb-4 tracking-tight">2. Train on Data</h4>
                        <p className="text-slate-500 font-light leading-relaxed text-sm">Upload PDFs or provide your URL. Our AI learns your brand voice and data instantly.</p>
                    </div>
                    <div className="group">
                        <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-10 group-hover:bg-primary/5 group-hover:border-primary/20 group-hover:text-primary transition-all duration-500">
                            <Zap className="w-8 h-8" />
                        </div>
                        <h4 className="text-lg font-bold mb-4 tracking-tight">3. Go Live</h4>
                        <p className="text-slate-500 font-light leading-relaxed text-sm">Your bot is now ready to handle 24/7 queries, leads, and sales automatically.</p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Process;

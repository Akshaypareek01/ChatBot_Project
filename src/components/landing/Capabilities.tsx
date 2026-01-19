import React from 'react';
import { ArrowRight, Users, LayoutGrid, Wallet, ShieldCheck, BarChart2, Zap } from 'lucide-react';

const Capabilities = () => {
    const features = [
        { icon: Users, title: "24/7 Intelligence", desc: "Provide instant support at 3 AM. No fatigue, no delays, just perfect answers." },
        { icon: LayoutGrid, title: "Premium Dashboard", desc: "Separate, intuitive interface for managing your bot, training data, and appearance." },
        { icon: Wallet, title: "Seamless Payments", desc: "Easy recharge with Indian gateways. Credits never expire and carry forward." },
        { icon: ShieldCheck, title: "Domain Security", desc: "Advanced whitelisting to prevent unauthorized use of your AI credits." },
        { icon: BarChart2, title: "Smart Management", desc: "Track real-time token consumption and bot performance with detailed analytics." },
        { icon: Zap, title: "Quick Training", desc: "Upload PDFs or sync your website in one click. Your bot learns your brand voice instantly." }
    ];

    return (
        <section className="py-32 bg-[#F9FAFB]" id="benefits">
            <div className="max-w-[1440px] mx-auto px-8 lg:px-20">
                <div className="flex flex-col md:flex-row justify-between items-end gap-10 mb-20">
                    <div className="max-w-xl">
                        <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary mb-6">Capabilities</h2>
                        <h3 className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900">Modern Features for Modern Commerce</h3>
                    </div>
                    <a className="text-[10px] font-bold uppercase tracking-button text-slate-400 hover:text-primary flex items-center gap-3 transition-colors group" href="#">
                        View All Features <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </a>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((benefit, i) => (
                        <div key={i} className="p-10 rounded-[2.5rem] glass-card border-white/80 group hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
                            <benefit.icon className="text-primary w-8 h-8 mb-8" />
                            <h4 className="text-lg font-bold mb-4 tracking-tight">{benefit.title}</h4>
                            <p className="text-slate-500 font-light text-sm leading-relaxed">{benefit.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Capabilities;

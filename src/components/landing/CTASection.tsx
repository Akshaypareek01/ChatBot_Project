import React from 'react';
import { Link } from 'react-router-dom';
import { Globe } from "@/components/ui/globe";
import { Particles } from "@/components/ui/particles";

const CTASection = () => {
    return (
        <section className="py-32 px-8">
            <div className="max-w-[1240px] mx-auto bg-slate-900 rounded-[3rem] p-16 lg:p-24 text-center relative overflow-hidden shadow-2xl transition-all hover:shadow-primary/10 group">
                {/* Particles background */}
                <Particles
                    className="absolute inset-0 z-0"
                    quantity={100}
                    staticity={50}
                    color="#ffffff"
                    refresh
                />

                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -mr-64 -mt-64"></div>

                {/* Globe in bottom right */}
                <div className="absolute -bottom-32 -right-32 w-[400px] h-[400px] md:w-[600px] md:h-[600px] opacity-20 pointer-events-none group-hover:opacity-30 transition-opacity">
                    <Globe />
                </div>

                <div className="relative z-10 animate-in fade-in zoom-in-95 duration-700">
                    <h2 className="text-4xl lg:text-6xl font-bold text-white mb-10 tracking-tight leading-tight">Ready to Automate Your Growth?</h2>
                    <p className="text-slate-400 text-lg mb-14 font-light max-w-2xl mx-auto leading-relaxed">Join the next generation of Indian B2B businesses. Start for free with <span className="text-white font-bold">25,000 credits</span> instantly.</p>
                    <div className="flex justify-center">
                        <Link to="/register" className="w-full sm:w-auto">
                            <button className="bg-primary text-white px-12 py-6 rounded-full text-sm font-bold uppercase tracking-button shadow-2xl shadow-primary/40 inner-glow hover:scale-105 transition-all w-full md:min-w-[320px]">
                                Create Your Chatbot
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default CTASection;

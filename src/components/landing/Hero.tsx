import React from 'react';
import { Link } from 'react-router-dom';
import { DotPattern } from "@/components/ui/dot-pattern";
import { cn } from "@/lib/utils";
import {
    Terminal,
    TypingAnimation,
    AnimatedSpan,
} from "@/components/ui/terminal";

const Hero = () => {
    return (
        <section className="relative pt-44 pb-32 overflow-hidden">
            <DotPattern
                className={cn(
                    "[mask-image:radial-gradient(800px_circle_at_center,white,transparent)]",
                    "opacity-50"
                )}
            />
            <div className="absolute aura-animation w-[800px] h-[800px] -top-20 -right-40 opacity-50"></div>
            <div className="max-w-[1440px] mx-auto px-8 lg:px-20 grid lg:grid-cols-2 gap-24 items-center">
                <div className="relative z-10 transition-all duration-1000 animate-in fade-in slide-in-from-left-8">
                    <div className="inline-flex items-center gap-3 bg-white/50 border border-white/80 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-10 backdrop-blur-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                        Pay-As-You-Go Excellence
                    </div>
                    <h1 className="text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight text-slate-900 mb-10">
                        AI Chatbot for <br /><span className="text-primary/90 font-light italic">Indian Business</span>
                    </h1>
                    <p className="text-xl text-slate-500 font-light leading-relaxed max-w-xl mb-12">
                        Deploy human-level intelligence to your website in minutes. Only pay for the interactions you use. Simple, powerful, and built for scale.
                    </p>
                    <div className="flex flex-wrap gap-5">
                        <Link to="/register">
                            <button className="bg-primary text-white px-10 py-5 rounded-full text-sm font-bold uppercase tracking-button shadow-2xl shadow-primary/30 inner-glow hover:-translate-y-1 transition-all">
                                Get Started Free
                            </button>
                        </Link>
                        <a href="#pricing">
                            <button className="border border-slate-200 bg-white/50 px-10 py-5 rounded-full text-sm font-bold uppercase tracking-button hover:bg-white transition-all">
                                View Pricing
                            </button>
                        </a>
                    </div>

                    <div className="mt-16 flex items-center gap-4">
                        <div className="flex -space-x-3">
                            <img alt="Client" className="w-10 h-10 rounded-full border-4 border-[#F9FAFB] shadow-sm" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBVg2al9OAvR_e2H95xoa14Id-aERFWuJN8WID7-unVS2EXxp9tu5r91KNbdP2NqMo_Mx4MH64pO3MUym4svAoTSE5oYLRUZOiJwZVR_KMCqOWpR6DColRTPvc5Qo7_8R3Kgt7sVCDab9yQoBfTt_bRXhR2sfR4ljNSTLgjKL1uZch1KXPEL6wNkJC7sRw7AZV80mWKOru3Wo3UiIA7lAhRa3k7m8CaMGdfqwYDIQat8EDOt6-t9vTE4glTFP1KBsYfZu-UaVGIT8ac" />
                            <img alt="Client" className="w-10 h-10 rounded-full border-4 border-[#F9FAFB] shadow-sm" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBLlDpjoMeqXl8EBIN7Z-c2I8wfPcf6oooXPN3UQ4igjzW08EOUW2AKbR-ibaX9l9SddZInYoeu5Ja3Uo1PAvYd-DRs1VzOnm5TeElGiI6rJ8GZzBQmsjFK-Rnuwv-8gBgv55acu1vVG9-0J4wSIvAauenfh9XCWXrmbfmcA17X6qKz9xixxJRWsaqjzmWAOEPvHIaxLIxSrxVRT2Izf2uVn2lnhuVAqgvVuBDtmfxy0-w3aNvFffA8Vq2rYwl76dlMuEJ0F_k2iNoo" />
                            <img alt="Client" className="w-10 h-10 rounded-full border-4 border-[#F9FAFB] shadow-sm" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCDLRHwSQP_eIssCbjhDXP27OS_-ZCI7BcF7dZSZWN2wuow1HhpD6Yhp2n_-nM9IePbx2TR_dl04m5UbY_jTVLvEX-53QHq7vCho9X0QYbXgCKtYxnhHDIcmSelvZl5TsvhvANbwUkdQFMyzbBKgsT1aZZqyRhjbJMCAb09_Sr3amT9yYmb_7fEx4Xm65bEL6Fn6wYL9BJHIeWctCaFehRvC67xOgb6_TPoBmMj7aDKdBETV29r1hmrUBiMyK7HVQXtRQdmv0YmDL5q" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">500+ Businesses Trust Us</span>
                    </div>
                </div>

                <div className="relative transition-all duration-1000 animate-in fade-in zoom-in-95 flex justify-center">
                    <div className="absolute inset-0 bg-primary/10 rounded-full blur-[120px] scale-110"></div>
                    <Terminal className="shadow-2xl border-white/60 bg-white/40 backdrop-blur-xl min-h-[460px]">
                        <TypingAnimation>&gt; Namaste! How can IndicBot help you today?</TypingAnimation>

                        <AnimatedSpan className="text-primary font-medium">
                            <span>ℹ Learning from your website URLs...</span>
                        </AnimatedSpan>

                        <AnimatedSpan className="text-primary font-medium">
                            <span>ℹ Importing knowledge from PDFs & Docs...</span>
                        </AnimatedSpan>

                        <AnimatedSpan className="text-primary font-medium">
                            <span>ℹ Syncing your custom Q&A / FAQs...</span>
                        </AnimatedSpan>

                        <AnimatedSpan className="text-blue-600 font-bold">
                            <span>✔ Domain-based security activated.</span>
                        </AnimatedSpan>

                        <TypingAnimation>&gt; How do I integrate this into my site?</TypingAnimation>

                        <AnimatedSpan className="text-green-600 font-bold">
                            <span>✔ Copy script & paste. Seamless integration!</span>
                        </AnimatedSpan>

                        <AnimatedSpan className="text-slate-600 font-medium">
                            <span>ℹ Track all AI chats & token usage in dashboard.</span>
                        </AnimatedSpan>

                        <TypingAnimation className="text-slate-400 italic">
                            Success! IndicBot is now active on your domain.
                        </TypingAnimation>

                        <AnimatedSpan className="text-primary font-bold mt-2">
                            <span>🚀 Register now for 25,000 free credits!</span>
                        </AnimatedSpan>
                    </Terminal>
                </div>
            </div>
        </section>
    );
};

export default Hero;

import React from 'react';
import { Receipt, ShieldCheck, Lock, Globe } from 'lucide-react';

const Compliance = () => {
    return (
        <section className="py-16 border-y border-slate-100 bg-white">
            <div className="max-w-[1440px] mx-auto px-8 lg:px-20 flex flex-wrap justify-center items-center gap-12 lg:gap-24 opacity-40 grayscale transition-all hover:grayscale-0 hover:opacity-100">
                <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em]"><Receipt className="w-4 h-4" /> GST Compliant</div>
                <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em]"><ShieldCheck className="w-4 h-4" /> DPDP Certified</div>
                <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em]"><Lock className="w-4 h-4" /> ISO 27001</div>
                <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em]"><Globe className="w-4 h-4" /> Servers in India</div>
            </div>
        </section>
    );
};

export default Compliance;

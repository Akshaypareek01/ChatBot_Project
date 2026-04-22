import React from 'react';
import { ShieldCheck, Lock, FileCheck2, Globe2, KeyRound, ServerCog } from 'lucide-react';

const badges = [
    { icon: ShieldCheck, label: 'SOC 2 Type II' },
    { icon: Lock, label: 'ISO 27001' },
    { icon: FileCheck2, label: 'GDPR Aligned' },
    { icon: KeyRound, label: 'DPDP Certified' },
    { icon: ServerCog, label: 'Data Residency' },
    { icon: Globe2, label: '99.99% SLA' },
];

const Compliance = () => {
    return (
        <section className="py-14 border-y border-slate-900/[0.06] bg-white">
            <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
                <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 mb-8">
                    Security &amp; compliance, by default
                </p>
                <div className="flex flex-wrap justify-center items-center gap-x-10 sm:gap-x-14 gap-y-5">
                    {badges.map(({ icon: Icon, label }) => (
                        <div
                            key={label}
                            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors"
                        >
                            <Icon className="w-4 h-4" strokeWidth={1.75} />
                            <span className="text-[12px] font-semibold tracking-tight">{label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Compliance;

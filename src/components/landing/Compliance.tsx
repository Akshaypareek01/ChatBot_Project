import React from 'react';
import { Lock, ShieldCheck, EyeOff, Server, KeyRound, Activity } from 'lucide-react';

/**
 * Honest security promises (not certification claims).
 * We don't claim SOC 2 / ISO / DPDP until we actually hold them.
 */
const promises = [
    { icon: Lock, label: 'Encrypted in transit & at rest' },
    { icon: ShieldCheck, label: 'Tenant-level data isolation' },
    { icon: EyeOff, label: 'Your data never trains our models' },
    { icon: KeyRound, label: 'Domain whitelisting & key rotation' },
    { icon: Server, label: 'Daily encrypted backups' },
    { icon: Activity, label: 'Uptime target 99.9%' },
];

const Compliance = () => {
    return (
        <section id="security" className="py-14 border-y border-slate-900/[0.06] bg-white">
            <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
                <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 mb-8">
                    Security, by design
                </p>
                <div className="flex flex-wrap justify-center items-center gap-x-10 sm:gap-x-14 gap-y-5">
                    {promises.map(({ icon: Icon, label }) => (
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

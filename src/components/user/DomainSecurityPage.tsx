import React, { useState, useEffect } from 'react';
import {
    Shield,
    Plus,
    Trash2,
    AlertCircle,
    Globe,
    Lock,
    CheckCircle2,
} from 'lucide-react';
import { getUserProfile, updateAllowedDomains } from '@/services/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const DomainSecurityPage = () => {
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [newDomain, setNewDomain] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const userData = await getUserProfile();
                setUser(userData);
            } catch (error) {
                console.error('Error fetching profile:', error);
                toast.error('Could not load security settings');
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handleAddDomain = async () => {
        if (!newDomain) return;
        const cleanDomain = newDomain
            .trim()
            .toLowerCase()
            .replace(/^https?:\/\//, '')
            .replace(/\/$/, '');
        if (!cleanDomain) return;

        const updatedDomains = [...(user.allowedDomains || []), cleanDomain];
        setIsUpdating(true);
        try {
            await updateAllowedDomains(updatedDomains);
            setUser({ ...user, allowedDomains: updatedDomains });
            setNewDomain('');
            toast.success('Domain added successfully');
        } catch (error: any) {
            toast.error(error.message || 'Failed to add domain');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleRemoveDomain = async (domain: string) => {
        const updatedDomains = user.allowedDomains.filter((d: string) => d !== domain);
        setIsUpdating(true);
        try {
            await updateAllowedDomains(updatedDomains);
            setUser({ ...user, allowedDomains: updatedDomains });
            toast.success('Domain removed');
        } catch (error: any) {
            toast.error('Failed to remove domain');
        } finally {
            setIsUpdating(false);
        }
    };

    const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && newDomain.trim()) {
            handleAddDomain();
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
            </div>
        );
    }

    const domains: string[] = user?.allowedDomains || [];
    const isLocked = domains.length > 0;

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div>
                <div className="inline-flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-indigo-600 mb-2">
                    <span className="w-3 h-px bg-indigo-600" />
                    Security
                </div>
                <h1 className="text-[28px] sm:text-[34px] font-semibold tracking-[-0.02em] text-slate-950 leading-tight">
                    Domain security
                </h1>
                <p className="text-[13px] text-slate-500 mt-1.5 max-w-2xl leading-relaxed">
                    Lock your chatbot to specific domains so others can’t copy your script and burn your credits on their site.
                </p>
            </div>

            {/* Status banner */}
            <div
                className={cn(
                    'rounded-xl border p-4 flex items-start gap-3',
                    isLocked
                        ? 'border-emerald-200/70 bg-emerald-50'
                        : 'border-amber-200/70 bg-amber-50'
                )}
            >
                <div
                    className={cn(
                        'w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0',
                        isLocked
                            ? 'bg-emerald-500/15 text-emerald-600'
                            : 'bg-amber-500/15 text-amber-600'
                    )}
                >
                    {isLocked ? (
                        <Lock className="w-4 h-4" strokeWidth={2} />
                    ) : (
                        <AlertCircle className="w-4 h-4" strokeWidth={2} />
                    )}
                </div>
                <div className="min-w-0">
                    <p
                        className={cn(
                            'text-[13px] font-semibold tracking-tight',
                            isLocked ? 'text-emerald-900' : 'text-amber-900'
                        )}
                    >
                        {isLocked
                            ? `Locked to ${domains.length} domain${domains.length > 1 ? 's' : ''}`
                            : 'Unrestricted — chatbot will load on any domain'}
                    </p>
                    <p
                        className={cn(
                            'text-[12px] mt-0.5 leading-relaxed',
                            isLocked ? 'text-emerald-800/80' : 'text-amber-800/80'
                        )}
                    >
                        {isLocked
                            ? 'Requests from other domains will be rejected and won’t consume credits.'
                            : 'Add at least one domain below to prevent script theft.'}
                    </p>
                </div>
            </div>

            {/* Allowed domains card */}
            <div className="rounded-xl border border-slate-900/[0.06] bg-white overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-900/[0.06] flex items-start gap-3">
                    <div className="w-7 h-7 rounded-md bg-indigo-600/10 text-indigo-600 flex items-center justify-center flex-shrink-0">
                        <Shield className="w-3.5 h-3.5" strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <h3 className="text-[14px] font-semibold tracking-tight text-slate-950 leading-none">
                                Allowed domains
                            </h3>
                            <span className="inline-flex items-center px-1.5 h-4 rounded-sm bg-indigo-600/10 text-indigo-600 text-[9px] font-semibold uppercase tracking-[0.14em]">
                                Premium
                            </span>
                        </div>
                        <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
                            The chatbot will only load on domains listed here. Use <code className="px-1 py-0.5 rounded bg-slate-900/[0.05] text-slate-700 font-mono text-[10.5px]">*.example.com</code> for subdomains.
                        </p>
                    </div>
                </div>

                {/* Add row */}
                <div className="p-5 border-b border-slate-900/[0.06]">
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-1.5">
                        <Globe className="w-3 h-3" strokeWidth={2} />
                        Add a domain
                    </label>
                    <div className="flex gap-2">
                        <input
                            value={newDomain}
                            onChange={(e) => setNewDomain(e.target.value)}
                            onKeyDown={onKey}
                            disabled={isUpdating}
                            placeholder="e.g. example.com or *.example.com"
                            className="flex-1 h-9 px-3 rounded-md border border-slate-900/[0.08] bg-white text-[13px] text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                        />
                        <button
                            type="button"
                            onClick={handleAddDomain}
                            disabled={isUpdating || !newDomain.trim()}
                            className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-md bg-slate-950 text-white text-[12.5px] font-semibold tracking-tight hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" strokeWidth={2.25} />
                            Add domain
                        </button>
                    </div>
                </div>

                {/* List */}
                <div className="p-5 bg-[#FAFAFA]">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Active authorized domains
                        </h4>
                        {domains.length > 0 && (
                            <span className="text-[11px] text-slate-400 tabular-nums">
                                {domains.length} domain{domains.length > 1 ? 's' : ''}
                            </span>
                        )}
                    </div>

                    {domains.length > 0 ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                            {domains.map((domain) => (
                                <div
                                    key={domain}
                                    className="group flex items-center justify-between gap-3 px-3.5 py-2.5 bg-white border border-slate-900/[0.06] rounded-lg hover:border-slate-900/[0.12] transition-all"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <CheckCircle2
                                            className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0"
                                            strokeWidth={2.25}
                                        />
                                        <span className="text-[12.5px] font-mono text-slate-800 tracking-tight truncate">
                                            {domain}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveDomain(domain)}
                                        disabled={isUpdating}
                                        className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-lg border border-dashed border-slate-900/[0.12] bg-white py-8 text-center">
                            <div className="w-10 h-10 mx-auto rounded-full bg-slate-900/[0.04] flex items-center justify-center mb-3">
                                <Shield className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
                            </div>
                            <p className="text-[12.5px] font-semibold text-slate-700">
                                No domains restricted yet
                            </p>
                            <p className="text-[11.5px] text-slate-500 mt-0.5">
                                Add your domain above to lock the chatbot.
                            </p>
                        </div>
                    )}
                </div>

                {/* Tips footer */}
                <div className="px-5 py-3.5 border-t border-slate-900/[0.06] bg-white">
                    <div className="flex items-start gap-2">
                        <AlertCircle
                            className="w-3.5 h-3.5 text-indigo-600 mt-0.5 flex-shrink-0"
                            strokeWidth={2}
                        />
                        <div className="text-[11.5px] text-slate-600 leading-relaxed">
                            <span className="font-semibold text-slate-900">Tips: </span>
                            enter the bare domain (
                            <code className="px-1 py-0.5 rounded bg-slate-900/[0.05] font-mono text-[10.5px] text-slate-700">
                                mysite.com
                            </code>
                            ) to allow that origin, use{' '}
                            <code className="px-1 py-0.5 rounded bg-slate-900/[0.05] font-mono text-[10.5px] text-slate-700">
                                *.mysite.com
                            </code>{' '}
                            for all subdomains, or leave the list empty to allow all origins.
                        </div>
                    </div>
                </div>
            </div>

            {/* Why this matters */}
            <div className="rounded-xl border border-dashed border-slate-900/[0.12] bg-white p-5">
                <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-md bg-slate-900/[0.04] text-slate-700 flex items-center justify-center flex-shrink-0">
                        <Lock className="w-3.5 h-3.5" strokeWidth={2} />
                    </div>
                    <div className="min-w-0">
                        <h4 className="text-[12.5px] font-semibold tracking-tight text-slate-900">
                            Why does this matter?
                        </h4>
                        <p className="text-[11.5px] text-slate-500 mt-1 leading-relaxed">
                            Web scraping and script theft are common. Without domain locking, anyone can copy your unique
                            script src from your public site and embed your bot on their own — burning your paid AI
                            credits. Domain authorization keeps your spend tied to your business.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DomainSecurityPage;

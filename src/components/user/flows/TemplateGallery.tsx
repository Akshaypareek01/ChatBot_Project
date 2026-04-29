/**
 * Modal gallery of enterprise-grade flow templates. Hits
 * GET /users/flows/templates for summaries and POST /users/flows/templates/:id
 * to clone the chosen template into the current bot.
 */

import React, { useEffect, useState } from 'react';
import { Boxes, KeyRound, Sparkles, X, Globe2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { cloneFlowTemplate, getFlowTemplates } from '@/services/api';
import type { TemplateSummary, FlowNodeType } from './types';
import { getNodeSpec } from './nodeSpecs';

type Props = {
    open: boolean;
    onClose: () => void;
    botId?: string | null;
    onCloned: (flowId: string) => void;
};

export default function TemplateGallery({
    open,
    onClose,
    botId,
    onCloned,
}: Props) {
    const [templates, setTemplates] = useState<TemplateSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        getFlowTemplates()
            .then((d) => setTemplates(d?.templates ?? []))
            .catch(() => toast.error('Failed to load templates'))
            .finally(() => setLoading(false));
    }, [open]);

    if (!open) return null;

    const handlePick = async (id: string) => {
        setBusyId(id);
        try {
            const r = await cloneFlowTemplate(id, { botId });
            const flowId = r?.flow?._id || r?._id;
            if (!flowId) throw new Error('No flow id returned');
            toast.success('Template imported as draft');
            onCloned(flowId);
            onClose();
        } catch (e: any) {
            toast.error(e?.message || 'Failed to clone template');
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[60] flex items-stretch sm:items-center justify-center"
            role="dialog"
            aria-modal="true"
        >
            <div
                className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
                onClick={onClose}
            />

            <div className="relative w-full sm:max-w-[820px] sm:max-h-[88vh] bg-white sm:rounded-2xl shadow-[0_24px_60px_-20px_rgba(15,23,42,0.4)] flex flex-col overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-900/[0.06] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                            <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-[14px] font-semibold tracking-tight text-slate-950">
                                Start from a template
                            </p>
                            <p className="text-[12px] text-slate-500">
                                Production-ready flows for the most common
                                enterprise use cases.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-900/[0.04] transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="overflow-y-auto p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {loading && (
                        <div className="col-span-2 py-12 text-center text-[13px] text-slate-500">
                            Loading templates\u2026
                        </div>
                    )}

                    {!loading && templates.length === 0 && (
                        <div className="col-span-2 py-12 text-center text-[13px] text-slate-500">
                            No templates available.
                        </div>
                    )}

                    {templates.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => handlePick(t.id)}
                            disabled={busyId !== null}
                            className={cn(
                                'group/card text-left rounded-xl border border-slate-900/[0.08] bg-white p-4 hover:border-slate-900/16 hover:shadow-[0_12px_28px_-16px_rgba(15,23,42,0.18)] transition-all',
                                busyId === t.id && 'opacity-60 cursor-wait',
                                busyId && busyId !== t.id && 'opacity-40'
                            )}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-[13px] font-semibold tracking-tight text-slate-950 truncate">
                                        {t.name}
                                    </p>
                                    <p className="text-[11.5px] text-slate-500 mt-0.5 line-clamp-2 leading-snug">
                                        {t.description}
                                    </p>
                                </div>
                                <div className="flex flex-col gap-1 items-end flex-shrink-0">
                                    {t.usesApi && (
                                        <Pill icon={<Globe2 className="w-3 h-3" />}>
                                            API
                                        </Pill>
                                    )}
                                    {t.usesSecrets && (
                                        <Pill icon={<KeyRound className="w-3 h-3" />}>
                                            Secrets
                                        </Pill>
                                    )}
                                </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between">
                                <NodeChips types={t.nodeTypes} />
                                <span className="inline-flex items-center gap-1 text-[10.5px] text-slate-500">
                                    <Boxes className="w-3 h-3" />
                                    {t.nodeCount} nodes
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

const Pill: React.FC<{ children: React.ReactNode; icon?: React.ReactNode }> = ({
    children,
    icon,
}) => (
    <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded-full bg-slate-900/[0.04] text-slate-700 text-[10px] font-semibold uppercase tracking-[0.1em]">
        {icon}
        {children}
    </span>
);

const NodeChips: React.FC<{ types: FlowNodeType[] }> = ({ types }) => {
    const unique = Array.from(new Set(types)).slice(0, 5);
    return (
        <div className="flex items-center gap-1">
            {unique.map((t) => {
                const spec = getNodeSpec(t);
                const Icon = spec.icon;
                return (
                    <span
                        key={t}
                        title={spec.label}
                        className={cn(
                            'w-5 h-5 rounded flex items-center justify-center',
                            spec.iconBg,
                            spec.iconColor
                        )}
                    >
                        <Icon className="w-3 h-3" strokeWidth={2} />
                    </span>
                );
            })}
        </div>
    );
};

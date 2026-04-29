/**
 * Sidebar list of flows. Pure presentation \u2014 the parent owns selection
 * state and the create / template actions, plus the per-row activation
 * callbacks (Activate / Deactivate). Activation calls go through the bot
 * behaviour mode API and are confirmed inline before being submitted.
 */

import React from 'react';
import { Plus, Power, PowerOff, Sparkles, Workflow } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FlowSummary } from './types';

type Props = {
    flows: FlowSummary[];
    selectedId: string | null;
    loading: boolean;
    onSelect: (id: string) => void;
    onNew: () => void;
    onUseTemplate: () => void;
    /**
     * Bot id for which we're showing flows. Activation is per-bot, so we need
     * this to scope the Active pill correctly when it's null.
     */
    activeFlowId?: string | null;
    /** Switch the bot to run this flow. Parent shows confirmation. */
    onActivate?: (flowId: string) => void;
    /** Revert the bot back to Default AI mode. */
    onDeactivate?: (flowId: string) => void;
};

export default function FlowSidebar({
    flows,
    selectedId,
    loading,
    onSelect,
    onNew,
    onUseTemplate,
    activeFlowId = null,
    onActivate,
    onDeactivate,
}: Props) {
    return (
        <aside className="rounded-xl border border-slate-900/[0.06] bg-white overflow-hidden h-fit">
            <div className="px-5 py-4 border-b border-slate-900/[0.06]">
                <h2 className="text-[13px] font-semibold tracking-tight text-slate-950">
                    Your flows
                </h2>
                <p className="text-[11.5px] text-slate-500 mt-0.5">
                    Each bot can have one published flow active.
                </p>
            </div>

            <div className="p-3 grid grid-cols-2 gap-2">
                <button
                    type="button"
                    onClick={onNew}
                    className="inline-flex items-center justify-center gap-1.5 h-9 rounded-md bg-slate-950 text-white text-[12.5px] font-semibold hover:bg-slate-800 transition-colors"
                >
                    <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                    Blank
                </button>
                <button
                    type="button"
                    onClick={onUseTemplate}
                    className="inline-flex items-center justify-center gap-1.5 h-9 rounded-md bg-white border border-slate-900/[0.08] text-[12.5px] font-semibold text-slate-700 hover:text-slate-950 hover:border-slate-900/20 transition-colors"
                >
                    <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
                    Templates
                </button>
            </div>

            <div className="px-2 pb-3 max-h-[420px] overflow-y-auto">
                {loading ? (
                    <div className="px-3 py-6 text-[12.5px] text-slate-500">
                        Loading flows\u2026
                    </div>
                ) : flows.length === 0 ? (
                    <EmptyState />
                ) : (
                    <ul className="space-y-0.5">
                        {flows.map((f) => (
                            <FlowRow
                                key={f._id}
                                flow={f}
                                active={selectedId === f._id}
                                isLiveOnBot={activeFlowId === f._id}
                                onClick={() => onSelect(f._id)}
                                onActivate={onActivate}
                                onDeactivate={onDeactivate}
                            />
                        ))}
                    </ul>
                )}
            </div>
        </aside>
    );
}

const EmptyState: React.FC = () => (
    <div className="px-3 py-6 text-center">
        <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-slate-900/[0.04] text-slate-400 mb-2">
            <Workflow className="w-4 h-4" strokeWidth={1.75} />
        </div>
        <p className="text-[12.5px] text-slate-500">No flows yet</p>
        <p className="text-[11.5px] text-slate-400 mt-0.5">
            Create a blank flow or pick a template.
        </p>
    </div>
);

const FlowRow: React.FC<{
    flow: FlowSummary;
    active: boolean;
    isLiveOnBot: boolean;
    onClick: () => void;
    onActivate?: (flowId: string) => void;
    onDeactivate?: (flowId: string) => void;
}> = ({ flow, active, isLiveOnBot, onClick, onActivate, onDeactivate }) => {
    const status = flow.status || (flow.isActive ? 'published' : 'draft');
    const isPublished = status === 'published';

    /**
     * Stop click propagation so activating doesn't also re-select.
     * The parent confirms with a modal before calling the API.
     */
    const handleActivate = (e: React.MouseEvent) => {
        e.stopPropagation();
        onActivate?.(flow._id);
    };
    const handleDeactivate = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDeactivate?.(flow._id);
    };

    return (
        <li>
            <div
                className={cn(
                    'group w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-[13px] transition-colors',
                    active
                        ? 'bg-slate-900/[0.05] text-slate-950'
                        : 'text-slate-700 hover:text-slate-950 hover:bg-slate-900/[0.03]'
                )}
            >
                <button
                    type="button"
                    onClick={onClick}
                    className="min-w-0 text-left flex-1 flex items-center gap-2"
                >
                    <div className="min-w-0">
                        <p
                            className={cn(
                                'truncate tracking-tight',
                                active && 'font-semibold'
                            )}
                        >
                            {flow.name || 'Untitled flow'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <p className="text-[10.5px] text-slate-400">
                                v{flow.publishedVersion ?? 0}
                            </p>
                            <StatusPill status={status} />
                            {isLiveOnBot && (
                                <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                                    <Power className="w-2.5 h-2.5" strokeWidth={2.5} />
                                    Active
                                </span>
                            )}
                        </div>
                    </div>
                </button>

                {isLiveOnBot && onDeactivate ? (
                    <button
                        type="button"
                        onClick={handleDeactivate}
                        title="Stop running this flow — bot returns to Default AI"
                        aria-label="Deactivate flow"
                        className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md bg-white border border-slate-900/[0.08] text-slate-600 hover:text-rose-700 hover:border-rose-200 transition-colors"
                    >
                        <PowerOff className="w-3 h-3" strokeWidth={2.25} />
                    </button>
                ) : isPublished && onActivate ? (
                    <button
                        type="button"
                        onClick={handleActivate}
                        title="Activate this flow — bot will run it for every visitor"
                        aria-label="Activate flow"
                        className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md bg-white border border-slate-900/[0.08] text-slate-600 hover:text-emerald-700 hover:border-emerald-200 transition-colors"
                    >
                        <Power className="w-3 h-3" strokeWidth={2.25} />
                    </button>
                ) : null}
            </div>
        </li>
    );
};

const StatusPill: React.FC<{ status: string }> = ({ status }) => {
    const m: Record<string, string> = {
        draft: 'bg-amber-50 text-amber-700',
        published: 'bg-indigo-50 text-indigo-700',
        archived: 'bg-slate-100 text-slate-500',
    };
    return (
        <span
            className={cn(
                'inline-flex items-center h-4 px-1.5 rounded-full text-[9.5px] font-semibold uppercase tracking-[0.1em]',
                m[status] || m.draft
            )}
        >
            {status}
        </span>
    );
};

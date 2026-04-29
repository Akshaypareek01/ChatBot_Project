/**
 * Modal for switching a bot between Default AI and a published Flow. Renders
 * two large cards plus a flow picker (only when "Flow" is chosen). Calls
 * `onSubmit` with the resolved payload — never owns the network call.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Bot, CheckCircle2, Workflow, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FlowSummary } from './types';

type Mode = 'default' | 'flow';

type Props = {
    open: boolean;
    onClose: () => void;
    /** Currently saved behaviour for this bot. */
    currentMode: Mode;
    /** Currently active flow id (only set when currentMode === 'flow'). */
    currentActiveFlowId: string | null;
    /** All flows for this bot — only `published` ones are selectable. */
    flows: FlowSummary[];
    /**
     * Submit handler. The parent calls `setBotBehavior` and refreshes context.
     * The modal closes itself on success.
     */
    onSubmit: (payload: {
        mode: Mode;
        activeFlowId: string | null;
    }) => Promise<void>;
};

export default function BehaviorChangeModal({
    open,
    onClose,
    currentMode,
    currentActiveFlowId,
    flows,
    onSubmit,
}: Props) {
    const [mode, setMode] = useState<Mode>(currentMode);
    const [flowId, setFlowId] = useState<string | null>(currentActiveFlowId);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) return;
        setMode(currentMode);
        setFlowId(currentActiveFlowId);
    }, [open, currentMode, currentActiveFlowId]);

    const publishedFlows = useMemo(
        () => flows.filter((f) => (f.status || (f.isActive ? 'published' : 'draft')) === 'published'),
        [flows]
    );

    if (!open) return null;

    /**
     * Validates the local state and calls `onSubmit`. We let the parent
     * surface its own toasts because errors map to network/server messages.
     */
    const handleConfirm = async () => {
        if (mode === 'flow' && !flowId) return;
        setSubmitting(true);
        try {
            await onSubmit({
                mode,
                activeFlowId: mode === 'flow' ? flowId : null,
            });
            onClose();
        } finally {
            setSubmitting(false);
        }
    };

    const dirty =
        mode !== currentMode ||
        (mode === 'flow' && flowId !== currentActiveFlowId);

    return (
        <div
            className="fixed inset-0 z-[60] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="behavior-modal-title"
        >
            <div className="w-full max-w-[600px] max-h-[88vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-900/[0.08]">
                <header className="px-5 py-4 border-b border-slate-900/[0.06] flex items-center justify-between">
                    <div>
                        <h2
                            id="behavior-modal-title"
                            className="text-[15px] font-semibold tracking-tight text-slate-950"
                        >
                            Change bot behavior
                        </h2>
                        <p className="mt-0.5 text-[12px] text-slate-500">
                            Pick how this bot answers visitors. You can switch back any time.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-900/[0.04] transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
                    <ModeCard
                        icon={<Bot className="w-5 h-5" strokeWidth={2} />}
                        title="Default AI"
                        subtitle="KB-grounded answers from your uploaded data"
                        bullets={[
                            'Uses your knowledge base + LLM',
                            'No flow runs — fully open conversation',
                            'Best for FAQs and general support',
                        ]}
                        active={mode === 'default'}
                        onClick={() => setMode('default')}
                    />

                    <ModeCard
                        icon={<Workflow className="w-5 h-5" strokeWidth={2} />}
                        title="Run a Flow"
                        subtitle="A structured journey with branches, capture, API calls, handoff…"
                        bullets={[
                            'Pick one published flow below',
                            'Visitors get the same flow on every message',
                            'Falls back to AI for nodes that need it',
                        ]}
                        active={mode === 'flow'}
                        onClick={() => setMode('flow')}
                        disabled={publishedFlows.length === 0}
                        disabledHint="No published flows yet — publish one to enable."
                    />

                    {mode === 'flow' && (
                        <div className="mt-2 px-1">
                            <label className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Active flow
                            </label>
                            <select
                                value={flowId || ''}
                                onChange={(e) => setFlowId(e.target.value || null)}
                                className="mt-1.5 w-full h-10 px-3 rounded-md bg-white border border-slate-900/[0.08] text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
                            >
                                <option value="" disabled>
                                    Pick a published flow…
                                </option>
                                {publishedFlows.map((f) => (
                                    <option key={f._id} value={f._id}>
                                        {f.name || 'Untitled flow'}
                                        {f.publishedVersion
                                            ? `  (v${f.publishedVersion})`
                                            : ''}
                                    </option>
                                ))}
                            </select>
                            {publishedFlows.length === 0 && (
                                <p className="mt-2 text-[12px] text-amber-700">
                                    No published flows yet. Publish a draft to make it selectable here.
                                </p>
                            )}
                        </div>
                    )}

                    {dirty && mode === 'flow' && flowId && (
                        <div className="mt-2 px-3 py-2.5 rounded-md bg-amber-50 border border-amber-200/60 text-[12px] text-amber-900">
                            <strong className="font-semibold">Heads up:</strong>{' '}
                            Visitors will stop getting Default AI replies and start running
                            this flow on every message.
                        </div>
                    )}
                    {dirty && mode === 'default' && currentMode === 'flow' && (
                        <div className="mt-2 px-3 py-2.5 rounded-md bg-slate-50 border border-slate-200/80 text-[12px] text-slate-700">
                            <strong className="font-semibold">Heads up:</strong>{' '}
                            The active flow will stop running. Visitors fall back to AI.
                        </div>
                    )}
                </div>

                <footer className="px-5 py-4 border-t border-slate-900/[0.06] flex items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center h-9 px-3.5 rounded-md bg-white border border-slate-900/[0.08] text-[12.5px] font-semibold text-slate-700 hover:text-slate-950 hover:border-slate-900/20 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={!dirty || submitting || (mode === 'flow' && !flowId)}
                        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-slate-950 text-white text-[12.5px] font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {submitting ? 'Saving…' : 'Apply change'}
                    </button>
                </footer>
            </div>
        </div>
    );
}

const ModeCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    bullets: string[];
    active: boolean;
    onClick: () => void;
    disabled?: boolean;
    disabledHint?: string;
}> = ({ icon, title, subtitle, bullets, active, onClick, disabled, disabledHint }) => (
    <button
        type="button"
        onClick={disabled ? undefined : onClick}
        aria-pressed={active}
        disabled={disabled}
        className={cn(
            'w-full text-left rounded-xl border px-4 py-3.5 transition-all flex items-start gap-3',
            active
                ? 'border-slate-950 bg-slate-50/60 ring-2 ring-slate-950/[0.05]'
                : 'border-slate-900/[0.08] hover:border-slate-900/20 bg-white',
            disabled && 'opacity-60 pointer-events-none'
        )}
        title={disabled ? disabledHint : undefined}
    >
        <div
            className={cn(
                'inline-flex items-center justify-center w-9 h-9 rounded-md flex-shrink-0',
                active
                    ? 'bg-slate-950 text-white'
                    : 'bg-slate-900/[0.04] text-slate-700'
            )}
        >
            {icon}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
                <h3 className="text-[14px] font-semibold tracking-tight text-slate-950">
                    {title}
                </h3>
                {active && (
                    <CheckCircle2
                        className="w-3.5 h-3.5 text-slate-950"
                        strokeWidth={2.5}
                    />
                )}
            </div>
            <p className="mt-0.5 text-[12.5px] text-slate-600">{subtitle}</p>
            <ul className="mt-2 space-y-1">
                {bullets.map((b) => (
                    <li
                        key={b}
                        className="text-[12px] text-slate-600 leading-relaxed flex gap-1.5"
                    >
                        <span className="text-slate-400">•</span>
                        <span>{b}</span>
                    </li>
                ))}
            </ul>
        </div>
    </button>
);

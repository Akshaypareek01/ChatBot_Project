/**
 * Persistent banner that lives at the top of the Flows page. Surfaces the
 * single most important state for this bot: how is it answering visitors
 * right now?
 *
 *   - Default AI: KB-grounded LLM replies (the platform's baseline behaviour)
 *   - Flow:        a specific published flow drives every conversation
 *
 * The banner is purely informational + a launcher into BehaviorChangeModal.
 * It never mutates state on its own — that belongs to ChatFlows.tsx so the
 * bot context can refresh in one place.
 */

import React from 'react';
import { Bot, ChevronRight, Power, Workflow } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FlowSummary } from './types';

type Props = {
    /** Current bot behaviour mode; falls back to 'default' if unknown. */
    mode: 'default' | 'flow';
    /** ID of the flow currently driving this bot (only set when mode === 'flow'). */
    activeFlowId: string | null;
    /** All flows for this bot — used to look up the active flow's name. */
    flows: FlowSummary[];
    /** Open the change-mode modal. */
    onChangeClick: () => void;
    /** Disable interactions when no bot is selected yet. */
    disabled?: boolean;
};

/**
 * Resolve the visible label + supporting copy for the current behaviour.
 * Kept pure so it can be unit-tested without rendering.
 */
const describe = (mode: Props['mode'], activeFlow: FlowSummary | null) => {
    if (mode === 'flow' && activeFlow) {
        return {
            icon: <Workflow className="w-4 h-4" strokeWidth={2} />,
            tone: 'indigo' as const,
            label: activeFlow.name || 'Untitled flow',
            tag: 'Flow',
            sub: 'Visitors get this structured experience for every message.',
        };
    }
    if (mode === 'flow') {
        return {
            icon: <Workflow className="w-4 h-4" strokeWidth={2} />,
            tone: 'amber' as const,
            label: 'Missing flow',
            tag: 'Flow',
            sub: 'Mode is set to Flow but no published flow is active. Switch back to Default AI or pick a flow.',
        };
    }
    return {
        icon: <Bot className="w-4 h-4" strokeWidth={2} />,
        tone: 'slate' as const,
        label: 'Default AI',
        tag: 'AI',
        sub: 'KB-grounded answers from your uploaded data, with no fixed flow.',
    };
};

const TONES: Record<'indigo' | 'slate' | 'amber', string> = {
    indigo: 'border-indigo-200/70 bg-gradient-to-r from-indigo-50/80 via-white to-white',
    slate: 'border-slate-200/70 bg-gradient-to-r from-slate-50 via-white to-white',
    amber: 'border-amber-200/70 bg-gradient-to-r from-amber-50/80 via-white to-white',
};

const TAG_TONES: Record<'indigo' | 'slate' | 'amber', string> = {
    indigo: 'bg-indigo-600 text-white',
    slate: 'bg-slate-900 text-white',
    amber: 'bg-amber-600 text-white',
};

export default function BehaviorBanner({
    mode,
    activeFlowId,
    flows,
    onChangeClick,
    disabled,
}: Props) {
    const activeFlow = activeFlowId
        ? flows.find((f) => f._id === activeFlowId) || null
        : null;
    const view = describe(mode, activeFlow);

    return (
        <div
            className={cn(
                'rounded-xl border px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5',
                TONES[view.tone]
            )}
            role="region"
            aria-label="Current bot behavior"
        >
            <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-white border border-slate-900/[0.06] text-slate-700 flex-shrink-0">
                    {view.icon}
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            This bot currently responds with
                        </p>
                        <span
                            className={cn(
                                'inline-flex items-center h-4 px-1.5 rounded-full text-[9.5px] font-bold uppercase tracking-[0.1em]',
                                TAG_TONES[view.tone]
                            )}
                        >
                            {view.tag}
                        </span>
                    </div>
                    <p className="mt-0.5 text-[15px] font-semibold tracking-tight text-slate-950 truncate">
                        {view.label}
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-slate-600">
                        {view.sub}
                    </p>
                </div>
            </div>

            <button
                type="button"
                onClick={onChangeClick}
                disabled={disabled}
                className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-md bg-white border border-slate-900/[0.08] text-[12.5px] font-semibold text-slate-800 hover:text-slate-950 hover:border-slate-900/20 transition-colors flex-shrink-0 disabled:opacity-50 disabled:pointer-events-none"
                aria-label="Change bot behavior"
            >
                <Power className="w-3.5 h-3.5" strokeWidth={2} />
                Change
                <ChevronRight className="w-3.5 h-3.5 -mr-0.5" strokeWidth={2} />
            </button>
        </div>
    );
}

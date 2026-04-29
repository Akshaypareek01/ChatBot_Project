/**
 * Top-level modal for editing a single node. The right form is selected by
 * `node.type`. The modal is responsible only for chrome (header, footer,
 * close button, dirty-state) \u2014 the per-type forms own their own state
 * shape and wire to `onChange(partial)`.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FlowNode } from './types';
import { getNodeSpec } from './nodeSpecs';
import { Field, TextInput, Pill } from './forms/primitives';
import MessageForm from './forms/MessageForm';
import QuestionForm from './forms/QuestionForm';
import AiForm from './forms/AiForm';
import EndForm from './forms/EndForm';
import CaptureForm from './forms/CaptureForm';
import BranchForm from './forms/BranchForm';
import SetVariableForm from './forms/SetVariableForm';
import ApiActionForm from './forms/ApiActionForm';
import HandoffForm from './forms/HandoffForm';
import CardsForm from './forms/CardsForm';
import DelayForm from './forms/DelayForm';
import JumpForm from './forms/JumpForm';
import TriggerForm from './forms/TriggerForm';
import type { FormCtx } from './forms/types';

type Props = {
    open: boolean;
    onClose: () => void;
    node: FlowNode | null;
    onSave: (next: FlowNode) => void;
    /** Other nodes in the flow (for next-node pickers). */
    nodes: FlowNode[];
    /** Variable names known in the flow. */
    variables: string[];
    /** Whether this node is the start node \u2014 affects header chip + delete button. */
    isStart?: boolean;
};

/**
 * Pick the per-type form. We render `null` if the type isn\u2019t recognized so
 * the modal degrades gracefully on data from an older schema.
 */
const renderForm = (
    node: FlowNode,
    onChange: (updates: Partial<FlowNode>) => void,
    ctx: FormCtx
): React.ReactNode => {
    switch (node.type) {
        case 'message':
            return <MessageForm node={node} onChange={onChange as any} ctx={ctx} />;
        case 'question':
            return <QuestionForm node={node} onChange={onChange as any} ctx={ctx} />;
        case 'ai':
            return <AiForm node={node} onChange={onChange as any} ctx={ctx} />;
        case 'end':
            return <EndForm node={node} onChange={onChange as any} ctx={ctx} />;
        case 'capture':
            return <CaptureForm node={node} onChange={onChange as any} ctx={ctx} />;
        case 'branch':
            return <BranchForm node={node} onChange={onChange as any} ctx={ctx} />;
        case 'set_variable':
            return <SetVariableForm node={node} onChange={onChange as any} ctx={ctx} />;
        case 'action_api':
            return <ApiActionForm node={node} onChange={onChange as any} ctx={ctx} />;
        case 'action_handoff':
            return <HandoffForm node={node} onChange={onChange as any} ctx={ctx} />;
        case 'cards':
            return <CardsForm node={node} onChange={onChange as any} ctx={ctx} />;
        case 'delay':
            return <DelayForm node={node} onChange={onChange as any} ctx={ctx} />;
        case 'jump':
            return <JumpForm node={node} onChange={onChange as any} ctx={ctx} />;
        case 'trigger':
            return <TriggerForm node={node} onChange={onChange as any} ctx={ctx} />;
        default:
            return (
                <p className="text-[12.5px] text-slate-500">
                    Unknown node type. Please update your client.
                </p>
            );
    }
};

export default function NodeConfigModal({
    open,
    onClose,
    node,
    onSave,
    nodes,
    variables,
    isStart,
}: Props) {
    const [draft, setDraft] = useState<FlowNode | null>(node);
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        setDraft(node);
        setDirty(false);
    }, [node?.id]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, dirty]);

    const ctx: FormCtx = useMemo(
        () => ({ nodes, variables }),
        [nodes, variables]
    );

    if (!open || !draft) return null;

    const spec = getNodeSpec(draft.type);
    const Icon = spec.icon;

    const patch = (updates: Partial<FlowNode>) => {
        setDraft((d) => (d ? ({ ...d, ...updates } as FlowNode) : d));
        setDirty(true);
    };

    const handleSave = () => {
        if (!draft) return;
        onSave(draft);
        onClose();
    };

    const handleClose = () => {
        if (
            dirty &&
            !window.confirm('You have unsaved changes. Discard them?')
        )
            return;
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-[60] flex items-stretch sm:items-center justify-end sm:justify-center"
            role="dialog"
            aria-modal="true"
        >
            <div
                className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
                onClick={handleClose}
            />

            <div className="relative w-full sm:max-w-[640px] sm:max-h-[88vh] bg-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.4)] sm:rounded-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-900/[0.06] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div
                            className={cn(
                                'w-9 h-9 rounded-lg flex items-center justify-center',
                                spec.iconBg,
                                spec.iconColor
                            )}
                        >
                            <Icon className="w-4 h-4" strokeWidth={2} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                    {spec.label}
                                </span>
                                {isStart && (
                                    <Pill tone="emerald">Start</Pill>
                                )}
                                {dirty && (
                                    <span className="text-[10.5px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-semibold uppercase tracking-[0.1em]">
                                        Unsaved
                                    </span>
                                )}
                            </div>
                            <p className="text-[11.5px] text-slate-500 truncate">
                                {spec.description}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="w-8 h-8 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-900/[0.04] transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto px-5 py-5 space-y-5">
                    <Field
                        label="Node title"
                        hint="Internal name shown on the canvas card. Visitors never see it."
                    >
                        <TextInput
                            value={draft.title || ''}
                            onChange={(e) => patch({ title: e.target.value })}
                            placeholder="e.g. Welcome message"
                        />
                    </Field>

                    {renderForm(draft, patch as any, ctx)}
                </div>

                {/* Footer */}
                <div className="px-5 py-3.5 border-t border-slate-900/[0.06] flex items-center justify-between gap-3 bg-slate-50/50">
                    <p className="text-[11px] text-slate-500 font-mono truncate">
                        id: {draft.id}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="inline-flex items-center h-9 px-3.5 rounded-md bg-white border border-slate-900/[0.08] text-[12.5px] font-semibold text-slate-700 hover:text-slate-950 hover:border-slate-900/20 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={!dirty}
                            className="inline-flex items-center h-9 px-4 rounded-md bg-slate-950 text-white text-[12.5px] font-semibold hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            Save changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

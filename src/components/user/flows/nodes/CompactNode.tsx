/**
 * Compact card rendered for each node on the canvas. Shows only the
 * essentials (icon + label chip + title + one-line summary) so authors can
 * scan a 50-node flow at a glance. Double-click opens NodeConfigModal for
 * full editing. Connection handles live on the card so React Flow can wire
 * sources / targets the same way as the legacy node.
 */

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FlowNode } from '../types';
import { getNodeSpec } from '../nodeSpecs';

export type CompactNodeData = {
    node: FlowNode;
    isStart: boolean;
    onOpen: (id: string) => void;
    onDelete: (id: string) => void;
};

export const COMPACT_NODE_TYPE_KEY = 'compactNode';

const handleClass =
    '!w-2.5 !h-2.5 !bg-white !border-2 !border-slate-400 hover:!border-indigo-500 transition-colors';

const CompactNode: React.FC<{ data: CompactNodeData; id: string; selected?: boolean }> = ({
    data,
    id,
    selected,
}) => {
    const { node, isStart, onOpen, onDelete } = data;
    const spec = getNodeSpec(node.type);
    const Icon = spec.icon;
    const summary = spec.summary(node);

    const titleClass =
        'text-[12.5px] font-semibold tracking-tight text-slate-950 truncate';
    const summaryClass = 'text-[11.5px] text-slate-500 truncate leading-snug';

    /**
     * Question nodes still surface per-option source handles so authors can
     * draw quick-reply edges from each option directly.
     */
    const questionOptions =
        node.type === 'question' ? (node as any).options || [] : null;

    /** Branch nodes show a fallback handle plus one per condition. */
    const branchConditions =
        node.type === 'branch' ? (node as any).branch?.conditions || [] : null;

    /** API actions get success / error source handles. */
    const isApi = node.type === 'action_api';

    return (
        <div className="relative w-[260px] group/node">
            <Handle
                type="target"
                position={Position.Left}
                className={handleClass}
            />

            <div
                onDoubleClick={() => onOpen(id)}
                className={cn(
                    'relative rounded-xl bg-white border border-slate-900/[0.08] shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)] overflow-hidden cursor-pointer transition-all',
                    selected
                        ? 'border-indigo-500/60 shadow-[0_12px_32px_-12px_rgba(79,70,229,0.4)]'
                        : 'hover:border-slate-900/16'
                )}
            >
                <div
                    className={cn('absolute left-0 top-0 bottom-0 w-[3px]', spec.stripe)}
                />

                <div className="flex items-center gap-2 pl-4 pr-2 py-2.5">
                    <div
                        className={cn(
                            'w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0',
                            spec.iconBg,
                            spec.iconColor
                        )}
                    >
                        <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                            <p className={titleClass}>
                                {node.title || spec.label}
                            </p>
                            {isStart && (
                                <span className="inline-flex items-center h-4 px-1.5 rounded-full bg-emerald-50 text-emerald-700 text-[9.5px] font-semibold uppercase tracking-[0.1em] flex-shrink-0">
                                    Start
                                </span>
                            )}
                        </div>
                        <p className={summaryClass}>{summary}</p>
                    </div>

                    <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover/node:opacity-100 transition-opacity">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpen(id);
                            }}
                            className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-950 hover:bg-slate-900/[0.04] transition-colors"
                            aria-label="Edit node"
                        >
                            <Pencil className="w-3 h-3" strokeWidth={2} />
                        </button>
                        {!isStart && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(id);
                                }}
                                className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                aria-label="Delete node"
                            >
                                <Trash2 className="w-3 h-3" strokeWidth={2} />
                            </button>
                        )}
                        <GripVertical
                            className="w-3 h-3 text-slate-300 cursor-grab"
                            strokeWidth={2}
                        />
                    </div>
                </div>

                {/* Per-option fan-out for Question nodes */}
                {questionOptions && questionOptions.length > 0 && (
                    <div className="border-t border-slate-900/[0.06] divide-y divide-slate-900/[0.04]">
                        {questionOptions.map((opt: any) => (
                            <div
                                key={opt.id}
                                className="relative flex items-center justify-between gap-2 pl-4 pr-3 py-1.5 text-[11.5px] text-slate-600"
                            >
                                <span className="truncate">{opt.label}</span>
                                <Handle
                                    type="source"
                                    position={Position.Right}
                                    id={opt.id}
                                    style={{ top: '50%', right: -8 }}
                                    className={handleClass}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* Branch: per-condition + fallback handles */}
                {branchConditions && branchConditions.length > 0 && (
                    <div className="border-t border-slate-900/[0.06] divide-y divide-slate-900/[0.04]">
                        {branchConditions.map((c: any, i: number) => (
                            <div
                                key={i}
                                className="relative flex items-center justify-between gap-2 pl-4 pr-3 py-1.5 text-[11px] font-mono text-slate-600"
                            >
                                <span className="truncate">
                                    {c.variable || '?'} {c.op} {c.value || ''}
                                </span>
                                <Handle
                                    type="source"
                                    position={Position.Right}
                                    id={`cond-${i}`}
                                    style={{ top: '50%', right: -8 }}
                                    className={handleClass}
                                />
                            </div>
                        ))}
                        <div className="relative flex items-center justify-between gap-2 pl-4 pr-3 py-1.5 text-[11px] text-slate-500">
                            <span>fallback</span>
                            <Handle
                                type="source"
                                position={Position.Right}
                                id="fallback"
                                style={{ top: '50%', right: -8 }}
                                className={handleClass}
                            />
                        </div>
                    </div>
                )}

                {/* API action: success / error handles */}
                {isApi && (
                    <div className="border-t border-slate-900/[0.06] divide-y divide-slate-900/[0.04]">
                        {[
                            { id: 'success', label: 'on success', tone: 'text-emerald-600' },
                            { id: 'error', label: 'on error', tone: 'text-rose-600' },
                        ].map((row) => (
                            <div
                                key={row.id}
                                className="relative flex items-center justify-between gap-2 pl-4 pr-3 py-1.5 text-[11.5px]"
                            >
                                <span className={cn('truncate', row.tone)}>
                                    {row.label}
                                </span>
                                <Handle
                                    type="source"
                                    position={Position.Right}
                                    id={row.id}
                                    style={{ top: '50%', right: -8 }}
                                    className={handleClass}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Single source for "linear" node types */}
            {!questionOptions && !branchConditions && !isApi && node.type !== 'end' && (
                <Handle
                    type="source"
                    position={Position.Right}
                    className={handleClass}
                />
            )}
        </div>
    );
};

export default CompactNode;

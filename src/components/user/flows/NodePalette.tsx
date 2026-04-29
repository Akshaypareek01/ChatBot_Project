/**
 * Drag-source palette grouped by category. Items can be either dragged onto
 * the canvas (HTML5 drag-and-drop \u2014 React Flow listens for the matching
 * drop) or clicked to insert at a default position. This is the primary
 * place authors discover what the builder can do.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import type { FlowNodeType } from './types';
import { PALETTE_GROUPS, type NodeSpec } from './nodeSpecs';

export const PALETTE_DRAG_MIME = 'application/x-flow-node-type';

type Props = {
    onAddNode: (type: FlowNodeType) => void;
    className?: string;
};

const onDragStart =
    (type: FlowNodeType) => (e: React.DragEvent<HTMLButtonElement>) => {
        e.dataTransfer.setData(PALETTE_DRAG_MIME, type);
        e.dataTransfer.effectAllowed = 'move';
    };

export default function NodePalette({ onAddNode, className }: Props) {
    return (
        <aside
            className={cn(
                'w-[260px] shrink-0 border-r border-slate-900/[0.06] bg-white overflow-y-auto',
                className
            )}
        >
            <div className="px-4 py-3 border-b border-slate-900/[0.06] sticky top-0 bg-white/95 backdrop-blur z-10">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-indigo-600">
                    Node library
                </p>
                <p className="text-[12px] text-slate-500 mt-0.5">
                    Drag onto the canvas or click to insert.
                </p>
            </div>

            <div className="p-3 space-y-4">
                {PALETTE_GROUPS.map((group) => (
                    <div key={group.category}>
                        <div className="px-1 mb-1.5">
                            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                {group.label}
                            </p>
                        </div>
                        <div className="space-y-1">
                            {group.items.map((spec) => (
                                <PaletteButton
                                    key={spec.type}
                                    spec={spec}
                                    onClick={() => onAddNode(spec.type)}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </aside>
    );
}

const PaletteButton: React.FC<{
    spec: NodeSpec;
    onClick: () => void;
}> = ({ spec, onClick }) => {
    const Icon = spec.icon;
    return (
        <button
            type="button"
            draggable
            onDragStart={onDragStart(spec.type)}
            onClick={onClick}
            className="group/pal w-full flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-900/[0.03] active:bg-slate-900/[0.06] text-left transition-colors"
        >
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
                <p className="text-[12.5px] font-semibold tracking-tight text-slate-900 group-hover/pal:text-slate-950">
                    {spec.label}
                </p>
                <p className="text-[11px] text-slate-500 leading-snug">
                    {spec.description}
                </p>
            </div>
        </button>
    );
};

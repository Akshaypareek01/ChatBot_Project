import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Field, TextArea, TextInput, SmallButton, Divider } from './primitives';
import NodeRefPicker from './pickers/NodeRefPicker';
import type { FlowOption, QuestionNode } from '../types';
import type { NodeFormProps } from './types';

/**
 * Question node \u2014 ask the visitor and offer quick-reply buttons that route
 * to different next nodes. Falls back to `fallbackNextNodeId` when the user
 * types a free-form reply that doesn\u2019t match a button.
 */
export default function QuestionForm({
    node,
    onChange,
    ctx,
}: NodeFormProps<QuestionNode>) {
    const options = node.options || [];

    const update = (id: string, patch: Partial<FlowOption>) => {
        onChange({
            options: options.map((o) =>
                o.id === id ? { ...o, ...patch } : o
            ),
        } as any);
    };

    const remove = (id: string) => {
        onChange({ options: options.filter((o) => o.id !== id) } as any);
    };

    const add = () => {
        const next: FlowOption = {
            id: `opt-${Math.random().toString(36).slice(2, 9)}`,
            label: 'New option',
            nextNodeId: '',
        };
        onChange({ options: [...options, next] } as any);
    };

    return (
        <div className="space-y-5">
            <Field label="Question text">
                <TextArea
                    rows={3}
                    value={node.text || ''}
                    onChange={(e) => onChange({ text: e.target.value } as any)}
                    placeholder="What would you like to ask?"
                />
            </Field>

            <Divider>Quick replies</Divider>

            <div className="space-y-2.5">
                {options.length === 0 && (
                    <p className="text-[12px] text-slate-500 italic">
                        Add at least one option, otherwise the visitor has
                        nothing to click.
                    </p>
                )}
                {options.map((opt, i) => (
                    <div
                        key={opt.id}
                        className="rounded-lg border border-slate-900/[0.06] bg-slate-50/50 p-3 space-y-2"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Option {i + 1}
                            </span>
                            <SmallButton
                                tone="danger"
                                onClick={() => remove(opt.id)}
                            >
                                <Trash2 className="w-3 h-3" /> Remove
                            </SmallButton>
                        </div>
                        <TextInput
                            value={opt.label}
                            onChange={(e) =>
                                update(opt.id, { label: e.target.value })
                            }
                            placeholder="Button label"
                        />
                        <NodeRefPicker
                            value={opt.nextNodeId || ''}
                            onChange={(id) => update(opt.id, { nextNodeId: id })}
                            nodes={ctx.nodes}
                            excludeId={node.id}
                            placeholder="\u279c next node\u2026"
                        />
                    </div>
                ))}

                <button
                    type="button"
                    onClick={add}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-dashed border-slate-900/20 text-[12px] font-medium text-slate-600 hover:text-slate-950 hover:border-slate-900/40 transition-colors"
                >
                    <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                    Add quick reply
                </button>
            </div>

            <Divider>Fallback</Divider>

            <Field
                label="Fallback next node"
                hint="Used when the visitor types instead of clicking a quick reply."
            >
                <NodeRefPicker
                    value={node.fallbackNextNodeId}
                    onChange={(id) =>
                        onChange({ fallbackNextNodeId: id } as any)
                    }
                    nodes={ctx.nodes}
                    excludeId={node.id}
                />
            </Field>
        </div>
    );
}

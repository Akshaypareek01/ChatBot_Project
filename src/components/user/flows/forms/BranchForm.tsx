import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Field, TextInput, Select, SmallButton, Divider } from './primitives';
import VariablePicker from './pickers/VariablePicker';
import NodeRefPicker from './pickers/NodeRefPicker';
import type { BranchCondition, BranchNode } from '../types';
import type { NodeFormProps } from './types';

const OPS: Array<{ value: BranchCondition['op']; label: string }> = [
    { value: 'eq', label: '== equals' },
    { value: 'neq', label: '!= not equal' },
    { value: 'gt', label: '> greater than' },
    { value: 'lt', label: '< less than' },
    { value: 'contains', label: 'contains' },
    { value: 'exists', label: 'exists' },
    { value: 'regex', label: 'regex' },
];

/**
 * Branch node \u2014 evaluate variables top-to-bottom, route to the first
 * matching condition\u2019s next node, or to the fallback if nothing matches.
 */
export default function BranchForm({
    node,
    onChange,
    ctx,
}: NodeFormProps<BranchNode>) {
    const conditions = node.branch?.conditions || [];
    const fallback = node.branch?.fallbackNextNodeId || '';

    const patchConditions = (next: BranchCondition[]) =>
        onChange({
            branch: { ...(node.branch || {}), conditions: next },
        } as any);

    const update = (i: number, patch: Partial<BranchCondition>) =>
        patchConditions(
            conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c))
        );

    const remove = (i: number) =>
        patchConditions(conditions.filter((_, idx) => idx !== i));

    const add = () =>
        patchConditions([
            ...conditions,
            { variable: '', op: 'eq', value: '', nextNodeId: '' },
        ]);

    return (
        <div className="space-y-5">
            <p className="text-[12px] text-slate-500 leading-relaxed">
                Conditions are evaluated top to bottom. The first match wins.
                Use the fallback for everything else.
            </p>

            <div className="space-y-3">
                {conditions.length === 0 && (
                    <p className="text-[12px] text-slate-500 italic">
                        No conditions yet. Add one to start branching.
                    </p>
                )}
                {conditions.map((c, i) => (
                    <div
                        key={i}
                        className="rounded-lg border border-slate-900/[0.06] bg-slate-50/50 p-3 space-y-2.5"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Rule {i + 1}
                            </span>
                            <SmallButton tone="danger" onClick={() => remove(i)}>
                                <Trash2 className="w-3 h-3" /> Remove
                            </SmallButton>
                        </div>

                        <div className="grid grid-cols-[1fr_120px] gap-2">
                            <Field label="Variable">
                                <VariablePicker
                                    value={c.variable}
                                    onChange={(v) => update(i, { variable: v })}
                                    variables={ctx.variables}
                                    interpolate={false}
                                    placeholder="e.g. order_status"
                                />
                            </Field>
                            <Field label="Operator">
                                <Select
                                    value={c.op}
                                    onChange={(e) =>
                                        update(i, { op: e.target.value as any })
                                    }
                                >
                                    {OPS.map((o) => (
                                        <option key={o.value} value={o.value}>
                                            {o.label}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                        </div>

                        {c.op !== 'exists' && (
                            <Field label="Value">
                                <TextInput
                                    value={c.value}
                                    onChange={(e) =>
                                        update(i, { value: e.target.value })
                                    }
                                    placeholder={
                                        c.op === 'regex'
                                            ? '^delivered$'
                                            : 'value to compare'
                                    }
                                />
                            </Field>
                        )}

                        <Field label="\u2192 Go to">
                            <NodeRefPicker
                                value={c.nextNodeId}
                                onChange={(id) =>
                                    update(i, { nextNodeId: id })
                                }
                                nodes={ctx.nodes}
                                excludeId={node.id}
                            />
                        </Field>
                    </div>
                ))}

                <button
                    type="button"
                    onClick={add}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-dashed border-slate-900/20 text-[12px] font-medium text-slate-600 hover:text-slate-950 hover:border-slate-900/40 transition-colors"
                >
                    <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                    Add condition
                </button>
            </div>

            <Divider>Fallback</Divider>

            <Field
                label="If nothing matches, go to"
                hint="Required \u2014 a flow with no fallback can dead-end."
            >
                <NodeRefPicker
                    value={fallback}
                    onChange={(id) =>
                        onChange({
                            branch: {
                                ...(node.branch || { conditions: [] }),
                                fallbackNextNodeId: id,
                            },
                        } as any)
                    }
                    nodes={ctx.nodes}
                    excludeId={node.id}
                />
            </Field>
        </div>
    );
}

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Field, TextInput, Select, SmallButton } from './primitives';
import NodeRefPicker from './pickers/NodeRefPicker';
import type { TriggerNode } from '../types';
import type { NodeFormProps } from './types';

/**
 * Trigger node \u2014 declarative entrypoint. The runtime can match the visitor\u2019s
 * first message against keywords or an intent label and dispatch into this
 * sub-flow. Used by the multi-flow router (Phase 5).
 */
export default function TriggerForm({
    node,
    onChange,
    ctx,
}: NodeFormProps<TriggerNode>) {
    const t = node.trigger!;
    const patch = (updates: Partial<typeof t>) =>
        onChange({ trigger: { ...t, ...updates } } as any);

    const keywords = t.keywords || [];

    return (
        <div className="space-y-5">
            <Field label="Match type">
                <Select
                    value={t.matchType}
                    onChange={(e) =>
                        patch({ matchType: e.target.value as any })
                    }
                >
                    <option value="firstMessage">First message</option>
                    <option value="keyword">Keyword(s)</option>
                    <option value="intent">Intent label</option>
                </Select>
            </Field>

            {t.matchType === 'keyword' && (
                <div className="space-y-2">
                    <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Keywords
                    </span>
                    {keywords.map((kw, i) => (
                        <div
                            key={i}
                            className="grid grid-cols-[1fr_auto] gap-2 items-center"
                        >
                            <TextInput
                                value={kw}
                                onChange={(e) =>
                                    patch({
                                        keywords: keywords.map((k, idx) =>
                                            idx === i ? e.target.value : k
                                        ),
                                    })
                                }
                                placeholder="e.g. refund"
                            />
                            <SmallButton
                                tone="danger"
                                onClick={() =>
                                    patch({
                                        keywords: keywords.filter(
                                            (_, idx) => idx !== i
                                        ),
                                    })
                                }
                            >
                                <Trash2 className="w-3 h-3" />
                            </SmallButton>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={() => patch({ keywords: [...keywords, ''] })}
                        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-dashed border-slate-900/20 text-[11.5px] font-medium text-slate-600 hover:text-slate-950 hover:border-slate-900/40 transition-colors"
                    >
                        <Plus className="w-3 h-3" /> Add keyword
                    </button>
                </div>
            )}

            {t.matchType === 'intent' && (
                <Field label="Intent label">
                    <TextInput
                        value={t.intent || ''}
                        onChange={(e) => patch({ intent: e.target.value })}
                        placeholder="e.g. refund_request"
                    />
                </Field>
            )}

            <Field label="On match \u2014 next node">
                <NodeRefPicker
                    value={t.nextNodeId}
                    onChange={(id) => patch({ nextNodeId: id })}
                    nodes={ctx.nodes}
                    excludeId={node.id}
                />
            </Field>
        </div>
    );
}

import React from 'react';
import { Field, TextInput } from './primitives';
import NodeRefPicker from './pickers/NodeRefPicker';
import type { DelayNode } from '../types';
import type { NodeFormProps } from './types';

/**
 * Delay node \u2014 emits a typing indicator for `ms` then advances. Use
 * sparingly to avoid feeling sluggish.
 */
export default function DelayForm({
    node,
    onChange,
    ctx,
}: NodeFormProps<DelayNode>) {
    const d = node.delay!;
    const patch = (updates: Partial<typeof d>) =>
        onChange({ delay: { ...d, ...updates } } as any);

    return (
        <div className="space-y-5">
            <Field
                label="Pause duration (ms)"
                hint="Recommended 400\u20131500 ms. Anything over 3 s feels broken."
            >
                <TextInput
                    type="number"
                    min={0}
                    max={10000}
                    step={100}
                    value={d.ms ?? 0}
                    onChange={(e) =>
                        patch({
                            ms: Math.max(
                                0,
                                Math.min(10000, parseInt(e.target.value, 10) || 0)
                            ),
                        })
                    }
                />
            </Field>

            <Field label="Show typing indicator">
                <label className="inline-flex items-center gap-2 text-[13px] text-slate-700 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={!!d.typingIndicator}
                        onChange={(e) =>
                            patch({ typingIndicator: e.target.checked })
                        }
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Make it look like the bot is typing
                </label>
            </Field>

            <Field label="Next node">
                <NodeRefPicker
                    value={d.nextNodeId}
                    onChange={(id) => patch({ nextNodeId: id })}
                    nodes={ctx.nodes}
                    excludeId={node.id}
                />
            </Field>
        </div>
    );
}

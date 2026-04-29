import React from 'react';
import { Field, TextArea, TextInput, Select, Divider } from './primitives';
import NodeRefPicker from './pickers/NodeRefPicker';
import type { CaptureNode } from '../types';
import type { NodeFormProps } from './types';

const INPUT_TYPES: Array<{ value: NonNullable<CaptureNode['capture']>['inputType']; label: string }> = [
    { value: 'text', label: 'Free text' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone number' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
    { value: 'url', label: 'URL' },
];

/**
 * Capture node \u2014 wait for the next visitor message and store it in a
 * variable. Validates with a built-in type plus an optional regex.
 */
export default function CaptureForm({
    node,
    onChange,
    ctx,
}: NodeFormProps<CaptureNode>) {
    const c = node.capture!;

    const patch = (updates: Partial<typeof c>) =>
        onChange({ capture: { ...c, ...updates } } as any);

    return (
        <div className="space-y-5">
            <Field
                label="Prompt the bot will say"
                hint="Shown right before we start listening for the visitor reply."
            >
                <TextArea
                    rows={3}
                    value={node.text || ''}
                    onChange={(e) => onChange({ text: e.target.value } as any)}
                    placeholder="e.g. What\u2019s your work email?"
                />
            </Field>

            <div className="grid grid-cols-2 gap-3">
                <Field
                    label="Save into variable"
                    hint="Use this name later as {{vars.name}}."
                >
                    <TextInput
                        value={c.variable}
                        onChange={(e) => patch({ variable: e.target.value })}
                        placeholder="e.g. work_email"
                    />
                </Field>

                <Field label="Input type">
                    <Select
                        value={c.inputType}
                        onChange={(e) =>
                            patch({ inputType: e.target.value as any })
                        }
                    >
                        {INPUT_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                                {t.label}
                            </option>
                        ))}
                    </Select>
                </Field>
            </div>

            <Divider>Validation (optional)</Divider>

            <Field
                label="Custom regex"
                hint="Stricter than the input type. Anchor with ^ and $ for full-string matches."
            >
                <TextInput
                    value={c.validation?.regex || ''}
                    onChange={(e) =>
                        patch({
                            validation: {
                                ...(c.validation || {}),
                                regex: e.target.value,
                            },
                        })
                    }
                    placeholder="^\\d{4}-\\d{4}-\\d{4}-\\d{4}$"
                />
            </Field>

            <Field label="Error message on failed validation">
                <TextInput
                    value={c.validation?.errorMessage || ''}
                    onChange={(e) =>
                        patch({
                            validation: {
                                ...(c.validation || {}),
                                errorMessage: e.target.value,
                            },
                        })
                    }
                    placeholder="e.g. That doesn\u2019t look right \u2014 mind retyping?"
                />
            </Field>

            <div className="grid grid-cols-2 gap-3">
                <Field label="Retry count">
                    <TextInput
                        type="number"
                        min={0}
                        max={5}
                        value={c.retryCount ?? 0}
                        onChange={(e) =>
                            patch({
                                retryCount: Math.max(
                                    0,
                                    parseInt(e.target.value, 10) || 0
                                ),
                            })
                        }
                    />
                </Field>
                <Field label="Retry message">
                    <TextInput
                        value={c.retryMessage || ''}
                        onChange={(e) =>
                            patch({ retryMessage: e.target.value })
                        }
                        placeholder="One more try?"
                    />
                </Field>
            </div>

            <Divider>Routing</Divider>

            <Field
                label="On valid input \u2014 next node"
                hint="If empty, the conversation pauses for the next visitor turn."
            >
                <NodeRefPicker
                    value={c.nextNodeId}
                    onChange={(id) => patch({ nextNodeId: id })}
                    nodes={ctx.nodes}
                    excludeId={node.id}
                />
            </Field>

            <Field
                label="After all retries fail \u2014 next node"
                hint="A graceful fallback so the visitor never dead-ends."
            >
                <NodeRefPicker
                    value={c.fallbackNextNodeId}
                    onChange={(id) => patch({ fallbackNextNodeId: id })}
                    nodes={ctx.nodes}
                    excludeId={node.id}
                />
            </Field>
        </div>
    );
}

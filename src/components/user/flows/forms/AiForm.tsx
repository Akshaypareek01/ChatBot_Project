import React from 'react';
import { Field, TextArea } from './primitives';
import NodeRefPicker from './pickers/NodeRefPicker';
import type { AiNode } from '../types';
import type { NodeFormProps } from './types';

/**
 * AI node \u2014 hands the conversation to the configured LLM with optional
 * authoring instructions injected into the system prompt.
 */
export default function AiForm({ node, onChange, ctx }: NodeFormProps<AiNode>) {
    return (
        <div className="space-y-5">
            <Field
                label="Instructions for the AI"
                hint="Concrete guidance: tone, what to avoid, when to escalate. Leave blank to use the bot\u2019s default behavior."
            >
                <TextArea
                    rows={6}
                    value={node.aiInstructions || ''}
                    onChange={(e) =>
                        onChange({ aiInstructions: e.target.value } as any)
                    }
                    placeholder="e.g. Answer based on the knowledge base. If unsure, suggest talking to a human."
                />
            </Field>

            <Field
                label="Pre-AI message (optional)"
                hint="Shown to the visitor immediately before the AI reply lands. Useful for setting expectations."
            >
                <TextArea
                    rows={3}
                    value={node.text || ''}
                    onChange={(e) => onChange({ text: e.target.value } as any)}
                    placeholder="e.g. Let me check that for you\u2026"
                />
            </Field>

            <Field
                label="After AI reply, go to"
                hint="Optional. By default the conversation pauses for the next visitor message."
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

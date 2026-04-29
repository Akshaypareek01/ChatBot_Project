import React from 'react';
import { Field, TextInput, TextArea } from './primitives';
import NodeRefPicker from './pickers/NodeRefPicker';
import type { HandoffNode } from '../types';
import type { NodeFormProps } from './types';

/**
 * Handoff node \u2014 escalates the conversation to a live agent on the named
 * team. The chatbotController flips Conversation.status to "escalated" and
 * notifies the agent room over Socket.IO.
 */
export default function HandoffForm({
    node,
    onChange,
    ctx,
}: NodeFormProps<HandoffNode>) {
    const h = node.handoff!;
    const patch = (updates: Partial<typeof h>) =>
        onChange({ handoff: { ...h, ...updates } } as any);

    return (
        <div className="space-y-5">
            <Field
                label="Team to route to"
                hint="Free-text team name; agents subscribe to the matching room (e.g. support, sales, billing)."
            >
                <TextInput
                    value={h.team}
                    onChange={(e) => patch({ team: e.target.value })}
                    placeholder="support"
                />
            </Field>

            <Field
                label="Message shown while we connect"
                hint="A short, calming line so the visitor doesn\u2019t think the bot froze."
            >
                <TextArea
                    rows={3}
                    value={h.message || ''}
                    onChange={(e) => patch({ message: e.target.value })}
                    placeholder="Connecting you with a human agent now\u2026"
                />
            </Field>

            <Field
                label="No agent available \u2014 fall back to"
                hint="Optional. Lets you offer to leave a message instead of dead-ending."
            >
                <NodeRefPicker
                    value={h.fallbackNextNodeId}
                    onChange={(id) => patch({ fallbackNextNodeId: id })}
                    nodes={ctx.nodes}
                    excludeId={node.id}
                />
            </Field>
        </div>
    );
}

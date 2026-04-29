import React from 'react';
import { Field, TextArea } from './primitives';
import NodeRefPicker from './pickers/NodeRefPicker';
import type { MessageNode } from '../types';
import type { NodeFormProps } from './types';

/**
 * Configures a Message node \u2014 the bot says something and (optionally) jumps
 * to a single next node. Variables in the body are interpolated server-side.
 */
export default function MessageForm({
    node,
    onChange,
    ctx,
}: NodeFormProps<MessageNode>) {
    return (
        <div className="space-y-5">
            <Field
                label="Message text"
                hint={
                    <>
                        Use <code>{'{{vars.name}}'}</code> to interpolate
                        variables, <code>{'{{user.email}}'}</code> for visitor
                        traits, or <code>{'{{system.now}}'}</code> for runtime
                        info.
                    </>
                }
            >
                <TextArea
                    rows={5}
                    value={node.text || ''}
                    onChange={(e) => onChange({ text: e.target.value } as any)}
                    placeholder="What should the bot say here?"
                />
            </Field>

            <Field
                label="Next node"
                hint="Optional. If unset, the conversation pauses for visitor input."
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

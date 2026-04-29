import React from 'react';
import { Field } from './primitives';
import NodeRefPicker from './pickers/NodeRefPicker';
import type { JumpNode } from '../types';
import type { NodeFormProps } from './types';

/**
 * Jump node \u2014 unconditionally hops to another node. Useful for shared
 * sub-flows so multiple branches can converge.
 */
export default function JumpForm({
    node,
    onChange,
    ctx,
}: NodeFormProps<JumpNode>) {
    const j = node.jump!;
    return (
        <div className="space-y-5">
            <Field
                label="Jump to node"
                hint="Required \u2014 the runtime errors out if there\u2019s no target."
            >
                <NodeRefPicker
                    value={j.nextNodeId}
                    onChange={(id) =>
                        onChange({
                            jump: { ...(node.jump || { nextNodeId: '' }), nextNodeId: id },
                        } as any)
                    }
                    nodes={ctx.nodes}
                    excludeId={node.id}
                    allowEmpty={false}
                />
            </Field>
        </div>
    );
}

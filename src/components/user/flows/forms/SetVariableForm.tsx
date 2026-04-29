import React from 'react';
import { Field, TextInput } from './primitives';
import VariablePicker from './pickers/VariablePicker';
import NodeRefPicker from './pickers/NodeRefPicker';
import type { SetVariableNode } from '../types';
import type { NodeFormProps } from './types';

/**
 * Set-variable node \u2014 assigns or computes a variable inline. The right-hand
 * value is interpolated server-side, so {{vars.x}} / {{system.now}} all work.
 */
export default function SetVariableForm({
    node,
    onChange,
    ctx,
}: NodeFormProps<SetVariableNode>) {
    const sv = node.setVariable!;
    const patch = (updates: Partial<typeof sv>) =>
        onChange({ setVariable: { ...sv, ...updates } } as any);

    return (
        <div className="space-y-5">
            <Field label="Variable name">
                <TextInput
                    value={sv.variable}
                    onChange={(e) => patch({ variable: e.target.value })}
                    placeholder="e.g. greeting"
                />
            </Field>

            <Field
                label="Value"
                hint="Plain text or templated. e.g. \u201cHello {{user.firstName}}\u201d."
            >
                <VariablePicker
                    value={sv.value}
                    onChange={(v) => patch({ value: v })}
                    variables={ctx.variables}
                    placeholder="static text or {{vars.x}}"
                />
            </Field>

            <Field label="Next node">
                <NodeRefPicker
                    value={sv.nextNodeId}
                    onChange={(id) => patch({ nextNodeId: id })}
                    nodes={ctx.nodes}
                    excludeId={node.id}
                />
            </Field>
        </div>
    );
}

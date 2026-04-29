import React from 'react';
import { Field, TextArea } from './primitives';
import type { EndNode } from '../types';
import type { NodeFormProps } from './types';

/**
 * End node \u2014 sends a final message and tears down the flow state machine.
 */
export default function EndForm({ node, onChange }: NodeFormProps<EndNode>) {
    return (
        <div className="space-y-5">
            <Field
                label="Closing message"
                hint="Optional. Leave blank to end silently."
            >
                <TextArea
                    rows={4}
                    value={node.text || ''}
                    onChange={(e) => onChange({ text: e.target.value } as any)}
                    placeholder="e.g. Thanks for chatting \u2014 have a great day!"
                />
            </Field>
        </div>
    );
}

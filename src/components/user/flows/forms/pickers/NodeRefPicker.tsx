/**
 * Pick another node in the same flow as a "next step" target. Renders a
 * compact dropdown with the node\u2019s spec icon, label, and current title so
 * authors can navigate the graph by name instead of memorizing ids.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import type { FlowNode } from '../../types';
import { getNodeSpec } from '../../nodeSpecs';
import { Select } from '../primitives';

type Props = {
    value: string | null | undefined;
    onChange: (id: string) => void;
    nodes: FlowNode[];
    /** Hide the node we\u2019re currently editing. */
    excludeId?: string;
    placeholder?: string;
    className?: string;
    id?: string;
    /** Allow an empty value (to "unset" a target). */
    allowEmpty?: boolean;
};

export default function NodeRefPicker({
    value,
    onChange,
    nodes,
    excludeId,
    placeholder = 'Select a node\u2026',
    className,
    id,
    allowEmpty = true,
}: Props) {
    const filtered = nodes.filter((n) => n.id !== excludeId);

    return (
        <div className={cn('space-y-1', className)}>
            <Select
                id={id}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
            >
                {allowEmpty && <option value="">{placeholder}</option>}
                {filtered.map((n) => {
                    const spec = getNodeSpec(n.type);
                    const label = `${spec.label} \u2014 ${n.title || n.id}`;
                    return (
                        <option key={n.id} value={n.id}>
                            {label}
                        </option>
                    );
                })}
            </Select>
            {value && filtered.length > 0 && (
                <p className="text-[11px] text-slate-500 truncate">
                    Linking to <span className="font-mono">{value}</span>
                </p>
            )}
        </div>
    );
}

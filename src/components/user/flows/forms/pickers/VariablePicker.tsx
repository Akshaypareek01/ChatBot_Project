/**
 * Combo-input that lets the user type a free-form value but offers a dropdown
 * of known variable names. Inserts `{{vars.<name>}}` when an entry is picked.
 */

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Variable } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TextInput } from '../primitives';

type Props = {
    value: string;
    onChange: (next: string) => void;
    variables: string[];
    placeholder?: string;
    className?: string;
    /** When `true`, picking a variable inserts `{{vars.x}}`; otherwise the bare name is inserted. */
    interpolate?: boolean;
    id?: string;
};

/**
 * Picks (or types) a variable. We keep this dumb \u2014 it just feeds the
 * value back via `onChange`. Discovery of available variables happens at the
 * caller (ChatFlows passes `extractWrittenVariables(flow)`).
 */
export default function VariablePicker({
    value,
    onChange,
    variables,
    placeholder = 'e.g. {{vars.email}} or static value',
    className,
    interpolate = true,
    id,
}: Props) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const onClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node))
                setOpen(false);
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);

    const insert = (name: string) => {
        const token = interpolate ? `{{vars.${name}}}` : name;
        onChange(token);
        setOpen(false);
    };

    return (
        <div className={cn('relative', className)} ref={ref}>
            <div className="flex items-stretch gap-1.5">
                <TextInput
                    id={id}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                />
                <button
                    type="button"
                    onClick={() => setOpen((s) => !s)}
                    className="inline-flex items-center gap-1 h-9 px-2.5 rounded-md bg-white border border-slate-900/[0.08] text-[12px] font-medium text-slate-600 hover:text-slate-950 hover:border-slate-900/20 transition-colors flex-shrink-0"
                    aria-label="Insert variable"
                >
                    <Variable className="w-3.5 h-3.5" strokeWidth={2} />
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
            </div>

            {open && (
                <div className="absolute z-30 mt-1 w-full max-h-56 overflow-y-auto rounded-md border border-slate-900/[0.08] bg-white shadow-[0_12px_40px_-12px_rgba(15,23,42,0.2)]">
                    {variables.length === 0 ? (
                        <p className="px-3 py-3 text-[12px] text-slate-500">
                            No variables yet. Capture one or set it in a Set
                            Variable node.
                        </p>
                    ) : (
                        <ul className="py-1">
                            {variables.map((v) => (
                                <li key={v}>
                                    <button
                                        type="button"
                                        onClick={() => insert(v)}
                                        className="w-full text-left px-3 py-2 text-[12.5px] text-slate-700 hover:bg-slate-900/[0.03] hover:text-slate-950 transition-colors flex items-center justify-between gap-3"
                                    >
                                        <span className="font-mono">{v}</span>
                                        <span className="text-[10.5px] text-slate-400">
                                            {interpolate
                                                ? `{{vars.${v}}}`
                                                : v}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}

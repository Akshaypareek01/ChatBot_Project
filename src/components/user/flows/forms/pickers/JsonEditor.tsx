/**
 * Lightweight JSON editor with live syntax-error reporting. Used by API
 * Action body editor and the raw "Edit JSON" dialog. We deliberately keep
 * this dumb (no Monaco / CodeMirror) so the bundle stays small.
 */

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type Props = {
    value: string;
    onChange: (next: string) => void;
    rows?: number;
    placeholder?: string;
    className?: string;
};

export default function JsonEditor({
    value,
    onChange,
    rows = 8,
    placeholder = '{ "key": "value" }',
    className,
}: Props) {
    const [error, setError] = useState<string | null>(null);
    const tRef = useRef<HTMLTextAreaElement | null>(null);

    useEffect(() => {
        if (!value || !value.trim()) {
            setError(null);
            return;
        }
        try {
            JSON.parse(value);
            setError(null);
        } catch (e: any) {
            setError(e?.message || 'Invalid JSON');
        }
    }, [value]);

    return (
        <div className={cn('space-y-1.5', className)}>
            <textarea
                ref={tRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                rows={rows}
                spellCheck={false}
                placeholder={placeholder}
                className={cn(
                    'w-full px-3 py-2.5 rounded-md bg-[#0f172a] text-emerald-100 font-mono text-[12px] leading-relaxed border border-slate-900/[0.4] focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60 resize-y',
                    error && 'ring-1 ring-rose-500/40'
                )}
            />
            {error ? (
                <p className="text-[11.5px] text-rose-600">{error}</p>
            ) : (
                <p className="text-[11px] text-slate-500">
                    JSON. Variables like <code>{'{{vars.x}}'}</code> are
                    interpolated server-side after parsing.
                </p>
            )}
        </div>
    );
}

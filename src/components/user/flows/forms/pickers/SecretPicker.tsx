/**
 * Pick (or create) a stored Secret name. Loads /users/secrets lazily when the
 * dropdown is first opened and caches the list for the session. We never
 * fetch secret values \u2014 the runtime resolves them server-side.
 */

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ExternalLink, KeyRound, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { createSecret, listSecrets } from '@/services/api';
import type { SecretRecord } from '../../types';
import { TextInput } from '../primitives';

type Props = {
    value: string | undefined | null;
    onChange: (name: string) => void;
    placeholder?: string;
    className?: string;
    id?: string;
};

export default function SecretPicker({
    value,
    onChange,
    placeholder = 'Secret name',
    className,
    id,
}: Props) {
    const [open, setOpen] = useState(false);
    const [secrets, setSecrets] = useState<SecretRecord[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [creatingName, setCreatingName] = useState('');
    const [creatingValue, setCreatingValue] = useState('');
    const ref = useRef<HTMLDivElement | null>(null);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const r = await listSecrets();
            setSecrets(Array.isArray(r?.secrets) ? r.secrets : []);
        } catch (e: any) {
            toast.error(e?.message || 'Failed to load secrets');
            setSecrets([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open && secrets === null) fetchAll();
    }, [open, secrets]);

    useEffect(() => {
        const onClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node))
                setOpen(false);
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);

    const handleCreate = async () => {
        if (!creatingName.trim() || !creatingValue.trim()) {
            toast.error('Name and value are required');
            return;
        }
        try {
            await createSecret({
                name: creatingName.trim(),
                value: creatingValue,
            });
            toast.success(`Secret "${creatingName.trim()}" saved`);
            const name = creatingName.trim();
            setCreatingName('');
            setCreatingValue('');
            await fetchAll();
            onChange(name);
            setOpen(false);
        } catch (e: any) {
            toast.error(e?.message || 'Failed to save secret');
        }
    };

    return (
        <div className={cn('relative', className)} ref={ref}>
            <div className="flex items-stretch gap-1.5">
                <TextInput
                    id={id}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                />
                <button
                    type="button"
                    onClick={() => setOpen((s) => !s)}
                    className="inline-flex items-center gap-1 h-9 px-2.5 rounded-md bg-white border border-slate-900/[0.08] text-[12px] font-medium text-slate-600 hover:text-slate-950 hover:border-slate-900/20 transition-colors flex-shrink-0"
                    aria-label="Pick secret"
                >
                    <KeyRound className="w-3.5 h-3.5" strokeWidth={2} />
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
            </div>

            {open && (
                <div className="absolute z-30 mt-1 w-[320px] right-0 rounded-md border border-slate-900/[0.08] bg-white shadow-[0_12px_40px_-12px_rgba(15,23,42,0.2)]">
                    <div className="px-3 py-2.5 border-b border-slate-900/[0.06] flex items-center justify-between">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Stored secrets
                        </p>
                        <button
                            type="button"
                            onClick={fetchAll}
                            className="inline-flex items-center gap-1 text-[10.5px] text-slate-500 hover:text-slate-900"
                        >
                            <RefreshCw
                                className={cn(
                                    'w-3 h-3',
                                    loading && 'animate-spin'
                                )}
                            />
                            Refresh
                        </button>
                    </div>

                    <div className="max-h-44 overflow-y-auto py-1">
                        {loading && secrets === null ? (
                            <p className="px-3 py-3 text-[12px] text-slate-500">
                                Loading\u2026
                            </p>
                        ) : (secrets || []).length === 0 ? (
                            <p className="px-3 py-3 text-[12px] text-slate-500">
                                No secrets yet. Add one below.
                            </p>
                        ) : (
                            <ul>
                                {(secrets || []).map((s) => (
                                    <li key={s._id}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onChange(s.name);
                                                setOpen(false);
                                            }}
                                            className="w-full text-left px-3 py-2 text-[12.5px] text-slate-700 hover:bg-slate-900/[0.03] hover:text-slate-950 transition-colors flex items-center justify-between gap-3"
                                        >
                                            <span className="font-mono truncate">
                                                {s.name}
                                            </span>
                                            <span className="text-[10.5px] text-slate-400 truncate">
                                                {s.maskedHint || '\u2022\u2022\u2022\u2022\u2022'}
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="px-3 py-3 border-t border-slate-900/[0.06] space-y-2">
                        <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Quick add
                        </p>
                        <TextInput
                            placeholder="name (e.g. shopify_token)"
                            value={creatingName}
                            onChange={(e) => setCreatingName(e.target.value)}
                            className="h-8 text-[12px]"
                        />
                        <TextInput
                            type="password"
                            placeholder="value (encrypted server-side)"
                            value={creatingValue}
                            onChange={(e) => setCreatingValue(e.target.value)}
                            className="h-8 text-[12px]"
                        />
                        <div className="flex items-center justify-between gap-2">
                            <button
                                type="button"
                                onClick={handleCreate}
                                className="inline-flex items-center gap-1 h-8 px-3 rounded-md bg-slate-950 text-white text-[12px] font-semibold hover:bg-slate-800 transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                                Save secret
                            </button>
                            <a
                                href="/user/secrets"
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-900 transition-colors"
                                title="Open the full Secrets manager"
                            >
                                Manage all
                                <ExternalLink className="w-3 h-3" strokeWidth={2} />
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

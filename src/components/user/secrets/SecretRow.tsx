/**
 * Single row in the Secrets vault list.
 *
 * Renders metadata (name, masked hint, description, last used / rotated)
 * plus inline actions: rotate value, edit description, delete. The row
 * does not own any network state — all mutations are passed up to the
 * parent so it can re-fetch and toast.
 */

import React, { useState } from 'react';
import {
    KeyRound,
    RotateCw,
    Trash2,
    Loader2,
    Save,
    X,
    Pencil,
    Copy,
    Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type SecretMeta = {
    _id: string;
    name: string;
    maskedHint?: string;
    description?: string;
    lastUsedAt?: string | null;
    lastRotatedAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
};

type Props = {
    secret: SecretMeta;
    onRotate: (id: string, value: string) => Promise<void>;
    onUpdateDescription: (id: string, description: string) => Promise<void>;
    onDelete: (id: string, name: string) => Promise<void>;
};

const formatTime = (iso?: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
};

/**
 * Per-secret row. Hosts two inline drawers (rotate, edit description) that
 * are mutually exclusive; the row collapses back when either succeeds.
 */
const SecretRow: React.FC<Props> = ({ secret, onRotate, onUpdateDescription, onDelete }) => {
    const [mode, setMode] = useState<'idle' | 'rotate' | 'editDesc'>('idle');
    const [newValue, setNewValue] = useState('');
    const [newDesc, setNewDesc] = useState(secret.description || '');
    const [busy, setBusy] = useState<'rotate' | 'desc' | 'delete' | null>(null);
    const [copied, setCopied] = useState(false);

    const reset = () => {
        setMode('idle');
        setNewValue('');
        setNewDesc(secret.description || '');
    };

    const handleRotate = async () => {
        if (!newValue.trim()) return;
        setBusy('rotate');
        try {
            await onRotate(secret._id, newValue);
            reset();
        } finally {
            setBusy(null);
        }
    };

    const handleSaveDesc = async () => {
        setBusy('desc');
        try {
            await onUpdateDescription(secret._id, newDesc.trim());
            setMode('idle');
        } finally {
            setBusy(null);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Delete secret "${secret.name}"? Flows referencing {{secret.${secret.name}}} will fail at runtime.`)) {
            return;
        }
        setBusy('delete');
        try {
            await onDelete(secret._id, secret.name);
        } finally {
            setBusy(null);
        }
    };

    const handleCopyName = async () => {
        try {
            await navigator.clipboard.writeText(`{{secret.${secret.name}}}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
        } catch {
            // clipboard rejected — silently fail
        }
    };

    return (
        <div className="border-b border-slate-900/[0.06] last:border-b-0">
            <div className="px-5 py-4 flex items-start gap-4">
                <div className="w-9 h-9 rounded-md bg-emerald-600/10 text-emerald-700 flex items-center justify-center flex-shrink-0">
                    <KeyRound className="w-4 h-4" strokeWidth={2} />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-[13px] font-semibold text-slate-950 tracking-tight">
                            {secret.name}
                        </code>
                        <button
                            type="button"
                            onClick={handleCopyName}
                            className="inline-flex items-center gap-1 h-5 px-1.5 rounded text-[10.5px] font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-900/[0.04] transition-colors"
                            aria-label={`Copy {{secret.${secret.name}}}`}>
                            {copied ? (
                                <>
                                    <Check className="w-3 h-3" strokeWidth={2.5} />
                                    Copied
                                </>
                            ) : (
                                <>
                                    <Copy className="w-3 h-3" strokeWidth={2} />
                                    Copy ref
                                </>
                            )}
                        </button>
                        {secret.maskedHint && (
                            <span className="inline-flex items-center h-5 px-1.5 rounded bg-slate-900/[0.05] font-mono text-[10.5px] text-slate-600 tracking-wider">
                                {secret.maskedHint}
                            </span>
                        )}
                    </div>
                    <p className="text-[12.5px] text-slate-500 mt-0.5 truncate">
                        {secret.description || (
                            <span className="italic text-slate-400">No description</span>
                        )}
                    </p>
                    <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-400">
                        <span>Last used {formatTime(secret.lastUsedAt)}</span>
                        <span>•</span>
                        <span>Last rotated {formatTime(secret.lastRotatedAt || secret.createdAt)}</span>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                        type="button"
                        onClick={() => setMode(mode === 'editDesc' ? 'idle' : 'editDesc')}
                        className={cn(
                            'inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11.5px] font-medium border border-slate-900/[0.06] transition-colors',
                            mode === 'editDesc'
                                ? 'bg-slate-950 text-white border-slate-950'
                                : 'bg-white text-slate-700 hover:text-slate-950 hover:border-slate-900/20'
                        )}>
                        <Pencil className="w-3 h-3" strokeWidth={2} />
                        Edit
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode(mode === 'rotate' ? 'idle' : 'rotate')}
                        className={cn(
                            'inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11.5px] font-medium border border-slate-900/[0.06] transition-colors',
                            mode === 'rotate'
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-slate-700 hover:text-slate-950 hover:border-slate-900/20'
                        )}>
                        <RotateCw className="w-3 h-3" strokeWidth={2} />
                        Rotate
                    </button>
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={busy === 'delete'}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-md text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-60"
                        aria-label="Delete secret">
                        {busy === 'delete' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                        )}
                    </button>
                </div>
            </div>

            {mode === 'rotate' && (
                <div className="px-5 pb-4 -mt-1 flex items-center gap-2 bg-slate-50/60 border-t border-slate-900/[0.04] py-3">
                    <input
                        type="password"
                        autoFocus
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                        placeholder="New secret value"
                        className="flex-1 h-8 px-2.5 rounded-md bg-white border border-slate-900/[0.08] text-[12.5px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/60"
                    />
                    <button
                        type="button"
                        onClick={handleRotate}
                        disabled={busy === 'rotate' || !newValue.trim()}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-indigo-600 text-white text-[12px] font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50">
                        {busy === 'rotate' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Rotate
                    </button>
                    <button
                        type="button"
                        onClick={reset}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-500 hover:bg-slate-900/[0.05] transition-colors"
                        aria-label="Cancel rotate">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {mode === 'editDesc' && (
                <div className="px-5 pb-4 -mt-1 flex items-center gap-2 bg-slate-50/60 border-t border-slate-900/[0.04] py-3">
                    <input
                        type="text"
                        autoFocus
                        value={newDesc}
                        maxLength={200}
                        onChange={(e) => setNewDesc(e.target.value)}
                        placeholder="What is this secret used for?"
                        className="flex-1 h-8 px-2.5 rounded-md bg-white border border-slate-900/[0.08] text-[12.5px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/60"
                    />
                    <button
                        type="button"
                        onClick={handleSaveDesc}
                        disabled={busy === 'desc'}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-slate-950 text-white text-[12px] font-semibold hover:bg-slate-900 transition-colors disabled:opacity-50">
                        {busy === 'desc' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Save
                    </button>
                    <button
                        type="button"
                        onClick={reset}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-500 hover:bg-slate-900/[0.05] transition-colors"
                        aria-label="Cancel edit">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default SecretRow;

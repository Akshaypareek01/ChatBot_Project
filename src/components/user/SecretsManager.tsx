/**
 * Secrets Manager — per-client encrypted credentials vault.
 *
 * The vault is account-wide (not per-bot) so the same `shopify_token`
 * is reusable across every flow on every bot the client owns. Plaintext
 * leaves the server only on creation/rotation; this UI never reads the
 * stored value back. References inside flows look like
 * `{{secret.<name>}}` and are resolved at runtime by the executor.
 *
 * Server contract:
 *   GET    /api/users/secrets               { secrets: SecretMeta[] }
 *   POST   /api/users/secrets               body: { name, value, description? }
 *   PATCH  /api/users/secrets/:id           body: { value?, description? }
 *   DELETE /api/users/secrets/:id
 *
 * Names must match `^[a-z][a-z0-9_]{1,63}$` — same regex as the model.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
    KeyRound,
    Plus,
    Loader2,
    ShieldCheck,
    AlertCircle,
    Search,
    Eye,
    EyeOff,
    BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { listSecrets, createSecret, updateSecret, deleteSecret } from '@/services/api';
import SecretRow, { SecretMeta } from './secrets/SecretRow';

const NAME_REGEX = /^[a-z][a-z0-9_]{1,63}$/;

const SecretsManager: React.FC = () => {
    const [secrets, setSecrets] = useState<SecretMeta[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // create form state
    const [name, setName] = useState('');
    const [value, setValue] = useState('');
    const [description, setDescription] = useState('');
    const [showValue, setShowValue] = useState(false);
    const [creating, setCreating] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const fetchSecrets = async () => {
        try {
            const res = await listSecrets();
            setSecrets(res?.secrets || []);
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Failed to load secrets');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSecrets();
    }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return secrets;
        return secrets.filter(
            (s) =>
                s.name.includes(q) ||
                (s.description || '').toLowerCase().includes(q)
        );
    }, [secrets, search]);

    const validateName = (n: string): string | null => {
        if (!n) return 'Name is required.';
        if (!NAME_REGEX.test(n)) {
            return 'Use lowercase letters, numbers, underscores. Start with a letter. Max 64 chars.';
        }
        if (secrets.some((s) => s.name === n)) {
            return `A secret named "${n}" already exists.`;
        }
        return null;
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = name.trim().toLowerCase();
        const err = validateName(trimmedName);
        if (err) {
            setFormError(err);
            return;
        }
        if (!value) {
            setFormError('Secret value is required.');
            return;
        }
        setFormError(null);
        setCreating(true);
        try {
            await createSecret({
                name: trimmedName,
                value,
                description: description.trim() || undefined,
            });
            toast.success(`Secret "${trimmedName}" stored`);
            setName('');
            setValue('');
            setDescription('');
            setShowValue(false);
            fetchSecrets();
        } catch (e: any) {
            const msg = e?.response?.data?.message || e?.message || 'Failed to create secret';
            setFormError(msg);
            toast.error(msg);
        } finally {
            setCreating(false);
        }
    };

    const handleRotate = async (id: string, newValue: string) => {
        try {
            await updateSecret(id, { value: newValue });
            toast.success('Secret rotated');
            fetchSecrets();
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Rotate failed');
            throw e;
        }
    };

    const handleUpdateDescription = async (id: string, desc: string) => {
        try {
            await updateSecret(id, { description: desc });
            toast.success('Description updated');
            fetchSecrets();
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Update failed');
            throw e;
        }
    };

    const handleDelete = async (id: string, secretName: string) => {
        try {
            await deleteSecret(id);
            toast.success(`Secret "${secretName}" deleted`);
            fetchSecrets();
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Delete failed');
            throw e;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12 max-w-[1100px]">
            <header>
                <div className="inline-flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-emerald-700 mb-2">
                    <span className="w-3 h-px bg-emerald-700" />
                    Configure
                </div>
                <h1 className="text-[28px] sm:text-[34px] font-semibold tracking-[-0.02em] text-slate-950 leading-tight">
                    Secrets vault
                </h1>
                <p className="text-[13px] text-slate-500 mt-1.5 max-w-2xl leading-relaxed">
                    Securely store API tokens, signing keys, and webhook secrets used by your
                    flows. Encrypted at rest with AES-256-GCM. Reference inside any flow node
                    as <code className="px-1 py-0.5 rounded bg-slate-900/[0.06] font-mono text-[11.5px]">{'{{secret.your_name}}'}</code>.
                </p>
            </header>

            <div className="rounded-xl border border-slate-900/[0.06] bg-emerald-50/50 px-4 py-3 flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" strokeWidth={2} />
                <div className="text-[12.5px] text-slate-700 leading-relaxed">
                    <strong className="font-semibold text-slate-900">Account-wide.</strong> One
                    vault is shared across all your bots — no need to re-enter the same Shopify
                    token for each flow. Plaintext is never logged, never returned by the API,
                    and never displayed in the dashboard after save.
                </div>
            </div>

            <section
                className="rounded-xl border border-slate-900/[0.06] bg-white overflow-hidden"
                aria-label="Add new secret">
                <div className="px-5 py-4 border-b border-slate-900/[0.06] flex items-start gap-3">
                    <div className="w-7 h-7 rounded-md bg-emerald-600/10 text-emerald-700 flex items-center justify-center flex-shrink-0">
                        <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-[14px] font-semibold tracking-tight text-slate-950 leading-none">
                            Add a secret
                        </h3>
                        <p className="text-[12px] text-slate-500 mt-1">
                            Pick a stable, snake_case name. You'll reference it as <code className="font-mono text-[11.5px] text-slate-700">{'{{secret.<name>}}'}</code>.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleCreate} className="px-5 py-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label
                                htmlFor="secret-name"
                                className="block text-[11.5px] font-medium text-slate-700">
                                Name
                            </label>
                            <input
                                id="secret-name"
                                type="text"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    setFormError(null);
                                }}
                                placeholder="e.g. shopify_token"
                                autoComplete="off"
                                className="w-full h-9 px-2.5 rounded-md bg-white border border-slate-900/[0.08] text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/60 transition-colors font-mono"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label
                                htmlFor="secret-value"
                                className="block text-[11.5px] font-medium text-slate-700">
                                Value
                            </label>
                            <div className="relative">
                                <input
                                    id="secret-value"
                                    type={showValue ? 'text' : 'password'}
                                    value={value}
                                    onChange={(e) => {
                                        setValue(e.target.value);
                                        setFormError(null);
                                    }}
                                    placeholder="Paste the API token / signing key"
                                    autoComplete="new-password"
                                    className="w-full h-9 px-2.5 pr-9 rounded-md bg-white border border-slate-900/[0.08] text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/60 transition-colors font-mono"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowValue((v) => !v)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-6 h-6 rounded text-slate-400 hover:text-slate-700"
                                    aria-label={showValue ? 'Hide value' : 'Show value'}>
                                    {showValue ? (
                                        <EyeOff className="w-3.5 h-3.5" strokeWidth={2} />
                                    ) : (
                                        <Eye className="w-3.5 h-3.5" strokeWidth={2} />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label
                            htmlFor="secret-desc"
                            className="block text-[11.5px] font-medium text-slate-700">
                            Description <span className="text-slate-400 font-normal">(optional)</span>
                        </label>
                        <input
                            id="secret-desc"
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            maxLength={200}
                            placeholder="What is this token used for?"
                            className="w-full h-9 px-2.5 rounded-md bg-white border border-slate-900/[0.08] text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/60 transition-colors"
                        />
                    </div>

                    {formError && (
                        <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-rose-50 border border-rose-200 text-[12.5px] text-rose-700">
                            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" strokeWidth={2} />
                            <span>{formError}</span>
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-3 pt-1">
                        <a
                            href="/docs/FLOWS_AUTHORING_GUIDE.md"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-900 transition-colors">
                            <BookOpen className="w-3.5 h-3.5" strokeWidth={2} />
                            How {'{{'}secret.x{'}}'}  references work
                        </a>
                        <button
                            type="submit"
                            disabled={creating || !name || !value}
                            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-slate-950 text-white text-[12.5px] font-semibold hover:bg-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            {creating ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <KeyRound className="w-3.5 h-3.5" strokeWidth={2} />
                            )}
                            {creating ? 'Saving...' : 'Save secret'}
                        </button>
                    </div>
                </form>
            </section>

            <section
                className="rounded-xl border border-slate-900/[0.06] bg-white overflow-hidden"
                aria-label="Stored secrets">
                <div className="px-5 py-3.5 border-b border-slate-900/[0.06] flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                        <h3 className="text-[13.5px] font-semibold tracking-tight text-slate-950">
                            Your secrets
                        </h3>
                        <span className="inline-flex items-center h-5 px-1.5 rounded bg-slate-900/[0.05] text-[11px] font-medium text-slate-600">
                            {secrets.length}
                        </span>
                    </div>

                    <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" strokeWidth={2} />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name or description"
                            className="h-8 pl-8 pr-3 w-[260px] rounded-md bg-white border border-slate-900/[0.08] text-[12px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500/15 focus:border-slate-500/40 transition-colors"
                        />
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div className="px-5 py-12 text-center">
                        <div className="w-10 h-10 rounded-md bg-slate-900/[0.04] text-slate-500 flex items-center justify-center mx-auto">
                            <KeyRound className="w-4 h-4" strokeWidth={2} />
                        </div>
                        <p className="text-[13px] font-medium text-slate-700 mt-3">
                            {secrets.length === 0 ? 'No secrets yet' : 'No matching secrets'}
                        </p>
                        <p className="text-[12px] text-slate-500 mt-1">
                            {secrets.length === 0
                                ? 'Add your first secret above. Use it inside any flow node.'
                                : 'Try a different search.'}
                        </p>
                    </div>
                ) : (
                    <div>
                        {filtered.map((s) => (
                            <SecretRow
                                key={s._id}
                                secret={s}
                                onRotate={handleRotate}
                                onUpdateDescription={handleUpdateDescription}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default SecretsManager;

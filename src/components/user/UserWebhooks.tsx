/**
 * Phase 5.2: Configure webhook URLs and events; view delivery logs.
 */

import React, { useState, useEffect } from 'react';
import {
    getWebhooks,
    getWebhookEvents,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    getWebhookLogs,
} from '@/services/api';
import { toast } from 'sonner';
import {
    Link2,
    Plus,
    Trash2,
    Loader2,
    Check,
    X,
    Webhook as WebhookIcon,
    Activity,
    AlertCircle,
    ChevronDown,
    Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const EVENT_LABELS: Record<string, string> = {
    conversation_started: 'Conversation started',
    lead_captured: 'Lead captured',
    chat_escalated: 'Chat escalated to human',
    feedback_received: 'Feedback received',
    token_low: 'Token balance low',
};

const EVENT_DOT: Record<string, string> = {
    conversation_started: 'bg-indigo-500',
    lead_captured: 'bg-emerald-500',
    chat_escalated: 'bg-amber-500',
    feedback_received: 'bg-violet-500',
    token_low: 'bg-rose-500',
};

/* ----- primitives ----- */

const Toggle: React.FC<{
    checked: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
}> = ({ checked, onChange, disabled }) => (
    <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
            'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors',
            checked ? 'bg-indigo-600' : 'bg-slate-300',
            disabled && 'opacity-50 cursor-not-allowed'
        )}
    >
        <span
            className={cn(
                'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5',
                checked ? 'translate-x-[18px]' : 'translate-x-0.5'
            )}
        />
    </button>
);

export default function UserWebhooks() {
    const [webhooks, setWebhooks] = useState<any[]>([]);
    const [events, setEvents] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [newUrl, setNewUrl] = useState('');
    const [newEvents, setNewEvents] = useState<string[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);

    const fetchData = async () => {
        try {
            const [whRes, evRes] = await Promise.all([getWebhooks(), getWebhookEvents()]);
            setWebhooks(whRes?.webhooks ?? []);
            setEvents(evRes?.events ?? []);
        } catch (e) {
            toast.error('Failed to load webhooks');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const loadLogs = async (id: string) => {
        const next = expandedId === id ? null : id;
        setExpandedId(next);
        if (!next) return;
        setLogsLoading(true);
        try {
            const res = await getWebhookLogs(next, 30);
            setLogs(res?.logs ?? []);
        } catch {
            setLogs([]);
        } finally {
            setLogsLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newUrl.trim()) {
            toast.error('Enter a webhook URL');
            return;
        }
        setSaving(true);
        try {
            await createWebhook({ url: newUrl.trim(), events: newEvents });
            toast.success('Webhook added');
            setNewUrl('');
            setNewEvents([]);
            fetchData();
        } catch (e: any) {
            toast.error(e?.message || 'Failed to add webhook');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (id: string, isActive: boolean) => {
        try {
            await updateWebhook(id, { isActive });
            toast.success(isActive ? 'Webhook enabled' : 'Webhook disabled');
            fetchData();
        } catch {
            toast.error('Update failed');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Remove this webhook?')) return;
        try {
            await deleteWebhook(id);
            toast.success('Webhook removed');
            fetchData();
        } catch {
            toast.error('Delete failed');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
            </div>
        );
    }

    const formatTime = (d?: string) =>
        d
            ? new Date(d).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
              })
            : '';

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div>
                <div className="inline-flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-indigo-600 mb-2">
                    <span className="w-3 h-px bg-indigo-600" />
                    Integrations
                </div>
                <h1 className="text-[28px] sm:text-[34px] font-semibold tracking-[-0.02em] text-slate-950 leading-tight">
                    Webhooks
                </h1>
                <p className="text-[13px] text-slate-500 mt-1.5 max-w-2xl leading-relaxed">
                    Get notified on your server when events happen. We send POST requests with retries (3 attempts) and HMAC-SHA256 signatures.
                </p>
            </div>

            {/* Add webhook card */}
            <div className="rounded-xl border border-slate-900/[0.06] bg-white overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-900/[0.06] flex items-start gap-3">
                    <div className="w-7 h-7 rounded-md bg-indigo-600/10 text-indigo-600 flex items-center justify-center flex-shrink-0">
                        <Link2 className="w-3.5 h-3.5" strokeWidth={2} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-[14px] font-semibold tracking-tight text-slate-950 leading-none">
                            Add webhook
                        </h3>
                        <p className="text-[12px] text-slate-500 mt-1">
                            Use HTTPS in production. Optional secret for{' '}
                            <code className="px-1 py-0.5 rounded bg-slate-900/[0.05] font-mono text-[10.5px] text-slate-700">
                                X-Webhook-Signature
                            </code>{' '}
                            verification.
                        </p>
                    </div>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-1.5">
                            Endpoint URL
                        </label>
                        <input
                            placeholder="https://your-server.com/webhook"
                            value={newUrl}
                            onChange={(e) => setNewUrl(e.target.value)}
                            className="w-full h-9 px-3 rounded-md border border-slate-900/[0.08] bg-white text-[13px] text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10 transition-all font-mono"
                        />
                    </div>
                    <div>
                        <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2">
                            Subscribe to events
                            <span className="text-slate-400 normal-case tracking-normal text-[11px] font-normal">
                                · click to toggle
                            </span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {events.map((e) => {
                                const active = newEvents.includes(e);
                                return (
                                    <button
                                        key={e}
                                        type="button"
                                        onClick={() =>
                                            setNewEvents((prev) =>
                                                prev.includes(e)
                                                    ? prev.filter((x) => x !== e)
                                                    : [...prev, e]
                                            )
                                        }
                                        className={cn(
                                            'inline-flex items-center gap-1.5 px-3 h-7 rounded-md text-[12px] font-semibold tracking-tight transition-all border',
                                            active
                                                ? 'bg-indigo-600 text-white border-indigo-600'
                                                : 'bg-white text-slate-700 border-slate-900/[0.08] hover:border-slate-900/[0.16]'
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'w-1.5 h-1.5 rounded-full',
                                                active ? 'bg-white' : EVENT_DOT[e] || 'bg-slate-400'
                                            )}
                                        />
                                        {EVENT_LABELS[e] || e}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleCreate}
                        disabled={saving || !newUrl.trim()}
                        className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-md bg-slate-950 text-white text-[12.5px] font-semibold tracking-tight hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {saving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Plus className="w-3.5 h-3.5" strokeWidth={2.25} />
                        )}
                        Add webhook
                    </button>
                </div>
            </div>

            {/* Your webhooks */}
            <div className="rounded-xl border border-slate-900/[0.06] bg-white overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-900/[0.06] flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-md bg-slate-900/[0.04] text-slate-700 flex items-center justify-center flex-shrink-0">
                            <WebhookIcon className="w-3.5 h-3.5" strokeWidth={2} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-[14px] font-semibold tracking-tight text-slate-950 leading-none">
                                Your webhooks
                            </h3>
                            <p className="text-[12px] text-slate-500 mt-1">
                                Delivery logs show last 30 attempts per webhook.
                            </p>
                        </div>
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        {webhooks.length} active
                    </span>
                </div>

                {webhooks.length === 0 ? (
                    <div className="p-10 text-center">
                        <div className="w-10 h-10 mx-auto rounded-full bg-slate-900/[0.04] flex items-center justify-center mb-3">
                            <WebhookIcon
                                className="w-4 h-4 text-slate-400"
                                strokeWidth={1.75}
                            />
                        </div>
                        <p className="text-[12.5px] font-semibold text-slate-700">
                            No webhooks yet
                        </p>
                        <p className="text-[11.5px] text-slate-500 mt-0.5">
                            Add your first endpoint above to start receiving events.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-900/[0.06]">
                        {webhooks.map((wh) => {
                            const expanded = expandedId === wh._id;
                            const isActive = wh.isActive !== false;
                            return (
                                <div key={wh._id} className="p-5">
                                    <div className="flex items-start justify-between gap-3 flex-wrap">
                                        <div className="flex items-start gap-3 min-w-0 flex-1">
                                            <span
                                                className={cn(
                                                    'mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0',
                                                    isActive ? 'bg-emerald-500' : 'bg-slate-300'
                                                )}
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="font-mono text-[12.5px] text-slate-900 break-all leading-snug">
                                                    {wh.url}
                                                </p>
                                                {(wh.events || []).length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                                        {(wh.events || []).map((e: string) => (
                                                            <span
                                                                key={e}
                                                                className="inline-flex items-center gap-1 px-1.5 h-5 rounded-sm bg-slate-900/[0.04] text-slate-700 text-[10.5px] font-medium tracking-tight"
                                                            >
                                                                <span
                                                                    className={cn(
                                                                        'w-1 h-1 rounded-full',
                                                                        EVENT_DOT[e] || 'bg-slate-400'
                                                                    )}
                                                                />
                                                                {EVENT_LABELS[e] || e}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            <Toggle
                                                checked={isActive}
                                                onChange={(v) => handleToggleActive(wh._id, v)}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => loadLogs(wh._id)}
                                                className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md border border-slate-900/[0.08] bg-white text-slate-700 text-[11.5px] font-semibold tracking-tight hover:bg-slate-50 hover:border-slate-900/[0.12] transition-all"
                                            >
                                                <Activity className="w-3 h-3" strokeWidth={2.25} />
                                                {expanded ? 'Hide logs' : 'Logs'}
                                                <ChevronDown
                                                    className={cn(
                                                        'w-3 h-3 transition-transform',
                                                        expanded && 'rotate-180'
                                                    )}
                                                    strokeWidth={2.25}
                                                />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(wh._id)}
                                                className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all"
                                                title="Delete webhook"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Logs */}
                                    {expanded && (
                                        <div className="mt-4 pt-4 border-t border-slate-900/[0.06]">
                                            <h4 className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-3">
                                                Recent deliveries
                                            </h4>
                                            {logsLoading ? (
                                                <div className="flex items-center gap-2 text-[12px] text-slate-500">
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    Loading logs…
                                                </div>
                                            ) : logs.length === 0 ? (
                                                <div className="rounded-lg border border-dashed border-slate-900/[0.12] py-6 text-center">
                                                    <Clock className="w-4 h-4 text-slate-400 mx-auto mb-1.5" strokeWidth={1.75} />
                                                    <p className="text-[12px] text-slate-500">
                                                        No delivery logs yet.
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="rounded-lg border border-slate-900/[0.06] overflow-hidden">
                                                    {logs.map((log: any, i: number) => (
                                                        <div
                                                            key={i}
                                                            className={cn(
                                                                'flex items-center gap-3 px-3 py-2 text-[11.5px]',
                                                                i > 0 && 'border-t border-slate-900/[0.06]',
                                                                log.success
                                                                    ? 'bg-white'
                                                                    : 'bg-rose-50/40'
                                                            )}
                                                        >
                                                            <span
                                                                className={cn(
                                                                    'w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0',
                                                                    log.success
                                                                        ? 'bg-emerald-500/15 text-emerald-600'
                                                                        : 'bg-rose-500/15 text-rose-600'
                                                                )}
                                                            >
                                                                {log.success ? (
                                                                    <Check
                                                                        className="w-2.5 h-2.5"
                                                                        strokeWidth={2.5}
                                                                    />
                                                                ) : (
                                                                    <X
                                                                        className="w-2.5 h-2.5"
                                                                        strokeWidth={2.5}
                                                                    />
                                                                )}
                                                            </span>
                                                            <span className="font-medium text-slate-800 tracking-tight flex-shrink-0">
                                                                {EVENT_LABELS[log.event] || log.event}
                                                            </span>
                                                            <span className="text-slate-400 text-[10.5px]">
                                                                attempt {log.attempt}
                                                            </span>
                                                            {log.statusCode != null && (
                                                                <span
                                                                    className={cn(
                                                                        'px-1.5 h-4 rounded-sm text-[10px] font-mono inline-flex items-center',
                                                                        log.success
                                                                            ? 'bg-emerald-500/10 text-emerald-700'
                                                                            : 'bg-rose-500/10 text-rose-700'
                                                                    )}
                                                                >
                                                                    {log.statusCode}
                                                                </span>
                                                            )}
                                                            {log.errorMessage && (
                                                                <span className="text-rose-600 truncate min-w-0 flex-1 text-[11px]">
                                                                    {log.errorMessage}
                                                                </span>
                                                            )}
                                                            <span className="ml-auto flex items-center gap-3 text-slate-400 text-[10.5px] tabular-nums flex-shrink-0">
                                                                {log.responseTimeMs != null && (
                                                                    <span>{log.responseTimeMs}ms</span>
                                                                )}
                                                                {log.attemptedAt && (
                                                                    <span>{formatTime(log.attemptedAt)}</span>
                                                                )}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Tip */}
            <div className="rounded-xl border border-dashed border-slate-900/[0.12] bg-white p-4">
                <div className="flex items-start gap-2.5">
                    <AlertCircle
                        className="w-3.5 h-3.5 text-indigo-600 mt-0.5 flex-shrink-0"
                        strokeWidth={2}
                    />
                    <div className="text-[11.5px] text-slate-600 leading-relaxed">
                        <span className="font-semibold text-slate-900">Verify signatures: </span>
                        every payload includes an{' '}
                        <code className="px-1 py-0.5 rounded bg-slate-900/[0.05] font-mono text-[10.5px] text-slate-700">
                            X-Webhook-Signature
                        </code>{' '}
                        header (HMAC-SHA256 of the raw body using your secret). Reject any request whose signature doesn’t match.
                    </div>
                </div>
            </div>
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getConversationById, updateConversation } from '@/services/api';
import { toast } from 'sonner';
import {
    ArrowLeft,
    Bot,
    User,
    ThumbsUp,
    ThumbsDown,
    Star,
    Globe,
    Clock,
    Mail,
    Phone,
    UserCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
    role: string;
    content: string;
    timestamp?: string;
    feedback?: number;
}

interface Conversation {
    _id: string;
    visitorId: string;
    startedAt: string;
    status: string;
    rating?: number;
    leadInfo?: { name?: string; email?: string; phone?: string };
    messages: Message[];
    metadata?: { pageUrl?: string; userAgent?: string };
}

const STATUS_OPTIONS: { id: string; label: string }[] = [
    { id: 'active', label: 'Active' },
    { id: 'ended', label: 'Ended' },
    { id: 'escalated', label: 'Escalated' },
];

const statusPillCls = (s: string) => {
    if (s === 'active')
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s === 'escalated')
        return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
};

export default function ConversationDetail() {
    const { id } = useParams<{ id: string }>();
    const [conv, setConv] = useState<Conversation | null>(null);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        if (!id) return;
        getConversationById(id)
            .then(setConv)
            .catch(() => toast.error('Conversation not found'));
    }, [id]);

    if (!conv) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
            </div>
        );
    }

    const formatDate = (d?: string) =>
        d
            ? new Date(d).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
              })
            : '—';

    const formatTime = (d?: string) =>
        d
            ? new Date(d).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
              })
            : '';

    const handleStatusChange = async (newStatus: string) => {
        setUpdating(true);
        try {
            const updated = await updateConversation(conv._id, { status: newStatus });
            setConv(updated);
            toast.success('Status updated');
        } catch {
            toast.error('Update failed');
        } finally {
            setUpdating(false);
        }
    };

    const displayName =
        conv.leadInfo?.name ||
        conv.leadInfo?.email ||
        `Visitor ${conv.visitorId?.slice(0, 8)}…`;

    const initial = (
        conv.leadInfo?.name ||
        conv.leadInfo?.email ||
        conv.visitorId ||
        '?'
    )
        .trim()
        .charAt(0)
        .toUpperCase();

    const hasLead = !!(conv.leadInfo?.name || conv.leadInfo?.email);

    return (
        <div className="space-y-6">
            {/* Back link */}
            <Link
                to="/user/conversations"
                className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-slate-500 hover:text-slate-900 transition-colors"
            >
                <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} />
                Back to conversations
            </Link>

            {/* Header card */}
            <div className="rounded-xl border border-slate-900/[0.06] bg-white overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-900/[0.06] flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3 min-w-0">
                        <div
                            className={cn(
                                'w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-semibold flex-shrink-0',
                                hasLead
                                    ? 'bg-indigo-600/10 text-indigo-600'
                                    : 'bg-slate-900/[0.05] text-slate-600'
                            )}
                        >
                            {hasLead ? (
                                initial
                            ) : (
                                <UserCircle2 className="w-5 h-5" strokeWidth={1.75} />
                            )}
                        </div>
                        <div className="min-w-0">
                            <div className="inline-flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-indigo-600 mb-0.5">
                                <span className="w-3 h-px bg-indigo-600" />
                                Conversation
                            </div>
                            <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-950 leading-tight truncate">
                                {displayName}
                            </h1>
                            <p className="text-[12px] text-slate-500 mt-1 inline-flex items-center gap-1.5">
                                <Clock className="w-3 h-3" strokeWidth={2} />
                                Started {formatDate(conv.startedAt)}
                            </p>
                        </div>
                    </div>

                    {/* Status pill toggle */}
                    <div className="flex items-center gap-2">
                        {conv.rating != null && (
                            <span className="inline-flex items-center gap-1 px-2 h-7 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-[12px] font-semibold">
                                <Star
                                    className="w-3.5 h-3.5 fill-amber-500 text-amber-500"
                                    strokeWidth={1.75}
                                />
                                {conv.rating}
                            </span>
                        )}
                        <div
                            className={cn(
                                'inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-900/[0.04] border border-slate-900/[0.06]',
                                updating && 'opacity-60'
                            )}
                        >
                            {STATUS_OPTIONS.map((o) => (
                                <button
                                    key={o.id}
                                    disabled={updating}
                                    onClick={() => handleStatusChange(o.id)}
                                    className={cn(
                                        'px-3 h-7 rounded-md text-[12px] font-semibold tracking-tight transition-all',
                                        (conv.status || 'active') === o.id
                                            ? 'bg-white text-slate-950 shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                                            : 'text-slate-600 hover:text-slate-900'
                                    )}
                                >
                                    {o.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Lead + metadata */}
                {(conv.leadInfo?.name ||
                    conv.leadInfo?.email ||
                    conv.leadInfo?.phone ||
                    conv.metadata?.pageUrl) && (
                    <div className="px-5 py-3 bg-[#FAFAFA] border-b border-slate-900/[0.06] grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {conv.leadInfo?.name && (
                            <InfoCell
                                icon={UserCircle2}
                                label="Name"
                                value={conv.leadInfo.name}
                            />
                        )}
                        {conv.leadInfo?.email && (
                            <InfoCell
                                icon={Mail}
                                label="Email"
                                value={conv.leadInfo.email}
                            />
                        )}
                        {conv.leadInfo?.phone && (
                            <InfoCell
                                icon={Phone}
                                label="Phone"
                                value={conv.leadInfo.phone}
                            />
                        )}
                        {conv.metadata?.pageUrl && (
                            <InfoCell
                                icon={Globe}
                                label="Page"
                                value={conv.metadata.pageUrl}
                                truncate
                            />
                        )}
                    </div>
                )}

                {/* Transcript */}
                <div className="px-5 py-5 bg-[#FAFAFA] min-h-[280px]">
                    {!conv.messages || conv.messages.length === 0 ? (
                        <p className="text-[12.5px] text-slate-500 text-center py-10">
                            This conversation has no messages.
                        </p>
                    ) : (
                        <div className="max-w-[680px] mx-auto space-y-3">
                            {conv.messages.map((m, i) => {
                                const isUser = m.role === 'user';
                                return (
                                    <div
                                        key={i}
                                        className={cn(
                                            'flex items-end gap-2',
                                            isUser ? 'justify-end' : 'justify-start'
                                        )}
                                    >
                                        {!isUser && (
                                            <div className="w-7 h-7 rounded-full bg-indigo-600/10 text-indigo-600 flex items-center justify-center flex-shrink-0">
                                                <Bot
                                                    className="w-3.5 h-3.5"
                                                    strokeWidth={2}
                                                />
                                            </div>
                                        )}
                                        <div className="flex flex-col items-stretch max-w-[80%]">
                                            <div
                                                className={cn(
                                                    'rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed tracking-tight whitespace-pre-wrap break-words',
                                                    isUser
                                                        ? 'bg-indigo-600 text-white rounded-br-md'
                                                        : 'bg-white border border-slate-900/[0.06] text-slate-800 rounded-bl-md'
                                                )}
                                            >
                                                {m.content}
                                            </div>
                                            <div
                                                className={cn(
                                                    'flex items-center gap-1.5 mt-1 px-1',
                                                    isUser ? 'justify-end' : 'justify-start'
                                                )}
                                            >
                                                {m.timestamp && (
                                                    <span className="text-[10.5px] text-slate-400 tabular-nums">
                                                        {formatTime(m.timestamp)}
                                                    </span>
                                                )}
                                                {!isUser && m.feedback != null && (
                                                    <span
                                                        className={cn(
                                                            'inline-flex items-center w-4 h-4 rounded-full',
                                                            m.feedback === 1
                                                                ? 'bg-emerald-500/15 text-emerald-600'
                                                                : 'bg-rose-500/15 text-rose-600'
                                                        )}
                                                    >
                                                        {m.feedback === 1 ? (
                                                            <ThumbsUp
                                                                className="w-2.5 h-2.5 mx-auto"
                                                                strokeWidth={2.25}
                                                            />
                                                        ) : (
                                                            <ThumbsDown
                                                                className="w-2.5 h-2.5 mx-auto"
                                                                strokeWidth={2.25}
                                                            />
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {isUser && (
                                            <div className="w-7 h-7 rounded-full bg-slate-900/[0.06] text-slate-600 flex items-center justify-center flex-shrink-0">
                                                <User
                                                    className="w-3.5 h-3.5"
                                                    strokeWidth={2}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const InfoCell: React.FC<{
    icon: React.ElementType;
    label: string;
    value: string;
    truncate?: boolean;
}> = ({ icon: Icon, label, value, truncate }) => (
    <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-0.5">
            <Icon className="w-3 h-3" strokeWidth={2} />
            {label}
        </div>
        <p
            className={cn(
                'text-[12.5px] text-slate-800 font-medium tracking-tight',
                truncate && 'truncate'
            )}
            title={truncate ? value : undefined}
        >
            {value}
        </p>
    </div>
);

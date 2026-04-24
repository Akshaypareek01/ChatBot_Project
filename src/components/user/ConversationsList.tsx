import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    getConversations,
    exportConversationsCsv,
    exportLeadsCsv,
    getFeedbackStats,
} from '@/services/api';
import { useBot } from '@/context/BotContext';
import { toast } from 'sonner';
import {
    MessageSquare,
    Download,
    ThumbsUp,
    ThumbsDown,
    Search,
    ChevronRight,
    ChevronLeft,
    Inbox,
    UserCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Conversation {
    _id: string;
    visitorId: string;
    startedAt: string;
    status: string;
    rating?: number;
    leadInfo?: { name?: string; email?: string; phone?: string };
    messages?: { role: string; content: string }[];
}

const STATUS_OPTIONS: { id: string; label: string }[] = [
    { id: '', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'ended', label: 'Ended' },
    { id: 'escalated', label: 'Escalated' },
];

const FEEDBACK_OPTIONS: { id: string; label: string }[] = [
    { id: '', label: 'All' },
    { id: 'negative', label: 'Flagged 👎' },
];

const statusPill = (status: string) => {
    const s = status || 'active';
    if (s === 'active')
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s === 'escalated')
        return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
};

export default function ConversationsList() {
    const { currentBotId } = useBot() || {};
    const [data, setData] = useState<{
        conversations: Conversation[];
        total: number;
        page: number;
        limit: number;
    } | null>(null);
    const [page, setPage] = useState(1);
    const [exporting, setExporting] = useState(false);
    const [exportingLeads, setExportingLeads] = useState(false);
    const [status, setStatus] = useState<string>('');
    const [feedbackFilter, setFeedbackFilter] = useState<string>('');
    const [keyword, setKeyword] = useState('');
    const [keywordInput, setKeywordInput] = useState('');
    const [feedbackStats, setFeedbackStats] = useState<{
        positive: number;
        negative: number;
        total: number;
        percentPositive: number | null;
    } | null>(null);

    useEffect(() => {
        getConversations({
            page,
            limit: 20,
            status: status || undefined,
            keyword: keyword || undefined,
            feedback: feedbackFilter || undefined,
            botId: currentBotId ?? undefined,
        })
            .then(setData)
            .catch(() => toast.error('Failed to load conversations'));
    }, [page, status, keyword, feedbackFilter, currentBotId]);

    useEffect(() => {
        getFeedbackStats()
            .then(setFeedbackStats)
            .catch(() => {});
    }, []);

    const applySearch = () => setKeyword(keywordInput.trim());

    const download = async (
        fn: () => Promise<Blob>,
        filename: string,
        setBusy: (v: boolean) => void,
        label: string
    ) => {
        setBusy(true);
        try {
            const blob = await fn();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            toast.success(`${label} downloaded`);
        } catch {
            toast.error('Export failed');
        } finally {
            setBusy(false);
        }
    };

    const formatDate = (d: string) =>
        d
            ? new Date(d).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
              })
            : '—';

    const getInitial = (c: Conversation) => {
        const name = c.leadInfo?.name || c.leadInfo?.email || c.visitorId || '?';
        return name.trim().charAt(0).toUpperCase();
    };

    const getDisplayName = (c: Conversation) =>
        c.leadInfo?.name ||
        c.leadInfo?.email ||
        `Visitor ${c.visitorId?.slice(0, 8)}…`;

    const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

    return (
        <div className="space-y-7">
            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600 mb-2">
                        <span className="w-6 h-px bg-indigo-600" /> Engagement
                    </div>
                    <h1 className="text-3xl sm:text-[34px] font-semibold tracking-[-0.02em] text-slate-950 leading-[1.05]">
                        Conversations
                    </h1>
                    <p className="mt-2 text-[13.5px] text-slate-600">
                        Chat sessions from your widget visitors.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() =>
                            download(
                                exportLeadsCsv,
                                'leads.csv',
                                setExportingLeads,
                                'Leads'
                            )
                        }
                        disabled={exportingLeads}
                        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-white border border-slate-900/[0.08] text-[13px] font-semibold tracking-tight text-slate-700 hover:text-slate-950 hover:border-slate-900/20 transition-colors disabled:opacity-60"
                    >
                        <Download className="w-3.5 h-3.5" strokeWidth={2} />
                        {exportingLeads ? 'Exporting…' : 'Leads'}
                    </button>
                    <button
                        onClick={() =>
                            download(
                                exportConversationsCsv,
                                'conversations.csv',
                                setExporting,
                                'Conversations'
                            )
                        }
                        disabled={exporting}
                        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-slate-950 text-white text-[13px] font-semibold tracking-tight hover:bg-slate-800 transition-colors disabled:opacity-60"
                    >
                        <Download className="w-3.5 h-3.5" strokeWidth={2} />
                        {exporting ? 'Exporting…' : 'Export CSV'}
                    </button>
                </div>
            </div>

            {/* Feedback stats strip */}
            {feedbackStats && feedbackStats.total > 0 && (
                <div className="rounded-xl border border-slate-900/[0.06] bg-white px-5 py-3.5 flex flex-wrap items-center gap-5">
                    <div className="flex items-center gap-2">
                        <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Feedback
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <ThumbsUp
                            className="w-3.5 h-3.5 text-emerald-600"
                            strokeWidth={2}
                        />
                        <span className="tabular-nums text-[13px] font-semibold text-slate-950">
                            {feedbackStats.positive}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <ThumbsDown
                            className="w-3.5 h-3.5 text-rose-600"
                            strokeWidth={2}
                        />
                        <span className="tabular-nums text-[13px] font-semibold text-slate-950">
                            {feedbackStats.negative}
                        </span>
                    </div>
                    {feedbackStats.percentPositive != null && (
                        <>
                            <span className="w-px h-4 bg-slate-900/[0.08]" />
                            <span className="text-[12.5px] text-slate-600">
                                <span className="font-semibold text-slate-900 tabular-nums">
                                    {feedbackStats.percentPositive}%
                                </span>{' '}
                                positive
                            </span>
                        </>
                    )}
                </div>
            )}

            {/* List card */}
            <div className="rounded-xl border border-slate-900/[0.06] bg-white overflow-hidden">
                {/* Filter bar */}
                <div className="px-5 py-4 border-b border-slate-900/[0.06] flex flex-wrap items-center gap-3">
                    {/* Status toggle */}
                    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-900/[0.04] border border-slate-900/[0.06]">
                        {STATUS_OPTIONS.map((o) => (
                            <button
                                key={o.id || 'all'}
                                onClick={() => {
                                    setStatus(o.id);
                                    setPage(1);
                                }}
                                className={cn(
                                    'px-3 h-7 rounded-md text-[12px] font-semibold tracking-tight transition-all',
                                    status === o.id
                                        ? 'bg-white text-slate-950 shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                                        : 'text-slate-600 hover:text-slate-900'
                                )}
                            >
                                {o.label}
                            </button>
                        ))}
                    </div>

                    {/* Feedback toggle */}
                    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-900/[0.04] border border-slate-900/[0.06]">
                        {FEEDBACK_OPTIONS.map((o) => (
                            <button
                                key={o.id || 'fall'}
                                onClick={() => {
                                    setFeedbackFilter(o.id);
                                    setPage(1);
                                }}
                                className={cn(
                                    'px-3 h-7 rounded-md text-[12px] font-semibold tracking-tight transition-all',
                                    feedbackFilter === o.id
                                        ? 'bg-white text-slate-950 shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                                        : 'text-slate-600 hover:text-slate-900'
                                )}
                            >
                                {o.label}
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="flex items-center gap-2 ml-auto">
                        <div className="relative">
                            <Search
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"
                                strokeWidth={2}
                            />
                            <input
                                value={keywordInput}
                                onChange={(e) => setKeywordInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                                placeholder="Search in messages…"
                                className="h-8 pl-8 pr-3 rounded-md bg-white border border-slate-900/[0.08] text-[12.5px] text-slate-900 placeholder:text-slate-400 w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/60 transition-colors"
                            />
                        </div>
                        <button
                            onClick={applySearch}
                            className="inline-flex items-center h-8 px-3 rounded-md bg-white border border-slate-900/[0.08] text-[12px] font-semibold text-slate-700 hover:text-slate-950 hover:border-slate-900/20 transition-colors"
                        >
                            Search
                        </button>
                    </div>
                </div>

                {/* List body */}
                {!data ? (
                    <div className="py-16 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
                    </div>
                ) : data.conversations.length === 0 ? (
                    <div className="py-16 text-center">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-900/[0.04] text-slate-400 mb-3">
                            <Inbox className="w-4 h-4" strokeWidth={1.75} />
                        </div>
                        <p className="text-[13px] text-slate-700 font-medium">
                            No conversations yet
                        </p>
                        <p className="text-[12.5px] text-slate-500 mt-0.5">
                            {keyword || status || feedbackFilter
                                ? 'Try clearing your filters.'
                                : 'They will show up here once visitors start chatting.'}
                        </p>
                    </div>
                ) : (
                    <ul className="divide-y divide-slate-900/[0.06]">
                        {data.conversations.map((c) => {
                            const hasLead = !!(c.leadInfo?.name || c.leadInfo?.email);
                            return (
                                <li key={c._id}>
                                    <Link
                                        to={`/user/conversations/${c._id}`}
                                        className="group flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-slate-900/[0.02] transition-colors"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div
                                                className={cn(
                                                    'w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold flex-shrink-0',
                                                    hasLead
                                                        ? 'bg-indigo-600/10 text-indigo-600'
                                                        : 'bg-slate-900/[0.05] text-slate-600'
                                                )}
                                            >
                                                {hasLead ? (
                                                    getInitial(c)
                                                ) : (
                                                    <UserCircle2
                                                        className="w-4 h-4"
                                                        strokeWidth={1.75}
                                                    />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="text-[13px] font-semibold tracking-tight text-slate-950 truncate group-hover:text-indigo-600 transition-colors">
                                                        {getDisplayName(c)}
                                                    </p>
                                                    <span
                                                        className={cn(
                                                            'inline-flex items-center px-1.5 py-0 h-[18px] rounded-full border text-[10.5px] font-semibold uppercase tracking-[0.08em] leading-none',
                                                            statusPill(c.status)
                                                        )}
                                                    >
                                                        {c.status || 'active'}
                                                    </span>
                                                    {c.rating != null && (
                                                        <span className="text-[11px] text-amber-600 font-semibold">
                                                            {c.rating}★
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11.5px] text-slate-500 mt-0.5">
                                                    <MessageSquare className="w-3 h-3 inline -translate-y-px mr-1" strokeWidth={2} />
                                                    {c.messages?.length ?? 0} messages ·{' '}
                                                    {formatDate(c.startedAt)}
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronRight
                                            className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all flex-shrink-0"
                                            strokeWidth={2}
                                        />
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                )}

                {/* Pagination */}
                {data && data.total > data.limit && (
                    <div className="px-5 py-3 border-t border-slate-900/[0.06] flex items-center justify-between">
                        <p className="text-[11.5px] text-slate-500">
                            Page{' '}
                            <span className="font-semibold text-slate-800 tabular-nums">
                                {data.page}
                            </span>{' '}
                            of{' '}
                            <span className="font-semibold text-slate-800 tabular-nums">
                                {totalPages}
                            </span>{' '}
                            · {data.total} total
                        </p>
                        <div className="flex items-center gap-1.5">
                            <button
                                disabled={data.page <= 1}
                                onClick={() => setPage((p) => p - 1)}
                                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-white border border-slate-900/[0.08] text-[11.5px] font-semibold text-slate-700 hover:text-slate-950 hover:border-slate-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="w-3 h-3" strokeWidth={2} />
                                Prev
                            </button>
                            <button
                                disabled={data.page >= totalPages}
                                onClick={() => setPage((p) => p + 1)}
                                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-white border border-slate-900/[0.08] text-[11.5px] font-semibold text-slate-700 hover:text-slate-950 hover:border-slate-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Next
                                <ChevronRight className="w-3 h-3" strokeWidth={2} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

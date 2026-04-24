import React, { useState, useEffect, useMemo } from 'react';
import {
    BarChart2,
    MessageSquare,
    Users,
    Clock,
    TrendingUp,
    AlertCircle,
    Zap,
    ThumbsUp,
    HelpCircle,
    ArrowRight,
    Gauge,
} from 'lucide-react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    BarChart,
    Bar,
} from 'recharts';
import { getUserAnalytics } from '@/services/api';
import { useBot } from '@/context/BotContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

type Period = '7d' | '30d' | '90d';

interface AnalyticsData {
    period: string;
    startDate: string;
    chatVolumeOverTime: { date: string; conversations: number; messages: number }[];
    totalConversations: number;
    totalMessages: number;
    uniqueVisitors: number;
    avgResponseTimeMs: number | null;
    mostAskedQuestions: { question: string; count: number }[];
    unansweredEscalated: {
        escalatedCount: number;
        unansweredCount: number;
        sampleEscalated: { id: string; startedAt: string }[];
        sampleUnanswered: { id: string; startedAt: string }[];
    };
    leadConversion: {
        totalConversations: number;
        leadsCaptured: number;
        conversionRate: number;
    };
    tokenUsageBreakdown: { chat: number; upload: number; scrape: number };
    peakHoursHeatmap: { hour: number; count: number }[];
    satisfactionScore: {
        positive: number;
        negative: number;
        total: number;
        percentPositive: number | null;
        satisfactionScore: number | null;
    };
}

/* -------------------------------------------------------------------------- */
/* Shared UI primitives (matched to dashboard)                                 */
/* -------------------------------------------------------------------------- */

const StatCard: React.FC<{
    label: string;
    value: React.ReactNode;
    hint?: React.ReactNode;
    icon: React.ElementType;
    accent?: boolean;
}> = ({ label, value, hint, icon: Icon, accent = false }) => (
    <div className="px-4 py-3.5 rounded-lg bg-white border border-slate-900/[0.06] hover:border-slate-900/[0.12] transition-all">
        <div className="flex items-center justify-between mb-2">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {label}
            </p>
            <div
                className={cn(
                    'inline-flex items-center justify-center w-6 h-6 rounded-md',
                    accent
                        ? 'bg-indigo-600/10 text-indigo-600'
                        : 'bg-slate-900/[0.04] text-slate-700'
                )}
            >
                <Icon className="w-[13px] h-[13px]" strokeWidth={1.75} />
            </div>
        </div>
        <div className="text-[20px] leading-[1.15] font-semibold tracking-[-0.01em] text-slate-950">
            {value}
        </div>
        {hint && <div className="mt-1 text-[11.5px] text-slate-500 leading-snug">{hint}</div>}
    </div>
);

const SectionCard: React.FC<{
    title: string;
    desc?: string;
    icon: React.ElementType;
    action?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}> = ({ title, desc, icon: Icon, action, children, className }) => (
    <div
        className={cn(
            'rounded-xl border border-slate-900/[0.06] bg-white overflow-hidden',
            className
        )}
    >
        <div className="px-5 py-4 border-b border-slate-900/[0.06] flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-md bg-slate-900/[0.04] text-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-[14px] h-[14px]" strokeWidth={1.75} />
                </div>
                <div>
                    <h3 className="text-[13.5px] font-semibold tracking-tight text-slate-950">
                        {title}
                    </h3>
                    {desc && (
                        <p className="text-[12px] text-slate-500 mt-0.5 leading-snug">
                            {desc}
                        </p>
                    )}
                </div>
            </div>
            {action}
        </div>
        <div className="p-5">{children}</div>
    </div>
);

/* -------------------------------------------------------------------------- */
/* Period toggle                                                               */
/* -------------------------------------------------------------------------- */

const PeriodToggle: React.FC<{ value: Period; onChange: (p: Period) => void }> = ({
    value,
    onChange,
}) => {
    const options: { id: Period; label: string }[] = [
        { id: '7d', label: '7d' },
        { id: '30d', label: '30d' },
        { id: '90d', label: '90d' },
    ];
    return (
        <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-900/[0.04] border border-slate-900/[0.06]">
            {options.map((o) => (
                <button
                    key={o.id}
                    onClick={() => onChange(o.id)}
                    className={cn(
                        'px-3 h-7 rounded-md text-[12px] font-semibold tracking-tight transition-all',
                        value === o.id
                            ? 'bg-white text-slate-950 shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                            : 'text-slate-600 hover:text-slate-900'
                    )}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
};

/* -------------------------------------------------------------------------- */
/* Custom tooltip for charts                                                   */
/* -------------------------------------------------------------------------- */

const ChartTooltipCard = ({
    active,
    payload,
    label,
}: {
    active?: boolean;
    payload?: any[];
    label?: string;
}) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-lg border border-slate-900/[0.08] bg-white shadow-[0_12px_32px_-16px_rgba(15,23,42,0.25)] px-3 py-2 text-[11.5px]">
            {label && (
                <p className="text-slate-500 mb-1 tracking-tight font-medium">{label}</p>
            )}
            <div className="space-y-0.5">
                {payload.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                        <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: p.color }}
                        />
                        <span className="text-slate-600 capitalize">
                            {String(p.dataKey)}
                        </span>
                        <span className="ml-auto tabular-nums font-semibold text-slate-950">
                            {p.value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

const UserAnalytics = () => {
    const { currentBotId } = useBot() || {};
    const [period, setPeriod] = useState<Period>('30d');
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        getUserAnalytics(period, currentBotId ?? undefined)
            .then((res) => {
                if (!cancelled) setData(res);
            })
            .catch((err) => {
                if (!cancelled) setError(err?.message || 'Failed to load analytics');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [period, currentBotId]);

    const volumeData = useMemo(
        () =>
            (data?.chatVolumeOverTime || []).map((v) => ({
                ...v,
                date: new Date(v.date).toLocaleDateString('en-IN', {
                    month: 'short',
                    day: 'numeric',
                }),
            })),
        [data]
    );

    const tokenTotal = data
        ? data.tokenUsageBreakdown.chat +
          data.tokenUsageBreakdown.upload +
          data.tokenUsageBreakdown.scrape
        : 0;

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-5">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-md bg-rose-500/10 text-rose-600 flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-4 h-4" strokeWidth={2} />
                    </div>
                    <div>
                        <p className="text-[13px] font-semibold text-rose-900 tracking-tight">
                            Failed to load analytics
                        </p>
                        <p className="text-[12.5px] text-rose-800/80 mt-0.5">{error}</p>
                        <button
                            onClick={() => setPeriod('30d')}
                            className="mt-3 inline-flex items-center gap-1.5 h-7 px-3 rounded-md bg-white border border-rose-200 text-[12px] font-semibold text-rose-900 hover:bg-rose-100 transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const d = data!;
    const sat = d.satisfactionScore.satisfactionScore;

    return (
        <div className="space-y-7">
            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600 mb-2">
                        <span className="w-6 h-px bg-indigo-600" /> Insights
                    </div>
                    <h1 className="text-3xl sm:text-[34px] font-semibold tracking-[-0.02em] text-slate-950 leading-[1.05]">
                        Analytics
                    </h1>
                    <p className="mt-2 text-[13.5px] text-slate-600">
                        Chat volume, token usage and satisfaction — over the last{' '}
                        {period === '7d' ? '7' : period === '30d' ? '30' : '90'} days.
                    </p>
                </div>
                <PeriodToggle value={period} onChange={setPeriod} />
            </div>

            {/* Stat row */}
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Conversations"
                    value={d.totalConversations.toLocaleString()}
                    hint="Total sessions"
                    icon={MessageSquare}
                    accent
                />
                <StatCard
                    label="Messages"
                    value={d.totalMessages.toLocaleString()}
                    hint="In selected period"
                    icon={BarChart2}
                />
                <StatCard
                    label="Unique visitors"
                    value={d.uniqueVisitors.toLocaleString()}
                    hint="Distinct end users"
                    icon={Users}
                />
                <StatCard
                    label="Satisfaction"
                    value={sat != null ? `${sat}%` : '—'}
                    hint={
                        d.satisfactionScore.total > 0
                            ? `${d.satisfactionScore.positive} 👍 / ${d.satisfactionScore.negative} 👎`
                            : 'No feedback yet'
                    }
                    icon={ThumbsUp}
                />
            </div>

            {/* Chat volume */}
            <SectionCard
                title="Chat volume over time"
                desc="Conversations and messages per day."
                icon={TrendingUp}
            >
                {volumeData.length === 0 ? (
                    <div className="py-10 text-center">
                        <p className="text-[12.5px] text-slate-500">
                            No activity in this period yet.
                        </p>
                    </div>
                ) : (
                    <div className="h-[280px] w-full -ml-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={volumeData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gradConv" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.25} />
                                        <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gradMsg" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.18} />
                                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid
                                    stroke="rgba(15,23,42,0.06)"
                                    strokeDasharray="3 3"
                                    vertical={false}
                                />
                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: '#64748b', fontSize: 11 }}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: '#64748b', fontSize: 11 }}
                                    width={30}
                                />
                                <Tooltip
                                    content={<ChartTooltipCard />}
                                    cursor={{ stroke: 'rgba(15,23,42,0.15)', strokeWidth: 1 }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="conversations"
                                    stroke="#4f46e5"
                                    strokeWidth={2}
                                    fill="url(#gradConv)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="messages"
                                    stroke="#8b5cf6"
                                    strokeWidth={2}
                                    fill="url(#gradMsg)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
                <div className="flex items-center gap-4 mt-2 pt-3 border-t border-slate-900/[0.06]">
                    <span className="inline-flex items-center gap-1.5 text-[11.5px] text-slate-600 font-medium">
                        <span className="w-2 h-2 rounded-full bg-indigo-600" />
                        Conversations
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[11.5px] text-slate-600 font-medium">
                        <span className="w-2 h-2 rounded-full bg-violet-500" />
                        Messages
                    </span>
                </div>
            </SectionCard>

            {/* Two column: token usage + lead capture */}
            <div className="grid gap-5 lg:grid-cols-2">
                <SectionCard
                    title="Token usage breakdown"
                    desc="Where your credits were spent."
                    icon={Zap}
                >
                    {tokenTotal === 0 ? (
                        <p className="text-[12.5px] text-slate-500 py-6 text-center">
                            No usage recorded in this period.
                        </p>
                    ) : (
                        <div className="space-y-3.5">
                            {[
                                {
                                    key: 'chat',
                                    label: 'Chat',
                                    value: d.tokenUsageBreakdown.chat,
                                    color: 'bg-indigo-500',
                                    track: 'bg-indigo-500/10',
                                },
                                {
                                    key: 'upload',
                                    label: 'Upload',
                                    value: d.tokenUsageBreakdown.upload,
                                    color: 'bg-violet-500',
                                    track: 'bg-violet-500/10',
                                },
                                {
                                    key: 'scrape',
                                    label: 'Scrape',
                                    value: d.tokenUsageBreakdown.scrape,
                                    color: 'bg-amber-500',
                                    track: 'bg-amber-500/10',
                                },
                            ].map((row) => {
                                const pct = tokenTotal ? (row.value / tokenTotal) * 100 : 0;
                                return (
                                    <div key={row.key}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={cn(
                                                        'w-1.5 h-1.5 rounded-full',
                                                        row.color
                                                    )}
                                                />
                                                <span className="text-[12.5px] font-medium tracking-tight text-slate-700">
                                                    {row.label}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="tabular-nums text-[12px] text-slate-500">
                                                    {pct.toFixed(0)}%
                                                </span>
                                                <span className="tabular-nums text-[12.5px] font-semibold text-slate-900">
                                                    {row.value.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div
                                            className={cn(
                                                'h-1.5 rounded-full overflow-hidden',
                                                row.track
                                            )}
                                        >
                                            <div
                                                className={cn('h-full rounded-full', row.color)}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </SectionCard>

                <SectionCard
                    title="Lead capture"
                    desc="Visitors who turned into leads."
                    icon={Users}
                >
                    <div className="flex items-baseline gap-2">
                        <span className="text-[32px] font-semibold tracking-[-0.02em] text-slate-950 leading-none">
                            {d.leadConversion.conversionRate}%
                        </span>
                        <span className="text-[11.5px] text-slate-500">conversion</span>
                    </div>
                    <p className="mt-2 text-[12.5px] text-slate-600 leading-snug">
                        <span className="font-semibold text-slate-900">
                            {d.leadConversion.leadsCaptured}
                        </span>{' '}
                        leads captured from{' '}
                        <span className="font-semibold text-slate-900">
                            {d.leadConversion.totalConversations}
                        </span>{' '}
                        conversations.
                    </p>
                    <div className="mt-4 h-1.5 rounded-full bg-slate-900/[0.04] overflow-hidden">
                        <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{
                                width: `${Math.min(100, d.leadConversion.conversionRate)}%`,
                            }}
                        />
                    </div>
                </SectionCard>
            </div>

            {/* Peak hours */}
            <SectionCard
                title="Peak hours"
                desc="When your bot is busiest (hour of day, UTC)."
                icon={Clock}
            >
                <div className="h-[220px] w-full -ml-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={d.peakHoursHeatmap}
                            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                        >
                            <CartesianGrid
                                stroke="rgba(15,23,42,0.06)"
                                strokeDasharray="3 3"
                                vertical={false}
                            />
                            <XAxis
                                dataKey="hour"
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(h) => `${h}`}
                                tick={{ fill: '#64748b', fontSize: 11 }}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                tick={{ fill: '#64748b', fontSize: 11 }}
                                width={30}
                            />
                            <Tooltip
                                content={<ChartTooltipCard />}
                                cursor={{ fill: 'rgba(79,70,229,0.06)' }}
                            />
                            <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </SectionCard>

            {/* Two column: most asked + unanswered/escalated */}
            <div className="grid gap-5 lg:grid-cols-2">
                <SectionCard
                    title="Most asked questions"
                    desc="Top user questions in this period."
                    icon={HelpCircle}
                >
                    {d.mostAskedQuestions.length === 0 ? (
                        <p className="text-[12.5px] text-slate-500 py-6 text-center">
                            No questions recorded yet.
                        </p>
                    ) : (
                        <ul className="divide-y divide-slate-900/[0.06] -mx-5">
                            {d.mostAskedQuestions.slice(0, 8).map((q, i) => (
                                <li
                                    key={i}
                                    className="px-5 py-2.5 flex items-start justify-between gap-4"
                                >
                                    <div className="flex items-start gap-2.5 min-w-0">
                                        <span className="mt-[2px] w-4 h-4 rounded-full bg-slate-900/[0.05] text-slate-600 text-[10px] font-semibold flex items-center justify-center flex-shrink-0 tabular-nums">
                                            {i + 1}
                                        </span>
                                        <span className="text-[13px] text-slate-800 leading-snug line-clamp-2">
                                            {q.question}
                                        </span>
                                    </div>
                                    <span className="tabular-nums text-[12px] font-semibold text-slate-600 bg-slate-900/[0.04] px-1.5 py-0.5 rounded flex-shrink-0">
                                        {q.count}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </SectionCard>

                <SectionCard
                    title="Needs attention"
                    desc="Unanswered or escalated conversations."
                    icon={AlertCircle}
                    action={
                        d.unansweredEscalated.sampleEscalated.length > 0 ||
                        d.unansweredEscalated.sampleUnanswered.length > 0 ? (
                            <button
                                onClick={() => navigate('/user/conversations')}
                                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-white border border-slate-900/[0.08] text-[11.5px] font-semibold text-slate-700 hover:text-slate-950 hover:border-slate-900/20 transition-colors"
                            >
                                View
                                <ArrowRight className="w-3 h-3" strokeWidth={2} />
                            </button>
                        ) : null
                    }
                >
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border border-slate-900/[0.06] bg-white px-4 py-3">
                            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-1.5">
                                Escalated
                            </p>
                            <div className="text-[22px] font-semibold tracking-[-0.01em] text-slate-950 leading-none">
                                {d.unansweredEscalated.escalatedCount}
                            </div>
                            <p className="text-[11.5px] text-slate-500 mt-1.5">
                                Handed to human support
                            </p>
                        </div>
                        <div
                            className={cn(
                                'rounded-lg border px-4 py-3',
                                d.unansweredEscalated.unansweredCount > 0
                                    ? 'border-amber-300/60 bg-amber-50/40'
                                    : 'border-slate-900/[0.06] bg-white'
                            )}
                        >
                            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-1.5">
                                Unanswered
                            </p>
                            <div
                                className={cn(
                                    'text-[22px] font-semibold tracking-[-0.01em] leading-none',
                                    d.unansweredEscalated.unansweredCount > 0
                                        ? 'text-amber-700'
                                        : 'text-slate-950'
                                )}
                            >
                                {d.unansweredEscalated.unansweredCount}
                            </div>
                            <p className="text-[11.5px] text-slate-500 mt-1.5">
                                Bot couldn't answer
                            </p>
                        </div>
                    </div>
                </SectionCard>
            </div>

            {/* Response time */}
            {d.avgResponseTimeMs != null && (
                <SectionCard
                    title="Average response time"
                    desc="Time from user message to bot reply."
                    icon={Gauge}
                >
                    <div className="flex items-baseline gap-2">
                        <span className="text-[32px] font-semibold tracking-[-0.02em] text-slate-950 leading-none">
                            {d.avgResponseTimeMs < 1000
                                ? d.avgResponseTimeMs
                                : (d.avgResponseTimeMs / 1000).toFixed(1)}
                        </span>
                        <span className="text-[13px] text-slate-500">
                            {d.avgResponseTimeMs < 1000 ? 'ms' : 'seconds'}
                        </span>
                    </div>
                    <p className="mt-2 text-[12px] text-slate-500">
                        {d.avgResponseTimeMs < 1500
                            ? 'Excellent — well under the 2s benchmark.'
                            : d.avgResponseTimeMs < 3000
                            ? 'Healthy response time.'
                            : 'Consider optimising knowledge-base size.'}
                    </p>
                </SectionCard>
            )}
        </div>
    );
};

export default UserAnalytics;

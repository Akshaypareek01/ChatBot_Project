/**
 * Per-flow analytics tab in the right-side panel.
 *
 * Shows three KPI tiles (total runs, completion rate, avg nodes visited) and
 * a sortable table of nodes with visits / drop-off rate / drop-off bars.
 * Clicking a row centers the canvas on that node so the author can see
 * exactly where visitors are leaving.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    BarChart3,
    CheckCircle2,
    RefreshCw,
    TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getFlowAnalytics } from '@/services/api';
import type { FlowAnalyticsResult } from '../types';

type Period = '7d' | '30d' | '90d';

type Props = {
    flowId: string | null;
    /** Click a node row → center the canvas on it. */
    onSelectNode?: (nodeId: string) => void;
};

const PERIOD_LABELS: Record<Period, string> = {
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
    '90d': 'Last 90 days',
};

export default function AnalyticsPanel({ flowId, onSelectNode }: Props) {
    const [period, setPeriod] = useState<Period>('30d');
    const [data, setData] = useState<FlowAnalyticsResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Refresh from the backend. Idempotent — safe to call on tab open and on
     * period changes. Bails early if no flowId yet (e.g. fresh page load).
     */
    const refresh = async () => {
        if (!flowId) return;
        setLoading(true);
        setError(null);
        try {
            const r = await getFlowAnalytics(flowId, { period });
            setData(r as FlowAnalyticsResult);
        } catch (e: any) {
            setError(
                e?.response?.data?.message ||
                    e?.message ||
                    'Failed to load analytics'
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [flowId, period]);

    return (
        <div className="h-full flex flex-col">
            <div className="px-4 py-3 border-b border-slate-900/[0.06] flex items-center gap-2 flex-wrap">
                <PeriodPicker value={period} onChange={setPeriod} />
                <button
                    type="button"
                    onClick={refresh}
                    disabled={loading || !flowId}
                    className="ml-auto inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-white border border-slate-900/[0.08] text-[11.5px] font-semibold text-slate-700 hover:text-slate-950 hover:border-slate-900/20 transition-colors disabled:opacity-60"
                >
                    <RefreshCw
                        className={cn(
                            'w-3 h-3',
                            loading && 'animate-spin'
                        )}
                        strokeWidth={2}
                    />
                    Refresh
                </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
                {!flowId ? (
                    <EmptyState message="Pick a flow to see its analytics." />
                ) : error ? (
                    <ErrorState message={error} onRetry={refresh} />
                ) : !data ? (
                    <EmptyState message={loading ? 'Loading…' : 'No data yet.'} />
                ) : data.totalRuns === 0 ? (
                    <ZeroRunsState period={period} />
                ) : (
                    <AnalyticsBody data={data} onSelectNode={onSelectNode} />
                )}
            </div>
        </div>
    );
}

const PeriodPicker: React.FC<{
    value: Period;
    onChange: (next: Period) => void;
}> = ({ value, onChange }) => (
    <div className="inline-flex items-center p-0.5 bg-slate-900/[0.05] rounded-md">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
                key={p}
                type="button"
                onClick={() => onChange(p)}
                className={cn(
                    'h-7 px-2.5 rounded text-[11.5px] font-semibold transition-colors',
                    value === p
                        ? 'bg-white text-slate-950 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                )}
            >
                {p.toUpperCase()}
            </button>
        ))}
    </div>
);

const AnalyticsBody: React.FC<{
    data: FlowAnalyticsResult;
    onSelectNode?: (nodeId: string) => void;
}> = ({ data, onSelectNode }) => {
    const sortedNodes = useMemo(
        () => [...data.perNode].sort((a, b) => b.visits - a.visits),
        [data]
    );

    return (
        <div className="p-4 space-y-4">
            <div className="grid grid-cols-3 gap-2">
                <KpiTile
                    label="Total runs"
                    value={String(data.totalRuns)}
                    icon={<BarChart3 className="w-3.5 h-3.5" strokeWidth={2} />}
                />
                <KpiTile
                    label="Completion"
                    value={`${data.completionRate}%`}
                    sub={`${data.completedRuns} done`}
                    tone={
                        data.completionRate >= 60
                            ? 'good'
                            : data.completionRate >= 30
                            ? 'warn'
                            : 'bad'
                    }
                    icon={<CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2} />}
                />
                <KpiTile
                    label="Avg steps"
                    value={String(data.avgNodesVisited)}
                    sub="per run"
                />
            </div>

            <div>
                <div className="flex items-center justify-between mb-1.5">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Per-node performance
                    </h3>
                    <span className="text-[10.5px] text-slate-400">
                        {sortedNodes.length} node
                        {sortedNodes.length === 1 ? '' : 's'}
                    </span>
                </div>
                <ul className="space-y-1.5">
                    {sortedNodes.map((n) => (
                        <NodeRow
                            key={n.nodeId}
                            node={n}
                            totalRuns={data.totalRuns}
                            onClick={
                                onSelectNode
                                    ? () => onSelectNode(n.nodeId)
                                    : undefined
                            }
                        />
                    ))}
                </ul>
            </div>
        </div>
    );
};

const KpiTile: React.FC<{
    label: string;
    value: string;
    sub?: string;
    icon?: React.ReactNode;
    tone?: 'good' | 'warn' | 'bad' | 'neutral';
}> = ({ label, value, sub, icon, tone = 'neutral' }) => {
    const tones: Record<string, string> = {
        good: 'text-emerald-700 bg-emerald-50 border-emerald-200/60',
        warn: 'text-amber-700 bg-amber-50 border-amber-200/60',
        bad: 'text-rose-700 bg-rose-50 border-rose-200/60',
        neutral: 'text-slate-700 bg-white border-slate-900/[0.08]',
    };
    return (
        <div
            className={cn(
                'rounded-lg border px-2.5 py-2',
                tones[tone] || tones.neutral
            )}
        >
            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] opacity-80">
                {icon}
                {label}
            </div>
            <div className="mt-1 text-[18px] font-semibold tracking-tight leading-none">
                {value}
            </div>
            {sub ? (
                <div className="mt-0.5 text-[10.5px] opacity-75">{sub}</div>
            ) : null}
        </div>
    );
};

const NodeRow: React.FC<{
    node: FlowAnalyticsResult['perNode'][number];
    totalRuns: number;
    onClick?: () => void;
}> = ({ node, totalRuns, onClick }) => {
    const visitPct =
        totalRuns > 0 ? Math.round((100 * node.visits) / totalRuns) : 0;
    const hasDropOff = node.dropOffs > 0 && !node.isEnd;

    return (
        <li>
            <button
                type="button"
                onClick={onClick}
                className={cn(
                    'w-full text-left rounded-md border border-slate-900/[0.06] bg-white px-2.5 py-2 hover:border-slate-900/15 hover:bg-slate-900/[0.02] transition-colors',
                    !onClick && 'cursor-default'
                )}
            >
                <div className="flex items-center gap-2 min-w-0">
                    <span
                        className={cn(
                            'inline-flex items-center h-4 px-1.5 rounded-full text-[9px] font-bold uppercase tracking-[0.1em] flex-shrink-0',
                            node.isStart
                                ? 'bg-indigo-100 text-indigo-800'
                                : node.isEnd
                                ? 'bg-slate-200 text-slate-700'
                                : 'bg-slate-100 text-slate-600'
                        )}
                    >
                        {node.isStart ? 'Start' : node.isEnd ? 'End' : node.nodeType}
                    </span>
                    <span className="text-[12px] font-medium text-slate-900 truncate flex-1">
                        {node.title || node.nodeId}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-700 flex-shrink-0">
                        {node.visits}
                    </span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-slate-900/[0.05] overflow-hidden relative">
                    <div
                        className="absolute inset-y-0 left-0 bg-indigo-500/70"
                        style={{ width: `${Math.min(100, visitPct)}%` }}
                    />
                </div>
                <div className="mt-1 flex items-center gap-3 text-[10.5px]">
                    <span className="text-slate-500">
                        {visitPct}% of runs
                    </span>
                    {hasDropOff ? (
                        <span className="inline-flex items-center gap-0.5 text-rose-700 font-semibold">
                            <TrendingDown
                                className="w-2.5 h-2.5"
                                strokeWidth={2.5}
                            />
                            {node.dropOffRate}% drop-off
                        </span>
                    ) : node.isEnd && node.visits > 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-emerald-700 font-semibold">
                            <CheckCircle2
                                className="w-2.5 h-2.5"
                                strokeWidth={2.5}
                            />
                            Completion node
                        </span>
                    ) : null}
                </div>
            </button>
        </li>
    );
};

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
    <div className="px-6 py-12 text-center text-[12.5px] text-slate-500">
        {message}
    </div>
);

const ErrorState: React.FC<{ message: string; onRetry: () => void }> = ({
    message,
    onRetry,
}) => (
    <div className="px-6 py-10 text-center">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-rose-50 text-rose-600 mb-2">
            <AlertTriangle className="w-4 h-4" strokeWidth={2} />
        </div>
        <p className="text-[13px] font-semibold text-slate-900">
            Couldn't load analytics
        </p>
        <p className="mt-1 text-[12px] text-slate-500">{message}</p>
        <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-white border border-slate-900/[0.08] text-[12px] font-semibold text-slate-700 hover:text-slate-950 hover:border-slate-900/20 transition-colors"
        >
            <RefreshCw className="w-3 h-3" strokeWidth={2} />
            Try again
        </button>
    </div>
);

const ZeroRunsState: React.FC<{ period: Period }> = ({ period }) => (
    <div className="px-6 py-12 text-center">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-900/[0.04] text-slate-400 mb-2">
            <BarChart3 className="w-4 h-4" strokeWidth={2} />
        </div>
        <p className="text-[13px] font-semibold text-slate-900">
            No runs yet
        </p>
        <p className="mt-1 text-[12px] text-slate-500 max-w-[260px] mx-auto">
            Nothing executed in the {PERIOD_LABELS[period].toLowerCase()}.
            Publish & activate the flow, then watch the funnel light up here.
        </p>
    </div>
);

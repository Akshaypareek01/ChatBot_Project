/**
 * ValidationPanel — runs POST /users/flows/:id/validate against either the
 * draft or the published copy and renders the linter report grouped by
 * severity. Each issue is click-to-jump: clicking jumps to the offending
 * node on the canvas (parent owns the selection callback).
 *
 * The author re-runs validation manually with the "Run validation" button,
 * which keeps the canvas snappy (no debounced API call on every keystroke).
 */

import React, { useState } from 'react';
import { toast } from 'sonner';
import {
    AlertTriangle,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Play,
    Crosshair,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { validateFlow } from '@/services/api';
import type { ValidationIssue, ValidationReport } from '../types';

type Stage = 'draft' | 'published';

type Props = {
    flowId: string | null;
    /** Latest report supplied by the parent (we keep the parent in sync so
     *  ChatFlows can mirror error count in the toolbar). */
    report: ValidationReport | null;
    onReport: (next: ValidationReport | null) => void;
    onSelectNode: (nodeId: string) => void;
};

/**
 * ValidationPanel runs the server-side linter and renders an inspector-style
 * list of issues with jump-to-node click targets.
 */
export default function ValidationPanel({
    flowId,
    report,
    onReport,
    onSelectNode,
}: Props) {
    const [busy, setBusy] = useState(false);
    const [stage, setStage] = useState<Stage>('draft');

    const run = async (next: Stage = stage) => {
        if (!flowId) return;
        setBusy(true);
        setStage(next);
        try {
            const result: ValidationReport = await validateFlow(flowId, { stage: next });
            onReport(result);
            if (result.ok) {
                toast.success('No issues found');
            }
        } catch (e: any) {
            toast.error(e?.response?.data?.message || e?.message || 'Validation failed');
        } finally {
            setBusy(false);
        }
    };

    const errors = report?.errors ?? [];
    const warnings = report?.warnings ?? [];

    return (
        <div className="h-full flex flex-col">
            <div className="px-3 py-2.5 border-b border-slate-900/[0.04] flex items-center gap-2 flex-shrink-0">
                <StageToggle stage={stage} onChange={(s) => run(s)} disabled={busy || !flowId} />
                <button
                    type="button"
                    onClick={() => run()}
                    disabled={busy || !flowId}
                    className="ml-auto inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-slate-900 text-white text-[11.5px] font-semibold hover:bg-slate-800 transition-colors disabled:opacity-60"
                >
                    {busy ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                        <Play className="w-3 h-3" strokeWidth={2.5} />
                    )}
                    Run validation
                </button>
            </div>

            <div className="flex-1 min-h-0 overflow-auto p-3 space-y-3">
                {!report && !busy && <Hint />}
                {busy && (
                    <div className="py-8 text-center text-slate-500 text-[12px] inline-flex items-center justify-center gap-2 w-full">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Running checks…
                    </div>
                )}

                {report && (
                    <>
                        <Summary report={report} />
                        {errors.length > 0 && (
                            <Group
                                title="Errors"
                                tone="error"
                                items={errors}
                                onSelectNode={onSelectNode}
                            />
                        )}
                        {warnings.length > 0 && (
                            <Group
                                title="Warnings"
                                tone="warning"
                                items={warnings}
                                onSelectNode={onSelectNode}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

const Hint: React.FC = () => (
    <div className="text-center py-10 text-slate-500">
        <div className="text-[13px] font-semibold text-slate-700">
            Validate before you publish
        </div>
        <p className="text-[12px] mt-1.5 max-w-[280px] mx-auto">
            We check for missing nodes, broken next-pointers, undefined
            variables, unsafe URLs, unused secrets, and reachability cycles.
        </p>
    </div>
);

const Summary: React.FC<{ report: ValidationReport }> = ({ report }) => {
    if (report.ok) {
        return (
            <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/50 px-3 py-2.5 inline-flex items-center gap-2 w-full">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" strokeWidth={2.25} />
                <div className="flex flex-col">
                    <span className="text-[12.5px] font-semibold text-emerald-900">
                        Flow looks good
                    </span>
                    <span className="text-[11px] text-emerald-800/80">
                        {report.nodeCount ?? 0} node
                        {(report.nodeCount ?? 0) === 1 ? '' : 's'} checked.
                    </span>
                </div>
            </div>
        );
    }
    return (
        <div className="rounded-lg border border-amber-200/70 bg-amber-50/50 px-3 py-2.5 inline-flex items-center gap-2 w-full">
            <AlertTriangle className="w-4 h-4 text-amber-700" strokeWidth={2.25} />
            <div className="flex flex-col text-[12px]">
                <span className="font-semibold text-amber-900">
                    {report.errors.length} error
                    {report.errors.length === 1 ? '' : 's'},{' '}
                    {report.warnings.length} warning
                    {report.warnings.length === 1 ? '' : 's'}
                </span>
                <span className="text-[11px] text-amber-800/80">
                    Resolve all errors before publishing.
                </span>
            </div>
        </div>
    );
};

const Group: React.FC<{
    title: string;
    tone: 'error' | 'warning';
    items: ValidationIssue[];
    onSelectNode: (id: string) => void;
}> = ({ title, tone, items, onSelectNode }) => (
    <div>
        <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-slate-500 mb-1.5 px-1 inline-flex items-center gap-1.5">
            {tone === 'error' ? (
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            )}
            {title} <span className="text-slate-400">({items.length})</span>
        </div>
        <ul className="space-y-1.5">
            {items.map((iss, i) => (
                <IssueRow key={`${iss.code}-${i}`} issue={iss} tone={tone} onSelectNode={onSelectNode} />
            ))}
        </ul>
    </div>
);

const IssueRow: React.FC<{
    issue: ValidationIssue;
    tone: 'error' | 'warning';
    onSelectNode: (id: string) => void;
}> = ({ issue, tone, onSelectNode }) => {
    const tones = {
        error: 'border-rose-200/70 bg-rose-50/40 hover:bg-rose-50/80',
        warning: 'border-amber-200/70 bg-amber-50/40 hover:bg-amber-50/80',
    } as const;
    return (
        <li
            className={cn(
                'group rounded-md border px-2.5 py-2 transition-colors cursor-pointer',
                tones[tone]
            )}
            onClick={() => issue.nodeId && onSelectNode(issue.nodeId)}
        >
            <div className="flex items-start gap-2">
                <span
                    className={cn(
                        'inline-flex items-center justify-center mt-0.5 px-1.5 h-[18px] rounded-md font-mono text-[10px] font-semibold',
                        tone === 'error'
                            ? 'bg-rose-600/10 text-rose-700'
                            : 'bg-amber-600/10 text-amber-800'
                    )}
                >
                    {issue.code}
                </span>
                <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] text-slate-900 leading-snug">
                        {issue.message}
                    </p>
                    {(issue.nodeId || issue.path) && (
                        <p className="text-[10.5px] mt-0.5 text-slate-500 font-mono truncate">
                            {issue.nodeId ? `node: ${issue.nodeId}` : ''}
                            {issue.nodeId && issue.path ? ' · ' : ''}
                            {issue.path ? `path: ${issue.path}` : ''}
                        </p>
                    )}
                </div>
                {issue.nodeId && (
                    <Crosshair className="w-3.5 h-3.5 text-slate-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
            </div>
        </li>
    );
};

const StageToggle: React.FC<{
    stage: Stage;
    onChange: (next: Stage) => void;
    disabled?: boolean;
}> = ({ stage, onChange, disabled }) => (
    <div
        className={cn(
            'inline-flex items-center p-0.5 bg-slate-900/[0.05] rounded-md',
            disabled && 'opacity-60 pointer-events-none'
        )}
    >
        {(['draft', 'published'] as const).map((s) => (
            <button
                key={s}
                type="button"
                onClick={() => onChange(s)}
                className={cn(
                    'h-6 px-2 rounded text-[11px] font-semibold capitalize transition-colors',
                    stage === s
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                )}
            >
                {s}
            </button>
        ))}
    </div>
);

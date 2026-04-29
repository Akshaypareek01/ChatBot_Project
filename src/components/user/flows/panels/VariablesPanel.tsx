/**
 * VariablesPanel — surfaces the implicit + explicit vocabulary of a flow.
 *
 * Three sources of variable names:
 *   1. Declared (FlowDocument.variables[])     — author opted in with a
 *                                                 default value / scope.
 *   2. Written  (capture / set_variable / API responseMap)
 *   3. Read     (any `{{vars.x}}` interpolation, plus the routing predicates)
 *
 * The panel cross-references all three so authors can spot:
 *   - variables read but never written  (broken)
 *   - variables written but never read  (dead)
 *   - hot variables (most write/read sites)
 */

import React, { useMemo } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FlowDocument, FlowNode } from '../types';

type Props = {
    flow: FlowDocument;
    onSelectNode: (nodeId: string) => void;
};

type Usage = {
    name: string;
    declared: boolean;
    writers: { nodeId: string; nodeTitle: string; via: string }[];
    readers: { nodeId: string; nodeTitle: string; field: string }[];
};

/**
 * VariablesPanel shows all variables ever referenced in the flow, plus
 * who writes/reads them, so authors can audit the data model at a glance.
 */
export default function VariablesPanel({ flow, onSelectNode }: Props) {
    const usages = useMemo(() => analyzeVariables(flow), [flow]);

    if (usages.length === 0) {
        return (
            <div className="p-5 h-full overflow-auto">
                <Empty />
            </div>
        );
    }

    return (
        <div className="h-full overflow-auto p-3 space-y-2">
            <p className="text-[11.5px] text-slate-500 px-1 mb-1">
                Variables referenced anywhere in this flow. Click a writer or
                reader to jump to that node.
            </p>
            {usages.map((u) => (
                <VariableRow key={u.name} usage={u} onSelect={onSelectNode} />
            ))}
        </div>
    );
}

const VariableRow: React.FC<{ usage: Usage; onSelect: (id: string) => void }> = ({
    usage,
    onSelect,
}) => {
    const orphan = usage.readers.length > 0 && usage.writers.length === 0 && !usage.declared;
    const dead = usage.writers.length > 0 && usage.readers.length === 0;
    return (
        <div className="rounded-lg border border-slate-900/[0.06] bg-white">
            <div className="px-3 py-2 flex items-center gap-2 border-b border-slate-900/[0.04]">
                <code
                    className={cn(
                        'text-[12px] font-mono font-semibold tracking-tight',
                        orphan ? 'text-rose-700' : 'text-slate-900'
                    )}
                >
                    {usage.name}
                </code>
                {usage.declared && (
                    <span className="text-[10px] uppercase tracking-[0.1em] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                        declared
                    </span>
                )}
                {orphan && (
                    <span className="ml-auto inline-flex items-center gap-1 text-[10.5px] font-semibold text-rose-700">
                        <AlertTriangle className="w-3 h-3" />
                        no writer
                    </span>
                )}
                {dead && !orphan && (
                    <span className="ml-auto text-[10.5px] font-semibold text-slate-400">
                        unused
                    </span>
                )}
            </div>
            <div className="px-3 py-2 space-y-1.5">
                {usage.writers.length > 0 && (
                    <div>
                        <div className="text-[10px] uppercase tracking-[0.12em] font-semibold text-slate-400 mb-1 inline-flex items-center gap-1">
                            <ArrowDownToLine className="w-3 h-3" /> Writers
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {usage.writers.map((w, i) => (
                                <button
                                    key={`${w.nodeId}-${i}`}
                                    type="button"
                                    onClick={() => onSelect(w.nodeId)}
                                    className="inline-flex items-center gap-1.5 h-6 px-2 rounded-md bg-slate-900/[0.04] hover:bg-slate-900/[0.08] text-[11px] text-slate-700 transition-colors"
                                >
                                    <span className="font-medium">{w.nodeTitle}</span>
                                    <span className="text-slate-400">· {w.via}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {usage.readers.length > 0 && (
                    <div>
                        <div className="text-[10px] uppercase tracking-[0.12em] font-semibold text-slate-400 mb-1 inline-flex items-center gap-1">
                            <ArrowUpFromLine className="w-3 h-3" /> Readers
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {usage.readers.map((r, i) => (
                                <button
                                    key={`${r.nodeId}-${i}`}
                                    type="button"
                                    onClick={() => onSelect(r.nodeId)}
                                    className="inline-flex items-center gap-1.5 h-6 px-2 rounded-md bg-slate-900/[0.04] hover:bg-slate-900/[0.08] text-[11px] text-slate-700 transition-colors"
                                >
                                    <span className="font-medium">{r.nodeTitle}</span>
                                    <span className="text-slate-400">· {r.field}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const Empty: React.FC = () => (
    <div className="text-center py-10 text-slate-500">
        <div className="text-[14px] font-semibold text-slate-700">
            No variables yet
        </div>
        <p className="text-[12px] mt-1.5 max-w-[260px] mx-auto">
            Add a Capture node, a Set Variable node, or an API response map
            to start collecting data, then reference it as{' '}
            <code className="px-1 py-0.5 rounded bg-slate-900/[0.05] font-mono text-[11px]">
                {'{{vars.name}}'}
            </code>
            .
        </p>
    </div>
);

// ---------------------------------------------------------------------------

const VAR_RE = /\{\{\s*vars\.([a-zA-Z0-9_]+)/g;

/** Walk the flow and collect writers + readers for every variable name. */
function analyzeVariables(flow: FlowDocument): Usage[] {
    const map = new Map<string, Usage>();

    const ensure = (name: string): Usage => {
        if (!map.has(name)) {
            map.set(name, {
                name,
                declared: false,
                writers: [],
                readers: [],
            });
        }
        return map.get(name)!;
    };

    flow.variables?.forEach((v) => {
        if (v?.name) ensure(v.name).declared = true;
    });

    flow.nodes.forEach((n) => collectFromNode(n, ensure));

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function collectFromNode(n: FlowNode, ensure: (name: string) => Usage) {
    const nodeTitle = n.title || titleFor(n);

    if (n.type === 'capture' && n.capture?.variable) {
        ensure(n.capture.variable).writers.push({
            nodeId: n.id,
            nodeTitle,
            via: 'capture',
        });
    }
    if (n.type === 'set_variable' && n.setVariable?.variable) {
        ensure(n.setVariable.variable).writers.push({
            nodeId: n.id,
            nodeTitle,
            via: 'set',
        });
    }
    if (n.type === 'action_api' && Array.isArray(n.apiAction?.responseMap)) {
        n.apiAction!.responseMap!.forEach((r) => {
            if (r.variable) {
                ensure(r.variable).writers.push({
                    nodeId: n.id,
                    nodeTitle,
                    via: 'api response',
                });
            }
        });
    }
    if (n.type === 'branch' && Array.isArray(n.branch?.conditions)) {
        n.branch!.conditions!.forEach((c) => {
            if (c.variable) {
                ensure(c.variable).readers.push({
                    nodeId: n.id,
                    nodeTitle,
                    field: 'branch condition',
                });
            }
        });
    }

    const stringFields: { val?: string | null; label: string }[] = [
        { val: n.text ?? null, label: 'text' },
        { val: n.aiInstructions ?? null, label: 'AI instructions' },
    ];
    if (n.type === 'action_api') {
        stringFields.push(
            { val: n.apiAction?.url ?? null, label: 'API url' },
            { val: n.apiAction?.body ?? null, label: 'API body' }
        );
    }
    if (n.type === 'set_variable') {
        stringFields.push({ val: n.setVariable?.value ?? null, label: 'value' });
    }

    stringFields.forEach((f) => {
        if (typeof f.val !== 'string') return;
        VAR_RE.lastIndex = 0;
        let m: RegExpExecArray | null;
        const seen = new Set<string>();
        while ((m = VAR_RE.exec(f.val)) !== null) {
            const name = m[1];
            if (!name || seen.has(name)) continue;
            seen.add(name);
            ensure(name).readers.push({
                nodeId: n.id,
                nodeTitle,
                field: f.label,
            });
        }
    });
}

function titleFor(n: FlowNode): string {
    return n.type.replace(/_/g, ' ');
}

/**
 * TestSandbox — interactive dry-run for the current flow.
 *
 * The author types a visitor message, we POST every accumulated message to
 * `/users/flows/:id/test` and re-render the entire transcript. We re-run from
 * scratch on each send so the engine stays fully deterministic and the
 * server doesn't have to keep a per-session sandbox alive.
 *
 * Renders:
 *   - bot/visitor bubbles (text, ai, buttons, cards, link, typing, error)
 *   - inline node trace (which node executed each turn)
 *   - "Variables" inspector showing the post-final-turn state
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Play, RotateCcw, Send, Bot, User, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { testFlow } from '@/services/api';
import type { TestRunResult, TestTurn, TestChunk } from '../types';

type Stage = 'draft' | 'published';
type Mode = 'mock' | 'live';

type Props = {
    flowId: string | null;
    /** Last successful run's final state -> drives the variables inspector. */
    onSelectNode?: (nodeId: string) => void;
};

export default function TestSandbox({ flowId, onSelectNode }: Props) {
    const [messages, setMessages] = useState<string[]>([]);
    const [draft, setDraft] = useState('');
    const [stage, setStage] = useState<Stage>('draft');
    const [mode, setMode] = useState<Mode>('mock');
    const [busy, setBusy] = useState(false);
    const [run, setRun] = useState<TestRunResult | null>(null);
    const [autoRanInitial, setAutoRanInitial] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    /** Re-run when anything that changes the engine output changes. */
    const fire = async (msgs: string[]) => {
        if (!flowId) return;
        setBusy(true);
        try {
            const result = await testFlow(flowId, {
                messages: msgs,
                stage,
                mode,
            });
            setRun(result);
        } catch (e: any) {
            toast.error(
                e?.response?.data?.message || e?.message || 'Test failed'
            );
        } finally {
            setBusy(false);
        }
    };

    // Initial auto-play: walk from the start node so the author sees the
    // welcome chunks even before typing anything.
    useEffect(() => {
        if (!flowId || autoRanInitial) return;
        setAutoRanInitial(true);
        setMessages([]);
        fire([]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [flowId]);

    // Re-run when stage/mode change while we already have a transcript.
    useEffect(() => {
        if (!flowId || !autoRanInitial) return;
        fire(messages);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stage, mode]);

    useEffect(() => {
        scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth',
        });
    }, [run]);

    const send = async () => {
        const text = draft.trim();
        if (!text) return;
        const next = [...messages, text];
        setMessages(next);
        setDraft('');
        await fire(next);
    };

    const reset = () => {
        setMessages([]);
        setRun(null);
        if (flowId) fire([]);
    };

    const finalVars = useMemo(() => {
        const vars: Record<string, unknown> = run?.finalState?.variables || {};
        return Object.entries(vars);
    }, [run]);

    return (
        <div className="h-full flex flex-col">
            <div className="px-3 py-2 border-b border-slate-900/[0.04] flex items-center gap-2 flex-shrink-0">
                <ToggleGroup
                    options={[
                        { value: 'draft', label: 'Draft' },
                        { value: 'published', label: 'Live' },
                    ]}
                    value={stage}
                    onChange={(v) => setStage(v as Stage)}
                    disabled={busy}
                />
                <ToggleGroup
                    options={[
                        { value: 'mock', label: 'Mock APIs' },
                        { value: 'live', label: 'Real APIs' },
                    ]}
                    value={mode}
                    onChange={(v) => setMode(v as Mode)}
                    disabled={busy}
                />
                <button
                    type="button"
                    onClick={reset}
                    disabled={busy || !flowId}
                    className="ml-auto inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-white border border-slate-900/[0.08] text-[11px] font-semibold text-slate-700 hover:text-slate-950 transition-colors disabled:opacity-60"
                >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                </button>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 min-h-0 overflow-auto bg-[#FAFAFA] px-3 py-3 space-y-3"
            >
                {!run && busy && (
                    <div className="text-center py-8 text-slate-500 text-[12px] inline-flex items-center justify-center gap-2 w-full">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Walking the flow…
                    </div>
                )}
                {!run && !busy && <SandboxHint />}
                {run?.transcript.map((t, i) => (
                    <TurnView key={i} turn={t} onSelectNode={onSelectNode} />
                ))}
                {run && run.endedAt != null && (
                    <div className="text-center text-[11px] text-slate-400 italic">
                        Flow ended.
                    </div>
                )}
            </div>

            <FinalState entries={finalVars} />

            <div className="border-t border-slate-900/[0.04] p-2 flex items-center gap-2 flex-shrink-0">
                <input
                    type="text"
                    value={draft}
                    placeholder={busy ? 'Running…' : 'Type a visitor message…'}
                    disabled={busy || !flowId || run?.endedAt != null}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && send()}
                    className="flex-1 h-9 px-3 rounded-md bg-white border border-slate-900/[0.08] text-[12.5px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500/60 disabled:opacity-60"
                />
                <button
                    type="button"
                    onClick={send}
                    disabled={busy || !draft.trim() || !flowId || run?.endedAt != null}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-60"
                    aria-label="Send"
                >
                    {busy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <Send className="w-3.5 h-3.5" strokeWidth={2.25} />
                    )}
                </button>
            </div>
        </div>
    );
}

const SandboxHint: React.FC = () => (
    <div className="text-center py-8 text-slate-500">
        <div className="w-9 h-9 mx-auto rounded-full bg-indigo-500/10 text-indigo-600 inline-flex items-center justify-center mb-2">
            <Wand2 className="w-4 h-4" />
        </div>
        <p className="text-[12.5px] text-slate-700 font-semibold">
            Try your flow before publishing
        </p>
        <p className="text-[11.5px] mt-1 max-w-[280px] mx-auto">
            We'll walk from the start node and let you type back. APIs are
            mocked by default to avoid hitting your real services.
        </p>
    </div>
);

const TurnView: React.FC<{
    turn: TestTurn;
    onSelectNode?: (id: string) => void;
}> = ({ turn, onSelectNode }) => (
    <div className="space-y-2">
        {turn.visitor != null && (
            <Bubble role="user">
                <p className="whitespace-pre-wrap">{turn.visitor}</p>
            </Bubble>
        )}
        {turn.chunks.length > 0 && (
            <div className="space-y-1.5">
                {turn.chunks.map((c, i) => (
                    <ChunkView key={i} chunk={c} />
                ))}
            </div>
        )}
        {turn.lastNodeId && (
            <button
                type="button"
                onClick={() => turn.lastNodeId && onSelectNode?.(turn.lastNodeId)}
                className="ml-9 inline-flex items-center gap-1.5 text-[10.5px] font-mono text-slate-500 hover:text-slate-900 transition-colors"
                title="Jump to this node on the canvas"
            >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                {turn.lastNodeType} · {turn.lastNodeId}
            </button>
        )}
    </div>
);

const ChunkView: React.FC<{ chunk: TestChunk }> = ({ chunk }) => {
    if (chunk.type === 'text' || chunk.type === 'ai') {
        return (
            <Bubble role="bot" subtle={chunk.type === 'ai'}>
                <p className="whitespace-pre-wrap">{chunk.text}</p>
            </Bubble>
        );
    }
    if (chunk.type === 'buttons') {
        return (
            <div className="ml-9 flex flex-wrap gap-1.5">
                {chunk.buttons.map((b, i) => (
                    <span
                        key={i}
                        className="inline-flex items-center h-6 px-2 rounded-full bg-indigo-50 border border-indigo-200/70 text-[11px] font-semibold text-indigo-700"
                    >
                        {b.label}
                    </span>
                ))}
            </div>
        );
    }
    if (chunk.type === 'cards') {
        return (
            <div className="ml-9 grid grid-cols-1 gap-2">
                {chunk.cards.map((c) => (
                    <div
                        key={c.id}
                        className="rounded-lg border border-slate-900/[0.06] bg-white px-2.5 py-2"
                    >
                        {c.title && (
                            <div className="text-[12.5px] font-semibold text-slate-900">
                                {c.title}
                            </div>
                        )}
                        {c.subtitle && (
                            <div className="text-[11.5px] text-slate-600">
                                {c.subtitle}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    }
    if (chunk.type === 'link') {
        return (
            <div className="ml-9">
                <a
                    href={chunk.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] font-semibold text-indigo-700 underline"
                >
                    {chunk.label || chunk.url}
                </a>
            </div>
        );
    }
    if (chunk.type === 'typing') {
        return (
            <div className="ml-9 inline-flex items-center gap-1.5 text-[11px] text-slate-400 italic">
                ...typing for {chunk.ms}ms
            </div>
        );
    }
    if (chunk.type === 'handoff') {
        return (
            <Bubble role="bot" tone="handoff">
                <p className="font-semibold text-[12px] text-amber-900">
                    Handoff to {chunk.team}
                </p>
                <p className="text-[12px] text-amber-800">{chunk.message}</p>
            </Bubble>
        );
    }
    if (chunk.type === 'error') {
        return (
            <Bubble role="bot" tone="error">
                <p className="text-[12px] text-rose-700">{chunk.text}</p>
            </Bubble>
        );
    }
    return null;
};

const Bubble: React.FC<{
    role: 'user' | 'bot';
    subtle?: boolean;
    tone?: 'handoff' | 'error';
    children: React.ReactNode;
}> = ({ role, subtle, tone, children }) => (
    <div
        className={cn(
            'flex items-start gap-2',
            role === 'user' && 'justify-end'
        )}
    >
        {role === 'bot' && (
            <span
                className={cn(
                    'inline-flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0',
                    tone === 'handoff'
                        ? 'bg-amber-500/15 text-amber-700'
                        : tone === 'error'
                        ? 'bg-rose-500/15 text-rose-700'
                        : 'bg-indigo-500/10 text-indigo-700'
                )}
            >
                <Bot className="w-3 h-3" />
            </span>
        )}
        <div
            className={cn(
                'max-w-[80%] rounded-2xl px-3 py-2 text-[12.5px] leading-relaxed',
                role === 'user'
                    ? 'bg-slate-900 text-white rounded-br-sm'
                    : tone === 'handoff'
                    ? 'bg-amber-50 border border-amber-200/70 text-amber-900 rounded-bl-sm'
                    : tone === 'error'
                    ? 'bg-rose-50 border border-rose-200/70 rounded-bl-sm'
                    : subtle
                    ? 'bg-white border border-slate-900/[0.06] italic text-slate-700 rounded-bl-sm'
                    : 'bg-white border border-slate-900/[0.06] text-slate-900 rounded-bl-sm'
            )}
        >
            {children}
        </div>
        {role === 'user' && (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-900/[0.06] text-slate-700 flex-shrink-0">
                <User className="w-3 h-3" />
            </span>
        )}
    </div>
);

const FinalState: React.FC<{ entries: [string, unknown][] }> = ({ entries }) => {
    if (entries.length === 0) return null;
    return (
        <div className="border-t border-slate-900/[0.04] bg-slate-50/60 px-3 py-2 flex-shrink-0">
            <div className="text-[10px] uppercase tracking-[0.14em] font-semibold text-slate-500 mb-1">
                Variables
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-auto">
                {entries.map(([k, v]) => (
                    <span
                        key={k}
                        className="inline-flex items-center gap-1 h-6 px-2 rounded-md bg-white border border-slate-900/[0.06] text-[11px] font-mono text-slate-700"
                        title={String(v)}
                    >
                        <span className="font-semibold text-slate-900">{k}</span>
                        <span className="text-slate-400">=</span>
                        <span className="truncate max-w-[120px]">
                            {formatVal(v)}
                        </span>
                    </span>
                ))}
            </div>
        </div>
    );
};

const ToggleGroup: React.FC<{
    options: { value: string; label: string }[];
    value: string;
    onChange: (v: string) => void;
    disabled?: boolean;
}> = ({ options, value, onChange, disabled }) => (
    <div
        className={cn(
            'inline-flex items-center p-0.5 bg-slate-900/[0.05] rounded-md',
            disabled && 'opacity-60 pointer-events-none'
        )}
    >
        {options.map((o) => (
            <button
                key={o.value}
                type="button"
                onClick={() => onChange(o.value)}
                className={cn(
                    'h-6 px-2 rounded text-[11px] font-semibold transition-colors',
                    value === o.value
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                )}
            >
                {o.label}
            </button>
        ))}
    </div>
);

function formatVal(v: unknown): string {
    if (v == null) return '∅';
    if (typeof v === 'string') return v.length > 24 ? v.slice(0, 24) + '…' : v;
    if (typeof v === 'object') return JSON.stringify(v).slice(0, 24) + '…';
    return String(v);
}

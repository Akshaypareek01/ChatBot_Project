import React, { useMemo, useState } from 'react';
import { RotateCcw, Send, Bot, User, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FlowDocument, FlowNode } from './types';

type Msg = { role: 'bot' | 'user'; text: string; isAiPlaceholder?: boolean };

type Props = {
    flow: FlowDocument;
};

const getNodeMap = (nodes: FlowNode[]) => new Map(nodes.map((n) => [n.id, n]));

export default function FlowPreview({ flow }: Props) {
    const nodeMap = useMemo(() => getNodeMap(flow.nodes), [flow.nodes]);
    const [currentId, setCurrentId] = useState(flow.startNodeId);
    const [messages, setMessages] = useState<Msg[]>([]);
    const [input, setInput] = useState('');

    const current = nodeMap.get(currentId);

    const gotoNode = (id?: string) => {
        if (!id) return;
        setCurrentId(id);
        const next = nodeMap.get(id);
        if (next?.text) {
            setMessages((prev) => [...prev, { role: 'bot', text: next.text || '' }]);
        }
        if (next?.type === 'ai') {
            setMessages((prev) => [
                ...prev,
                {
                    role: 'bot',
                    text: 'AI reply will be generated from your knowledge base when this flow runs live.',
                    isAiPlaceholder: true,
                },
            ]);
        }
    };

    const restart = () => {
        setCurrentId(flow.startNodeId);
        const start = nodeMap.get(flow.startNodeId);
        setMessages(start?.text ? [{ role: 'bot', text: start.text }] : []);
    };

    React.useEffect(() => {
        restart();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [flow.startNodeId, flow.nodes.length]);

    const submitQuestion = () => {
        if (!input.trim()) return;
        setMessages((prev) => [...prev, { role: 'user', text: input.trim() }]);
        setInput('');
        gotoNode(current?.fallbackNextNodeId);
    };

    return (
        <div className="rounded-xl border border-slate-900/[0.08] bg-white overflow-hidden flex flex-col h-full max-h-[640px]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-900/[0.06]">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600/10 text-indigo-600 flex items-center justify-center">
                        <Bot className="w-4 h-4" strokeWidth={2} />
                    </div>
                    <div className="leading-tight">
                        <p className="text-[13px] font-semibold tracking-tight text-slate-950">
                            Live preview
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Simulated conversation
                        </p>
                    </div>
                </div>
                <button
                    onClick={restart}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-white border border-slate-900/[0.08] text-[12px] font-semibold text-slate-700 hover:text-slate-950 hover:border-slate-900/20 transition-colors"
                >
                    <RotateCcw className="w-3.5 h-3.5" strokeWidth={2} />
                    Restart
                </button>
            </div>

            {/* Message area */}
            <div className="flex-1 overflow-y-auto bg-[#FAFAFA] px-4 py-5">
                <div className="space-y-3 max-w-[520px] mx-auto">
                    {messages.length === 0 && (
                        <div className="text-center py-10">
                            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-900/[0.04] text-slate-500 mb-3">
                                <Bot className="w-4 h-4" strokeWidth={1.75} />
                            </div>
                            <p className="text-[12.5px] text-slate-500">
                                Your flow will start playing here.
                            </p>
                        </div>
                    )}

                    {messages.map((m, idx) => {
                        const isBot = m.role === 'bot';
                        return (
                            <div
                                key={`${m.role}-${idx}`}
                                className={cn(
                                    'flex items-end gap-2',
                                    isBot ? 'justify-start' : 'justify-end'
                                )}
                            >
                                {isBot && (
                                    <div className="w-6 h-6 rounded-full bg-slate-900/[0.05] text-slate-500 flex items-center justify-center flex-shrink-0">
                                        <Bot className="w-3 h-3" strokeWidth={2} />
                                    </div>
                                )}
                                <div
                                    className={cn(
                                        'max-w-[78%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed tracking-tight',
                                        isBot
                                            ? 'bg-white border border-slate-900/[0.06] text-slate-800 rounded-bl-md'
                                            : 'bg-indigo-600 text-white rounded-br-md'
                                    )}
                                >
                                    {m.isAiPlaceholder ? (
                                        <span className="inline-flex items-center gap-1.5 text-slate-500 italic">
                                            <Sparkles
                                                className="w-3 h-3 text-amber-500"
                                                strokeWidth={2}
                                            />
                                            {m.text}
                                        </span>
                                    ) : (
                                        m.text
                                    )}
                                </div>
                                {!isBot && (
                                    <div className="w-6 h-6 rounded-full bg-indigo-600/15 text-indigo-600 flex items-center justify-center flex-shrink-0">
                                        <User className="w-3 h-3" strokeWidth={2} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Option buttons */}
            {current?.options?.length ? (
                <div className="px-4 py-3 border-t border-slate-900/[0.06] bg-white">
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-400 mb-2">
                        Choose an option
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {current.options.map((o) => (
                            <button
                                key={o.id}
                                onClick={() => {
                                    setMessages((prev) => [
                                        ...prev,
                                        { role: 'user', text: o.label },
                                    ]);
                                    gotoNode(o.nextNodeId);
                                }}
                                className="inline-flex items-center h-8 px-3 rounded-md bg-white border border-slate-900/[0.1] text-[12px] font-medium text-slate-700 hover:text-indigo-600 hover:border-indigo-500/40 transition-colors"
                            >
                                {o.label || 'Option'}
                            </button>
                        ))}
                    </div>
                </div>
            ) : null}

            {/* Text input — only for question-type nodes */}
            {current?.type === 'question' ? (
                <div className="px-4 py-3 border-t border-slate-900/[0.06] bg-white">
                    <div className="flex items-center gap-2">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    submitQuestion();
                                }
                            }}
                            placeholder="Type a test reply…"
                            className="flex-1 h-9 px-3 rounded-md bg-white border border-slate-900/[0.08] text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/60 transition-colors"
                        />
                        <button
                            onClick={submitQuestion}
                            disabled={!input.trim()}
                            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-slate-950 text-white text-[12.5px] font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send className="w-3.5 h-3.5" strokeWidth={2} />
                            Send
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

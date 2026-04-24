import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
    Trash2,
    Plus,
    Save,
    Power,
    Maximize2,
    ChevronDown,
    Workflow,
    X,
    RefreshCw,
    LayoutPanelLeft,
    Code2,
    Eye,
} from 'lucide-react';
import { createFlow, deleteFlow, getFlow, getFlowTemplates, listFlows, updateFlow } from '@/services/api';
import { useBot } from '@/context/BotContext';
import VisualFlowBuilder from './flows/VisualFlowBuilder';
import FlowPreview from './flows/FlowPreview';
import { createEmptyFlow, normalizeFlow, prettyJson } from './flows/utils';
import { FlowDocument, FlowSummary } from './flows/types';
import { cn } from '@/lib/utils';

type TabKey = 'visual' | 'json' | 'preview';

const TAB_CONFIG: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: 'visual', label: 'Builder', icon: LayoutPanelLeft },
    { key: 'json', label: 'JSON', icon: Code2 },
    { key: 'preview', label: 'Preview', icon: Eye },
];

/* -------------------------------------------------------------------------- */
/* Tiny UI primitives — match the landing page style                          */
/* -------------------------------------------------------------------------- */

const PrimaryButton: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: React.ReactNode }
> = ({ children, icon, className, ...props }) => (
    <button
        {...props}
        className={cn(
            'inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-slate-950 text-white text-[13px] font-semibold tracking-tight hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
            className
        )}
    >
        {icon}
        {children}
    </button>
);

const SecondaryButton: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: React.ReactNode }
> = ({ children, icon, className, ...props }) => (
    <button
        {...props}
        className={cn(
            'inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-white border border-slate-900/[0.08] text-[13px] font-semibold tracking-tight text-slate-700 hover:text-slate-950 hover:border-slate-900/20 transition-colors disabled:opacity-60',
            className
        )}
    >
        {icon}
        {children}
    </button>
);

/* -------------------------------------------------------------------------- */
/* Template picker — compact dropdown that matches the shell                  */
/* -------------------------------------------------------------------------- */

const TemplatePicker: React.FC<{
    templates: any[];
    onPick: (id: string) => void;
}> = ({ templates, onPick }) => {
    const [open, setOpen] = useState(false);
    const ref = React.useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const onClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen((s) => !s)}
                className="inline-flex items-center justify-between gap-1 h-9 px-3 rounded-md bg-white border border-slate-900/[0.08] text-[12.5px] font-medium text-slate-700 hover:text-slate-950 hover:border-slate-900/20 transition-colors w-full"
            >
                Use template
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            {open && (
                <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-900/[0.08] bg-white shadow-[0_12px_40px_-12px_rgba(15,23,42,0.2)] overflow-hidden">
                    {templates.length === 0 ? (
                        <p className="px-3 py-3 text-[12px] text-slate-500">No templates</p>
                    ) : (
                        templates.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => {
                                    onPick(t.id);
                                    setOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 text-[12.5px] text-slate-700 hover:bg-slate-900/[0.03] hover:text-slate-950 transition-colors"
                            >
                                {t.name}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

/* -------------------------------------------------------------------------- */
/* Main page                                                                   */
/* -------------------------------------------------------------------------- */

export default function ChatFlows() {
    const { currentBotId } = useBot() || {};
    const [flows, setFlows] = useState<FlowSummary[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [flowDoc, setFlowDoc] = useState<FlowDocument>(createEmptyFlow());
    const [jsonText, setJsonText] = useState(prettyJson(createEmptyFlow()));
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<TabKey>('visual');
    const [fullscreen, setFullscreen] = useState(false);

    const selected = useMemo(
        () => flows.find((f) => f._id === selectedId) || null,
        [flows, selectedId]
    );

    const refresh = async () => {
        setLoading(true);
        try {
            const data = await listFlows(currentBotId ?? undefined);
            setFlows(data?.flows ?? []);
            if (!selectedId && data?.flows?.[0]?._id) setSelectedId(data.flows[0]._id);
        } catch {
            toast.error('Failed to load flows');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
        getFlowTemplates()
            .then((d) => setTemplates(d?.templates ?? []))
            .catch(() => setTemplates([]));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentBotId]);

    useEffect(() => {
        if (!selectedId) return;
        getFlow(selectedId)
            .then((f) => {
                setName(f?.name ?? '');
                const normalized = normalizeFlow({
                    startNodeId: f?.startNodeId,
                    nodes: f?.nodes ?? [],
                    isActive: !!f?.isActive,
                });
                setFlowDoc(normalized);
                setJsonText(prettyJson(normalized));
            })
            .catch(() => toast.error('Failed to load flow'));
    }, [selectedId]);

    const syncJsonFromVisual = (nextDoc: FlowDocument) => {
        setFlowDoc(nextDoc);
        setJsonText(prettyJson(nextDoc));
    };

    const syncVisualFromJson = () => {
        try {
            const parsed = JSON.parse(jsonText || '{}');
            const normalized = normalizeFlow(parsed);
            setFlowDoc(normalized);
            setJsonText(prettyJson(normalized));
            toast.success('Visual refreshed from JSON');
        } catch {
            toast.error('Invalid JSON');
        }
    };

    const handleSave = async () => {
        if (!selectedId) return;
        setSaving(true);
        try {
            const parsed = normalizeFlow(JSON.parse(jsonText || '{}'));
            const payload = {
                name: name || selected?.name || 'Untitled flow',
                startNodeId: parsed.startNodeId,
                nodes: parsed.nodes,
                isActive: !!parsed.isActive,
            };
            await updateFlow(selectedId, payload);
            toast.success('Flow saved');
            await refresh();
        } catch (e: any) {
            toast.error(e?.message || 'Invalid JSON / flow');
        } finally {
            setSaving(false);
        }
    };

    const handleCreateEmpty = async () => {
        try {
            const empty = createEmptyFlow();
            const created = await createFlow({
                botId: currentBotId ?? undefined,
                name: 'New flow',
                ...empty,
            });
            toast.success('Created flow');
            setSelectedId(created?._id ?? null);
            await refresh();
        } catch (e: any) {
            toast.error(e?.message || 'Failed to create flow');
        }
    };

    const handleCreateFromTemplate = async (templateId: string) => {
        const t = templates.find((x) => x.id === templateId);
        if (!t) return;
        try {
            const created = await createFlow({
                botId: currentBotId ?? undefined,
                name: t.flow?.name || t.name,
                startNodeId: t.flow?.startNodeId,
                nodes: t.flow?.nodes,
                isActive: false,
            });
            toast.success('Template imported');
            setSelectedId(created?._id ?? null);
            await refresh();
        } catch (e: any) {
            toast.error(e?.message || 'Failed to import template');
        }
    };

    const handleDelete = async () => {
        if (!selectedId) return;
        if (!confirm('Delete this flow? This cannot be undone.')) return;
        try {
            await deleteFlow(selectedId);
            toast.success('Deleted');
            setSelectedId(null);
            await refresh();
        } catch {
            toast.error('Failed to delete');
        }
    };

    const builderContent = (
        <VisualFlowBuilder
            value={flowDoc}
            onChange={syncJsonFromVisual}
            className={cn(fullscreen && 'h-full border-none rounded-none')}
        />
    );

    return (
        <div className="space-y-8">
            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600 mb-2">
                        <span className="w-6 h-px bg-indigo-600" /> Engagement
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.02em] text-slate-950 leading-[1.05]">
                        Chat flows
                    </h1>
                    <p className="mt-2 text-[14px] text-slate-600 max-w-2xl">
                        Design guided conversations with branching logic and AI-powered steps.
                        Exactly one flow can be active per bot.
                    </p>
                </div>
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
                {/* Sidebar — flow list */}
                <aside className="rounded-xl border border-slate-900/[0.06] bg-white overflow-hidden h-fit">
                    <div className="px-5 py-4 border-b border-slate-900/[0.06]">
                        <h2 className="text-[13px] font-semibold tracking-tight text-slate-950">
                            Your flows
                        </h2>
                        <p className="text-[11.5px] text-slate-500 mt-0.5">
                            One active flow per bot.
                        </p>
                    </div>

                    <div className="p-3 space-y-2">
                        <div className="grid grid-cols-[auto_1fr] gap-2">
                            <PrimaryButton
                                onClick={handleCreateEmpty}
                                icon={<Plus className="w-3.5 h-3.5" strokeWidth={2.5} />}
                                className="h-9 px-3"
                            >
                                New
                            </PrimaryButton>
                            <TemplatePicker
                                templates={templates}
                                onPick={handleCreateFromTemplate}
                            />
                        </div>
                    </div>

                    <div className="px-2 pb-3 max-h-[420px] overflow-y-auto">
                        {loading ? (
                            <div className="px-3 py-6 text-[12.5px] text-slate-500">
                                Loading flows…
                            </div>
                        ) : flows.length === 0 ? (
                            <div className="px-3 py-6 text-center">
                                <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-slate-900/[0.04] text-slate-400 mb-2">
                                    <Workflow className="w-4 h-4" strokeWidth={1.75} />
                                </div>
                                <p className="text-[12.5px] text-slate-500">No flows yet</p>
                                <p className="text-[11.5px] text-slate-400 mt-0.5">
                                    Create a new flow or import a template.
                                </p>
                            </div>
                        ) : (
                            <ul className="space-y-0.5">
                                {flows.map((f) => {
                                    const active = selectedId === f._id;
                                    return (
                                        <li key={f._id}>
                                            <button
                                                onClick={() => setSelectedId(f._id)}
                                                className={cn(
                                                    'group w-full flex items-center justify-between gap-2 h-9 px-3 rounded-md text-[13px] transition-colors',
                                                    active
                                                        ? 'bg-slate-900/[0.04] text-slate-950 font-medium'
                                                        : 'text-slate-600 hover:text-slate-950 hover:bg-slate-900/[0.03]'
                                                )}
                                            >
                                                <span className="truncate tracking-tight">
                                                    {f.name || 'Untitled flow'}
                                                </span>
                                                {f.isActive && (
                                                    <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                                                        <Power
                                                            className="w-2.5 h-2.5"
                                                            strokeWidth={2.5}
                                                        />
                                                        Active
                                                    </span>
                                                )}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </aside>

                {/* Editor */}
                <section className="rounded-xl border border-slate-900/[0.06] bg-white overflow-hidden flex flex-col">
                    {!selectedId ? (
                        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-slate-900/[0.04] text-slate-500 flex items-center justify-center mb-3">
                                <Workflow className="w-5 h-5" strokeWidth={1.75} />
                            </div>
                            <h3 className="text-[14px] font-semibold tracking-tight text-slate-950">
                                Select a flow to edit
                            </h3>
                            <p className="mt-1.5 text-[12.5px] text-slate-500 max-w-xs">
                                Pick a flow from the left, or create a new one to start building.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Editor header — name + actions */}
                            <div className="px-5 py-3.5 border-b border-slate-900/[0.06] flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-2 justify-between">
                                <div className="flex-1 min-w-0">
                                    <label className="block text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-400 mb-1">
                                        Flow name
                                    </label>
                                    <input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Flow name"
                                        className="w-full h-8 px-2.5 -mx-2.5 rounded-md bg-transparent border border-transparent hover:border-slate-900/[0.08] focus:bg-white focus:border-slate-900/[0.08] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-[15px] font-semibold tracking-tight text-slate-950 transition-colors"
                                    />
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <SecondaryButton
                                        onClick={handleDelete}
                                        icon={<Trash2 className="w-3.5 h-3.5" strokeWidth={2} />}
                                        className="text-rose-600 hover:text-rose-700 border-rose-200/60 hover:border-rose-300"
                                    >
                                        Delete
                                    </SecondaryButton>
                                    <PrimaryButton
                                        onClick={handleSave}
                                        disabled={saving}
                                        icon={<Save className="w-3.5 h-3.5" strokeWidth={2} />}
                                    >
                                        {saving ? 'Saving…' : 'Save flow'}
                                    </PrimaryButton>
                                </div>
                            </div>

                            {/* Tab bar */}
                            <div className="px-5 pt-3 pb-0 border-b border-slate-900/[0.06] flex items-center justify-between gap-3">
                                <div className="inline-flex items-center gap-0.5 p-0.5 bg-slate-900/[0.04] rounded-lg">
                                    {TAB_CONFIG.map((t) => {
                                        const Icon = t.icon;
                                        const active = tab === t.key;
                                        return (
                                            <button
                                                key={t.key}
                                                onClick={() => setTab(t.key)}
                                                className={cn(
                                                    'inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12.5px] font-medium transition-all',
                                                    active
                                                        ? 'bg-white text-slate-950 shadow-sm'
                                                        : 'text-slate-500 hover:text-slate-900'
                                                )}
                                            >
                                                <Icon
                                                    className="w-3.5 h-3.5"
                                                    strokeWidth={1.75}
                                                />
                                                {t.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                {tab === 'visual' && (
                                    <button
                                        onClick={() => setFullscreen(true)}
                                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-medium text-slate-500 hover:text-slate-950 hover:bg-slate-900/[0.04] transition-colors"
                                    >
                                        <Maximize2 className="w-3.5 h-3.5" strokeWidth={2} />
                                        Full screen
                                    </button>
                                )}

                                <div className="h-3" />
                            </div>

                            {/* Tab content */}
                            <div className="p-5">
                                {tab === 'visual' && builderContent}

                                {tab === 'json' && (
                                    <div className="space-y-3">
                                        <div className="rounded-xl border border-slate-900/[0.08] bg-[#FAFAFA] overflow-hidden">
                                            <div className="px-4 py-2.5 border-b border-slate-900/[0.06] flex items-center justify-between">
                                                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                                    flow.json
                                                </span>
                                                <SecondaryButton
                                                    onClick={syncVisualFromJson}
                                                    icon={
                                                        <RefreshCw
                                                            className="w-3.5 h-3.5"
                                                            strokeWidth={2}
                                                        />
                                                    }
                                                    className="h-7 px-2.5 text-[11.5px]"
                                                >
                                                    Apply to visual
                                                </SecondaryButton>
                                            </div>
                                            <textarea
                                                value={jsonText}
                                                onChange={(e) => setJsonText(e.target.value)}
                                                rows={22}
                                                className="w-full px-4 py-3 bg-transparent font-mono text-[12px] leading-relaxed text-slate-800 focus:outline-none resize-none"
                                                spellCheck={false}
                                            />
                                        </div>
                                        <p className="text-[11.5px] text-slate-500">
                                            Edit the raw flow definition. Click
                                            <span className="mx-1 font-semibold text-slate-700">
                                                Apply to visual
                                            </span>
                                            to re-render the builder.
                                        </p>
                                    </div>
                                )}

                                {tab === 'preview' && <FlowPreview flow={flowDoc} />}
                            </div>
                        </>
                    )}
                </section>
            </div>

            {/* Fullscreen builder overlay */}
            {fullscreen && selectedId && (
                <div className="fixed inset-0 z-50 bg-white flex flex-col">
                    <div className="h-14 px-5 border-b border-slate-900/[0.06] flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-indigo-600/10 text-indigo-600 flex-shrink-0">
                                <Workflow className="w-3.5 h-3.5" strokeWidth={2} />
                            </div>
                            <h2 className="text-[14px] font-semibold tracking-tight text-slate-950 truncate">
                                {name || selected?.name || 'Flow'}
                            </h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <SecondaryButton
                                onClick={syncVisualFromJson}
                                icon={<RefreshCw className="w-3.5 h-3.5" strokeWidth={2} />}
                            >
                                Refresh
                            </SecondaryButton>
                            <PrimaryButton
                                onClick={handleSave}
                                disabled={saving}
                                icon={<Save className="w-3.5 h-3.5" strokeWidth={2} />}
                            >
                                {saving ? 'Saving…' : 'Save flow'}
                            </PrimaryButton>
                            <button
                                onClick={() => setFullscreen(false)}
                                className="w-9 h-9 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-900/[0.04] transition-colors"
                                aria-label="Exit fullscreen"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 min-h-0">{builderContent}</div>
                </div>
            )}
        </div>
    );
}

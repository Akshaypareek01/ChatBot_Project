/**
 * ChatFlows page \u2014 entry point for the Enterprise Flow Builder.
 *
 * This component orchestrates the slim sub-components in src/components/user/
 * flows/* and stays focused on data flow:
 *   - GET /users/flows         \u2192 sidebar list (FlowSidebar)
 *   - GET /users/flows/:id     \u2192 selected flow document
 *   - PUT /users/flows/:id     \u2192 save draft
 *   - POST validate / publish  \u2192 lifecycle actions
 *   - PATCH bot behavior       \u2192 default AI vs Run this flow
 *
 * Anything visual is delegated. Anything graph-shaped goes through the
 * VisualFlowBuilder. The result is < 350 lines of orchestration.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { Workflow, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    createFlow,
    deleteFlow,
    getFlow,
    listFlows,
    publishFlow,
    setBotBehavior,
    unpublishFlow,
    updateFlow,
    validateFlow,
} from '@/services/api';
import { useBot } from '@/context/BotContext';
import VisualFlowBuilder from './flows/VisualFlowBuilder';
import FlowSidebar from './flows/FlowSidebar';
import FlowEditorHeader, { type SidePanelTab } from './flows/FlowEditorHeader';
import TemplateGallery from './flows/TemplateGallery';
import SidePanel from './flows/panels/SidePanel';
import VariablesPanel from './flows/panels/VariablesPanel';
import ValidationPanel from './flows/panels/ValidationPanel';
import TestSandbox from './flows/panels/TestSandbox';
import AnalyticsPanel from './flows/panels/AnalyticsPanel';
import BehaviorBanner from './flows/BehaviorBanner';
import BehaviorChangeModal from './flows/BehaviorChangeModal';
import { createEmptyFlow, normalizeFlow } from './flows/utils';
import type {
    FlowDocument,
    FlowStatus,
    FlowSummary,
    ValidationReport,
} from './flows/types';

export default function ChatFlows() {
    const botCtx = useBot();
    const currentBotId = botCtx?.currentBotId ?? null;
    const currentBot = botCtx?.currentBot ?? null;

    const [flows, setFlows] = useState<FlowSummary[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [status, setStatus] = useState<FlowStatus>('draft');
    const [publishedVersion, setPublishedVersion] = useState<number>(0);
    const [publishedAt, setPublishedAt] = useState<string | null>(null);
    const [flowDoc, setFlowDoc] = useState<FlowDocument>(createEmptyFlow());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [validation, setValidation] = useState<ValidationReport | null>(null);
    const [fullscreen, setFullscreen] = useState(false);
    const [templateOpen, setTemplateOpen] = useState(false);
    const [panelTab, setPanelTab] = useState<SidePanelTab | null>(null);
    const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
    const [behaviorModalOpen, setBehaviorModalOpen] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const dirtyRef = useRef(false);

    /**
     * Single source of truth for the dirty flag. The ref is read inside async
     * publish flow (no re-render needed there); the state drives header chrome.
     */
    const setDirty = (next: boolean) => {
        dirtyRef.current = next;
        setIsDirty(next);
    };

    const selectedFlow = useMemo(
        () => flows.find((f) => f._id === selectedId) || null,
        [flows, selectedId]
    );

    /** Whether the bot is currently set to run THIS flow. */
    const isPublishedForCurrentBot =
        !!(currentBot?.activeFlowId && currentBot.activeFlowId === selectedId);

    const behaviorMode: 'default' | 'flow' =
        currentBot?.behaviorMode === 'flow' ? 'flow' : 'default';

    /* ------------------------------- loading -------------------------- */

    const refresh = async () => {
        setLoading(true);
        try {
            const data = await listFlows(currentBotId ?? undefined);
            const list: FlowSummary[] = data?.flows ?? [];
            setFlows(list);
            if (!selectedId && list[0]?._id) setSelectedId(list[0]._id);
        } catch {
            toast.error('Failed to load flows');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentBotId]);

    useEffect(() => {
        if (!selectedId) return;
        getFlow(selectedId)
            .then((f) => {
                setName(f?.name ?? '');
                setStatus((f?.status as FlowStatus) || 'draft');
                setPublishedVersion(f?.publishedVersion ?? 0);
                setPublishedAt(f?.publishedAt ?? null);
                const editingNodes =
                    Array.isArray(f?.draftNodes) && f.draftNodes.length > 0
                        ? f.draftNodes
                        : f?.nodes;

                const hadPositions = (editingNodes ?? []).every(
                    (n: any) => n?.position?.x !== undefined
                );

                const normalized = normalizeFlow({
                    startNodeId: f?.startNodeId,
                    nodes: editingNodes,
                    isActive: !!f?.isActive,
                    variables: f?.variables ?? [],
                });
                setFlowDoc(normalized);

                // Persist auto-computed positions so nodes never pile up again
                if (!hadPositions && selectedId) {
                    updateFlow(selectedId, {
                        name: f?.name || 'Untitled flow',
                        startNodeId: normalized.startNodeId,
                        nodes: normalized.nodes,
                        variables: normalized.variables ?? [],
                    }).catch(() => {/* silent — layout save is best-effort */});
                }

                setDirty(false);
                setValidation(null);
            })
            .catch(() => toast.error('Failed to load flow'));
    }, [selectedId]);

    /* ------------------------------- mutations ------------------------ */

    const handleDocChange = (next: FlowDocument) => {
        setFlowDoc(next);
        setDirty(true);
    };

    const handleSave = async () => {
        if (!selectedId) return;
        setSaving(true);
        try {
            await updateFlow(selectedId, {
                name: name || selectedFlow?.name || 'Untitled flow',
                startNodeId: flowDoc.startNodeId,
                nodes: flowDoc.nodes,
                variables: flowDoc.variables ?? [],
            });
            setDirty(false);
            toast.success('Draft saved');
            refresh();
        } catch (e: any) {
            toast.error(e?.response?.data?.message || e?.message || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const handlePublish = async () => {
        if (!selectedId) return;
        setPublishing(true);
        try {
            // Save current draft first so what we publish matches what\u2019s on screen.
            if (dirtyRef.current) {
                await updateFlow(selectedId, {
                    name: name || selectedFlow?.name || 'Untitled flow',
                    startNodeId: flowDoc.startNodeId,
                    nodes: flowDoc.nodes,
                    variables: flowDoc.variables ?? [],
                });
                setDirty(false);
            }

            // Validate first so we surface errors locally before the publish call.
            const report: ValidationReport = await validateFlow(selectedId, {
                stage: 'draft',
            });
            setValidation(report);
            if (!report.ok) {
                toast.error(
                    `Cannot publish: ${report.errors.length} error${
                        report.errors.length === 1 ? '' : 's'
                    } in the flow`
                );
                return;
            }

            const result = await publishFlow(selectedId, {
                activateOn: currentBotId || null,
            });
            const f = result?.flow;
            if (f) {
                setStatus(f.status || 'published');
                setPublishedVersion(f.publishedVersion || 1);
                setPublishedAt(f.publishedAt || new Date().toISOString());
            }
            toast.success(
                currentBotId
                    ? 'Published & activated on this bot'
                    : 'Published'
            );
            await Promise.all([refresh(), botCtx?.refreshBots?.()]);
        } catch (e: any) {
            const msg =
                e?.response?.data?.message ||
                e?.message ||
                'Publish failed';
            const report = e?.response?.data?.report as
                | ValidationReport
                | undefined;
            if (report) setValidation(report);
            toast.error(msg);
        } finally {
            setPublishing(false);
        }
    };

    const handleUnpublish = async () => {
        if (!selectedId) return;
        if (!confirm('Unpublish this flow? Visitors will go back to the AI default reply.')) return;
        setPublishing(true);
        try {
            await unpublishFlow(selectedId);
            setStatus('draft');
            toast.success('Flow unpublished');
            await Promise.all([refresh(), botCtx?.refreshBots?.()]);
        } catch (e: any) {
            toast.error(e?.message || 'Unpublish failed');
        } finally {
            setPublishing(false);
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

    const handleCreateBlank = async () => {
        try {
            const empty = createEmptyFlow();
            const created = await createFlow({
                botId: currentBotId ?? undefined,
                name: 'Untitled flow',
                ...empty,
            });
            const id = created?._id || created?.flow?._id;
            if (id) setSelectedId(id);
            toast.success('Draft created');
            await refresh();
        } catch (e: any) {
            toast.error(e?.message || 'Failed to create flow');
        }
    };

    const handleBehaviorChange = async (mode: 'default' | 'flow') => {
        if (!currentBotId) return;
        try {
            await setBotBehavior(currentBotId, {
                mode,
                activeFlowId: mode === 'flow' ? selectedId : null,
            });
            toast.success(
                mode === 'flow'
                    ? 'Bot is now running this flow'
                    : 'Bot is back on AI default'
            );
            await botCtx?.refreshBots?.();
        } catch (e: any) {
            toast.error(e?.message || 'Could not change bot behavior');
        }
    };

    /**
     * Submit handler for the BehaviorChangeModal. Mirrors handleBehaviorChange
     * but also accepts an explicit flow id (modal can switch to a flow that
     * isn't currently selected in the editor).
     */
    const handleBehaviorSubmit = async (payload: {
        mode: 'default' | 'flow';
        activeFlowId: string | null;
    }) => {
        if (!currentBotId) return;
        try {
            await setBotBehavior(currentBotId, payload);
            toast.success(
                payload.mode === 'flow'
                    ? 'Bot is now running this flow'
                    : 'Bot is back on AI default'
            );
            await botCtx?.refreshBots?.();
        } catch (e: any) {
            toast.error(e?.message || 'Could not change bot behavior');
            throw e;
        }
    };

    /**
     * Activate a published flow from the sidebar row. Confirms first because
     * this changes how every visitor talks to the bot.
     */
    const handleActivateFlow = async (flowId: string) => {
        if (!currentBotId) return;
        const target = flows.find((f) => f._id === flowId);
        const status = target?.status || (target?.isActive ? 'published' : 'draft');
        if (status !== 'published') {
            toast.error('Publish this flow before activating it.');
            return;
        }
        const ok = window.confirm(
            'Your bot will stop using Default AI and start running "' +
                (target?.name || 'this flow') +
                '" for all visitors. Continue?'
        );
        if (!ok) return;
        await handleBehaviorSubmit({ mode: 'flow', activeFlowId: flowId });
    };

    /** Deactivate the currently-active flow on this bot. */
    const handleDeactivateFlow = async () => {
        if (!currentBotId) return;
        const ok = window.confirm(
            'Stop running this flow? Visitors will go back to the Default AI reply.'
        );
        if (!ok) return;
        await handleBehaviorSubmit({ mode: 'default', activeFlowId: null });
    };

    /**
     * Discard the in-flight draft and reload the last published version.
     * Useful when the author wants to bail on changes without unpublishing.
     */
    const handleDiscardDraft = async () => {
        if (!selectedId) return;
        const ok = window.confirm(
            'Discard your draft changes and reload the last published version?'
        );
        if (!ok) return;
        try {
            const f = await getFlow(selectedId);
            const editingNodes =
                Array.isArray(f?.nodes) && f.nodes.length ? f.nodes : [];
            setFlowDoc(
                normalizeFlow({
                    startNodeId: f?.startNodeId,
                    nodes: editingNodes,
                    isActive: !!f?.isActive,
                    variables: f?.variables ?? [],
                })
            );
            setDirty(false);
            toast.success('Draft discarded');
        } catch {
            toast.error('Could not reload published version');
        }
    };

    /* ------------------------------- panels --------------------------- */

    const togglePanel = (tab: SidePanelTab) =>
        setPanelTab((current) => (current === tab ? null : tab));

    const jumpToNode = (id: string) => {
        setFocusNodeId(id);
        // Re-set on next tick so identical clicks re-trigger the centering effect.
        setTimeout(() => setFocusNodeId(null), 600);
    };

    const validationCount =
        validation?.errors?.length ?? 0;

    const sidePanelContent =
        panelTab === 'variables' ? (
            <VariablesPanel flow={flowDoc} onSelectNode={jumpToNode} />
        ) : panelTab === 'validation' ? (
            <ValidationPanel
                flowId={selectedId}
                report={validation}
                onReport={setValidation}
                onSelectNode={jumpToNode}
            />
        ) : panelTab === 'test' ? (
            <TestSandbox flowId={selectedId} onSelectNode={jumpToNode} />
        ) : panelTab === 'analytics' ? (
            <AnalyticsPanel flowId={selectedId} onSelectNode={jumpToNode} />
        ) : null;

    /* ------------------------------- render --------------------------- */

    const builder = (
        <div className="flex w-full h-full">
            <div className="flex-1 min-w-0 flex">
                <VisualFlowBuilder
                    value={flowDoc}
                    onChange={handleDocChange}
                    className={cn(
                        'h-full',
                        fullscreen && 'rounded-none border-none'
                    )}
                    focusNodeId={focusNodeId}
                    footerSlot={
                        validation && !validation.ok ? (
                            <ValidationStrip
                                report={validation}
                                onOpenValidation={() => setPanelTab('validation')}
                            />
                        ) : null
                    }
                />
            </div>
            <SidePanel
                open={!!panelTab}
                activeTab={panelTab || 'variables'}
                onTabChange={(t) => setPanelTab(t)}
                onClose={() => setPanelTab(null)}
                validationCount={validationCount}
            >
                {sidePanelContent}
            </SidePanel>
        </div>
    );

    return (
        <div className="space-y-6">
            <PageHeader />

            <BehaviorBanner
                mode={behaviorMode}
                activeFlowId={currentBot?.activeFlowId || null}
                flows={flows}
                onChangeClick={() => setBehaviorModalOpen(true)}
                disabled={!currentBotId}
            />

            <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-6">
                <FlowSidebar
                    flows={flows}
                    selectedId={selectedId}
                    loading={loading}
                    onSelect={setSelectedId}
                    onNew={handleCreateBlank}
                    onUseTemplate={() => setTemplateOpen(true)}
                    activeFlowId={currentBot?.activeFlowId || null}
                    onActivate={handleActivateFlow}
                    onDeactivate={handleDeactivateFlow}
                />

                <section className="rounded-xl border border-slate-900/[0.06] bg-white overflow-hidden flex flex-col">
                    {!selectedId ? (
                        <EmptyState />
                    ) : (
                        <>
                            <FlowEditorHeader
                                name={name}
                                onNameChange={setName}
                                status={status}
                                publishedVersion={publishedVersion}
                                publishedAt={publishedAt}
                                saving={saving}
                                publishing={publishing}
                                isPublishedForCurrentBot={isPublishedForCurrentBot}
                                behaviorMode={behaviorMode}
                                onBehaviorModeChange={handleBehaviorChange}
                                onSave={handleSave}
                                onPublish={handlePublish}
                                onUnpublish={handleUnpublish}
                                onDelete={handleDelete}
                                onFullscreen={() => setFullscreen(true)}
                                activePanelTab={panelTab}
                                onTogglePanel={togglePanel}
                                validationCount={validationCount}
                                isDirty={isDirty}
                                onDiscardDraft={handleDiscardDraft}
                            />
                            <div className="p-5 h-[680px] flex">
                                <div className="flex-1 min-w-0">{builder}</div>
                            </div>
                        </>
                    )}
                </section>
            </div>

            {fullscreen && selectedId && createPortal(
                <div className="fixed inset-0 z-[9999] bg-white flex flex-col">
                    <div className="h-14 px-5 border-b border-slate-900/[0.06] flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-indigo-600/10 text-indigo-600 flex-shrink-0">
                                <Workflow className="w-3.5 h-3.5" strokeWidth={2} />
                            </div>
                            <h2 className="text-[14px] font-semibold tracking-tight text-slate-950 truncate">
                                {name || selectedFlow?.name || 'Flow'}
                            </h2>
                        </div>
                        <button
                            onClick={() => setFullscreen(false)}
                            className="w-9 h-9 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-900/[0.04] transition-colors"
                            aria-label="Exit fullscreen"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex-1 min-h-0">{builder}</div>
                </div>,
                document.body
            )}

            <TemplateGallery
                open={templateOpen}
                onClose={() => setTemplateOpen(false)}
                botId={currentBotId}
                onCloned={(id) => {
                    setSelectedId(id);
                    refresh();
                }}
            />

            <BehaviorChangeModal
                open={behaviorModalOpen}
                onClose={() => setBehaviorModalOpen(false)}
                currentMode={behaviorMode}
                currentActiveFlowId={currentBot?.activeFlowId || null}
                flows={flows}
                onSubmit={handleBehaviorSubmit}
            />
        </div>
    );
}

/* -------------------------------------------------------------------------- */

const PageHeader: React.FC = () => (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600 mb-2">
                <span className="w-6 h-px bg-indigo-600" /> Engagement
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.02em] text-slate-950 leading-[1.05]">
                Chat flows
            </h1>
            <p className="mt-2 text-[14px] text-slate-600 max-w-2xl">
                Design enterprise conversations with branching logic, API
                actions, capture forms, AI replies, and live-agent handoff
                \u2014 then publish a single flow per bot.
            </p>
        </div>
    </div>
);

const EmptyState: React.FC = () => (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-900/[0.04] text-slate-500 flex items-center justify-center mb-3">
            <Workflow className="w-5 h-5" strokeWidth={1.75} />
        </div>
        <h3 className="text-[14px] font-semibold tracking-tight text-slate-950">
            Select a flow to edit
        </h3>
        <p className="mt-1.5 text-[12.5px] text-slate-500 max-w-xs">
            Pick a flow from the sidebar, start blank, or pick a battle-tested
            template.
        </p>
    </div>
);

const ValidationStrip: React.FC<{
    report: ValidationReport;
    onOpenValidation: () => void;
}> = ({ report, onOpenValidation }) => (
    <button
        type="button"
        onClick={onOpenValidation}
        className="w-full px-4 py-2.5 bg-amber-50 border-t border-amber-200/60 text-[12px] text-amber-900 flex items-center gap-3 hover:bg-amber-100/80 transition-colors text-left"
    >
        <span className="font-semibold uppercase tracking-[0.1em] text-[10.5px]">
            Validation
        </span>
        <span>
            {report.errors.length} error
            {report.errors.length === 1 ? '' : 's'},{' '}
            {report.warnings.length} warning
            {report.warnings.length === 1 ? '' : 's'}
        </span>
        <span className="ml-auto text-[11px] text-amber-800/80 truncate">
            {report.errors[0]?.message || report.warnings[0]?.message}
        </span>
        <span className="text-[10.5px] font-semibold text-amber-900 underline underline-offset-2">
            Review
        </span>
    </button>
);

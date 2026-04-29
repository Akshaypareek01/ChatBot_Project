/**
 * Header for the editor pane: flow name, status pill, behavior-mode toggle,
 * and the lifecycle action buttons (Save / Publish / Unpublish / Delete /
 * Fullscreen). Pure presentation \u2014 the parent owns the data + handlers.
 */

import React from 'react';
import {
    Maximize2,
    PowerOff,
    RotateCcw,
    Save,
    Trash2,
    UploadCloud,
    Bot,
    Workflow,
    AlertTriangle,
    BarChart3,
    CheckCircle2,
    FlaskConical,
    Variable,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type SidePanelTab = 'variables' | 'validation' | 'test' | 'analytics';

type Props = {
    name: string;
    onNameChange: (next: string) => void;
    status: 'draft' | 'published' | 'archived';
    publishedVersion?: number;
    publishedAt?: string | null;
    saving: boolean;
    publishing: boolean;
    isPublishedForCurrentBot: boolean;
    behaviorMode: 'default' | 'flow';
    onBehaviorModeChange: (mode: 'default' | 'flow') => void;
    onSave: () => void;
    onPublish: () => void;
    onUnpublish: () => void;
    onDelete: () => void;
    onFullscreen: () => void;
    /** Active panel tab, or null when the panel is closed. */
    activePanelTab?: SidePanelTab | null;
    /** Toggle side panel: clicking the same tab closes it. */
    onTogglePanel?: (tab: SidePanelTab) => void;
    /** Number of validation errors (drives the badge dot on the toolbar). */
    validationCount?: number;
    /**
     * Surfaces a "draft has unsaved changes" pill next to the status pill.
     * Drives the visibility of the Discard-draft button.
     */
    isDirty?: boolean;
    /** Discard the local draft and reload the published nodes. */
    onDiscardDraft?: () => void;
};

export default function FlowEditorHeader({
    name,
    onNameChange,
    status,
    publishedVersion,
    publishedAt,
    saving,
    publishing,
    isPublishedForCurrentBot,
    behaviorMode,
    onBehaviorModeChange,
    onSave,
    onPublish,
    onUnpublish,
    onDelete,
    onFullscreen,
    activePanelTab,
    onTogglePanel,
    validationCount,
    isDirty,
    onDiscardDraft,
}: Props) {
    return (
        <div className="px-5 py-3.5 border-b border-slate-900/[0.06] flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <label className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Flow name
                    </label>
                    <StatusPill
                        status={status}
                        version={publishedVersion}
                        publishedAt={publishedAt}
                    />
                    {isDirty && (
                        <span
                            className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold uppercase tracking-[0.1em] bg-amber-50 text-amber-800 border border-amber-200/60"
                            title="You have unsaved changes in the draft"
                        >
                            Unsaved
                        </span>
                    )}
                </div>
                <input
                    value={name}
                    onChange={(e) => onNameChange(e.target.value)}
                    placeholder="Flow name"
                    className="w-full h-9 px-2.5 -mx-2.5 rounded-md bg-transparent border border-transparent hover:border-slate-900/[0.08] focus:bg-white focus:border-slate-900/[0.08] focus:outline-none focus:ring-2 focus:ring-indigo-500/25 text-[16px] font-semibold tracking-tight text-slate-950 transition-colors"
                />
            </div>

            <BehaviorModeToggle
                mode={behaviorMode}
                onChange={onBehaviorModeChange}
                disabled={!isPublishedForCurrentBot}
            />

            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                {onTogglePanel && (
                    <PanelToolbar
                        activeTab={activePanelTab ?? null}
                        validationCount={validationCount}
                        onToggle={onTogglePanel}
                    />
                )}
                <button
                    type="button"
                    onClick={onFullscreen}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-white border border-slate-900/[0.08] text-[12.5px] font-semibold text-slate-700 hover:text-slate-950 hover:border-slate-900/20 transition-colors"
                >
                    <Maximize2 className="w-3.5 h-3.5" strokeWidth={2} />
                    Full screen
                </button>
                <button
                    type="button"
                    onClick={onDelete}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-white border border-rose-200/60 text-[12.5px] font-semibold text-rose-700 hover:text-rose-800 hover:border-rose-300 transition-colors"
                >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                    Delete
                </button>
                {status === 'published' && onDiscardDraft && isDirty && (
                    <button
                        type="button"
                        onClick={onDiscardDraft}
                        title="Discard your unsaved changes and reload the last published version"
                        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-white border border-slate-900/[0.08] text-[12.5px] font-semibold text-slate-700 hover:text-slate-950 hover:border-slate-900/20 transition-colors"
                    >
                        <RotateCcw className="w-3.5 h-3.5" strokeWidth={2} />
                        Discard
                    </button>
                )}
                <button
                    type="button"
                    onClick={onSave}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-white border border-slate-900/[0.08] text-[12.5px] font-semibold text-slate-800 hover:text-slate-950 hover:border-slate-900/20 transition-colors disabled:opacity-60"
                >
                    <Save className="w-3.5 h-3.5" strokeWidth={2} />
                    {saving ? 'Saving\u2026' : 'Save draft'}
                </button>
                {status === 'published' ? (
                    <button
                        type="button"
                        onClick={onUnpublish}
                        disabled={publishing}
                        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-white border border-slate-900/[0.08] text-[12.5px] font-semibold text-slate-800 hover:text-slate-950 hover:border-slate-900/20 transition-colors disabled:opacity-60"
                    >
                        <PowerOff className="w-3.5 h-3.5" strokeWidth={2} />
                        {publishing ? 'Working\u2026' : 'Unpublish'}
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={onPublish}
                        disabled={publishing}
                        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-slate-950 text-white text-[12.5px] font-semibold hover:bg-slate-800 transition-colors disabled:opacity-60"
                    >
                        <UploadCloud className="w-3.5 h-3.5" strokeWidth={2} />
                        {publishing ? 'Publishing\u2026' : 'Publish'}
                    </button>
                )}
            </div>
        </div>
    );
}

const StatusPill: React.FC<{
    status: 'draft' | 'published' | 'archived';
    version?: number;
    publishedAt?: string | null;
}> = ({ status, version, publishedAt }) => {
    const tones: Record<string, string> = {
        draft: 'bg-amber-50 text-amber-800 border border-amber-200/60',
        published: 'bg-indigo-50 text-indigo-800 border border-indigo-200/60',
        archived: 'bg-slate-100 text-slate-600 border border-slate-200/80',
    };
    const label =
        status === 'published'
            ? `Published v${version || 1}${
                  publishedAt
                      ? ` \u2022 ${new Date(publishedAt).toLocaleDateString()}`
                      : ''
              }`
            : status === 'archived'
            ? 'Archived'
            : 'Draft';
    return (
        <span
            className={cn(
                'inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold uppercase tracking-[0.1em]',
                tones[status]
            )}
        >
            {label}
        </span>
    );
};

const BehaviorModeToggle: React.FC<{
    mode: 'default' | 'flow';
    onChange: (next: 'default' | 'flow') => void;
    disabled?: boolean;
}> = ({ mode, onChange, disabled }) => {
    return (
        <div className="flex flex-col gap-1">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Bot behavior
            </span>
            <div
                className={cn(
                    'inline-flex items-center gap-0.5 p-0.5 bg-slate-900/[0.05] rounded-lg',
                    disabled && 'opacity-50 pointer-events-none'
                )}
                title={disabled ? 'Publish this flow first to switch the bot to Flow mode.' : undefined}
            >
                <ModeButton
                    icon={<Bot className="w-3.5 h-3.5" />}
                    label="AI default"
                    active={mode === 'default'}
                    onClick={() => onChange('default')}
                />
                <ModeButton
                    icon={<Workflow className="w-3.5 h-3.5" />}
                    label="Run this flow"
                    active={mode === 'flow'}
                    onClick={() => onChange('flow')}
                />
            </div>
        </div>
    );
};

const ModeButton: React.FC<{
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
}> = ({ icon, label, active, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className={cn(
            'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12px] font-semibold transition-all',
            active
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
        )}
    >
        {icon}
        {label}
    </button>
);

/**
 * Compact toolbar that lives next to "Full screen" — three pill buttons that
 * open the matching tab in the side panel. Clicking the active one closes it.
 */
const PanelToolbar: React.FC<{
    activeTab: SidePanelTab | null;
    validationCount?: number;
    onToggle: (tab: SidePanelTab) => void;
}> = ({ activeTab, validationCount, onToggle }) => (
    <div className="inline-flex items-center p-0.5 bg-slate-900/[0.05] rounded-lg">
        <PanelToolbarButton
            tab="variables"
            label="Vars"
            icon={<Variable className="w-3.5 h-3.5" strokeWidth={2} />}
            active={activeTab === 'variables'}
            onClick={onToggle}
        />
        <PanelToolbarButton
            tab="validation"
            label="Validate"
            icon={
                validationCount && validationCount > 0 ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" strokeWidth={2} />
                ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2} />
                )
            }
            badge={
                validationCount && validationCount > 0
                    ? String(validationCount)
                    : undefined
            }
            active={activeTab === 'validation'}
            onClick={onToggle}
        />
        <PanelToolbarButton
            tab="test"
            label="Test"
            icon={<FlaskConical className="w-3.5 h-3.5" strokeWidth={2} />}
            active={activeTab === 'test'}
            onClick={onToggle}
        />
        <PanelToolbarButton
            tab="analytics"
            label="Stats"
            icon={<BarChart3 className="w-3.5 h-3.5" strokeWidth={2} />}
            active={activeTab === 'analytics'}
            onClick={onToggle}
        />
    </div>
);

const PanelToolbarButton: React.FC<{
    tab: SidePanelTab;
    label: string;
    icon: React.ReactNode;
    badge?: string;
    active: boolean;
    onClick: (tab: SidePanelTab) => void;
}> = ({ tab, label, icon, badge, active, onClick }) => (
    <button
        type="button"
        onClick={() => onClick(tab)}
        className={cn(
            'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12px] font-semibold transition-all',
            active
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
        )}
    >
        {icon}
        {label}
        {badge ? (
            <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-amber-500/20 text-amber-700 text-[9.5px] font-bold">
                {badge}
            </span>
        ) : null}
    </button>
);

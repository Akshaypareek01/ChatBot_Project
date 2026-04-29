/**
 * Tabbed side panel that hosts the author productivity tools next to the
 * canvas: Variables / Validation / Test sandbox.
 *
 * Pure layout component — each tab is a self-contained child. Parent owns
 * the open/close state and which tab is active so we can deep-link from
 * header buttons (e.g. "Validate" jumps straight to the validation tab).
 */

import React from 'react';
import { X, AlertTriangle, BarChart3, CheckCircle2, FlaskConical, Variable } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SidePanelTab = 'variables' | 'validation' | 'test' | 'analytics';

type Props = {
    open: boolean;
    activeTab: SidePanelTab;
    onTabChange: (tab: SidePanelTab) => void;
    onClose: () => void;
    /** Number of validation issues for the badge on the Validation tab. */
    validationCount?: number;
    /** Whether the test sandbox has unsaved transcript. */
    testRunning?: boolean;
    children: React.ReactNode;
};

/**
 * Tabbed side panel anchored to the right of the builder.
 *
 * @param props.open whether the panel is visible
 * @param props.activeTab which tab is currently shown
 * @param props.onTabChange tab switcher callback
 * @param props.onClose close button callback
 * @param props.validationCount badge for validation tab
 * @param props.testRunning live indicator on test tab
 */
export default function SidePanel({
    open,
    activeTab,
    onTabChange,
    onClose,
    validationCount,
    testRunning,
    children,
}: Props) {
    if (!open) return null;
    return (
        <aside className="w-[360px] flex-shrink-0 border-l border-slate-900/[0.06] bg-white flex flex-col h-full overflow-hidden">
            <header className="h-11 px-3 border-b border-slate-900/[0.06] flex items-center gap-1 flex-shrink-0">
                <TabButton
                    icon={<Variable className="w-3.5 h-3.5" strokeWidth={2} />}
                    label="Variables"
                    active={activeTab === 'variables'}
                    onClick={() => onTabChange('variables')}
                />
                <TabButton
                    icon={
                        validationCount && validationCount > 0 ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" strokeWidth={2} />
                        ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2} />
                        )
                    }
                    label="Validation"
                    badge={validationCount && validationCount > 0 ? String(validationCount) : undefined}
                    active={activeTab === 'validation'}
                    onClick={() => onTabChange('validation')}
                />
                <TabButton
                    icon={<FlaskConical className="w-3.5 h-3.5" strokeWidth={2} />}
                    label="Test"
                    badge={testRunning ? '●' : undefined}
                    badgeTone={testRunning ? 'live' : 'default'}
                    active={activeTab === 'test'}
                    onClick={() => onTabChange('test')}
                />
                <TabButton
                    icon={<BarChart3 className="w-3.5 h-3.5" strokeWidth={2} />}
                    label="Analytics"
                    active={activeTab === 'analytics'}
                    onClick={() => onTabChange('analytics')}
                />
                <div className="ml-auto" />
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close panel"
                    className="w-7 h-7 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-900/[0.04] transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </header>
            <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
        </aside>
    );
}

const TabButton: React.FC<{
    icon: React.ReactNode;
    label: string;
    badge?: string;
    badgeTone?: 'default' | 'live';
    active: boolean;
    onClick: () => void;
}> = ({ icon, label, badge, badgeTone = 'default', active, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className={cn(
            'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[12px] font-semibold transition-colors',
            active
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-900/[0.04]'
        )}
    >
        {icon}
        {label}
        {badge ? (
            <span
                className={cn(
                    'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold',
                    badgeTone === 'live'
                        ? 'bg-emerald-500/20 text-emerald-700 animate-pulse'
                        : active
                        ? 'bg-white/20 text-white'
                        : 'bg-amber-500/15 text-amber-700'
                )}
            >
                {badge}
            </span>
        ) : null}
    </button>
);

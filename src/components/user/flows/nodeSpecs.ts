/**
 * Single source of truth for everything visual about a node type:
 *   - icon / colors / category for the canvas card and palette
 *   - human-friendly label and short description
 *   - a `summary(node)` renderer that produces the one-liner that appears
 *     under the card title on the canvas
 *
 * Every component that needs to render a per-type chip, icon, or summary
 * pulls from here so the look stays consistent across palette, canvas,
 * config modal headers, validation chips, and the test transcript.
 */

import type { LucideIcon } from 'lucide-react';
import {
    MessageSquare,
    HelpCircle,
    Sparkles,
    CircleSlash,
    Inbox,
    GitBranch,
    Variable,
    Globe2,
    UserRound,
    LayoutGrid,
    Timer,
    CornerDownRight,
    Zap,
} from 'lucide-react';
import type { FlowNode, FlowNodeCategory, FlowNodeType } from './types';

export type NodeSpec = {
    type: FlowNodeType;
    label: string;
    description: string;
    category: FlowNodeCategory;
    icon: LucideIcon;
    /** Tailwind classes for the small icon tile. */
    iconBg: string;
    iconColor: string;
    /** Tailwind class for the 3px stripe down the left side of the card. */
    stripe: string;
    /** Color used for the matching node in the MiniMap. */
    miniMapColor: string;
    /** Whether the node renders something the user sees (affects validation hints). */
    rendersOutput: boolean;
    /** Short summary text used on the compact canvas card. */
    summary: (node: FlowNode) => string;
};

const truncate = (s: string | undefined, n = 60): string => {
    if (!s) return '';
    const t = String(s).trim();
    return t.length > n ? `${t.slice(0, n - 1)}\u2026` : t;
};

export const NODE_SPECS: Record<FlowNodeType, NodeSpec> = {
    message: {
        type: 'message',
        label: 'Message',
        description: 'Send a static or templated message to the visitor.',
        category: 'conversation',
        icon: MessageSquare,
        iconBg: 'bg-indigo-500/10',
        iconColor: 'text-indigo-600',
        stripe: 'bg-indigo-500',
        miniMapColor: '#6366f1',
        rendersOutput: true,
        summary: (n) => truncate((n as any).text) || 'No message text',
    },
    question: {
        type: 'question',
        label: 'Question',
        description: 'Ask the visitor and branch on quick-reply buttons.',
        category: 'conversation',
        icon: HelpCircle,
        iconBg: 'bg-violet-500/10',
        iconColor: 'text-violet-600',
        stripe: 'bg-violet-500',
        miniMapColor: '#8b5cf6',
        rendersOutput: true,
        summary: (n) => {
            const opts = (n as any).options?.length || 0;
            return `${truncate((n as any).text, 38) || 'Question'} \u2022 ${opts} option${opts === 1 ? '' : 's'}`;
        },
    },
    ai: {
        type: 'ai',
        label: 'AI reply',
        description: 'Hand off to the LLM with custom instructions.',
        category: 'conversation',
        icon: Sparkles,
        iconBg: 'bg-amber-500/10',
        iconColor: 'text-amber-600',
        stripe: 'bg-amber-500',
        miniMapColor: '#f59e0b',
        rendersOutput: true,
        summary: (n) => truncate((n as any).aiInstructions) || 'Use bot defaults',
    },
    end: {
        type: 'end',
        label: 'End',
        description: 'Close the conversation gracefully.',
        category: 'conversation',
        icon: CircleSlash,
        iconBg: 'bg-slate-500/10',
        iconColor: 'text-slate-600',
        stripe: 'bg-slate-400',
        miniMapColor: '#94a3b8',
        rendersOutput: true,
        summary: (n) => truncate((n as any).text) || 'Conversation ends',
    },
    capture: {
        type: 'capture',
        label: 'Capture input',
        description: 'Wait for visitor input and validate it into a variable.',
        category: 'conversation',
        icon: Inbox,
        iconBg: 'bg-sky-500/10',
        iconColor: 'text-sky-600',
        stripe: 'bg-sky-500',
        miniMapColor: '#0ea5e9',
        rendersOutput: true,
        summary: (n) => {
            const c = (n as any).capture;
            const v = c?.variable ? `{{vars.${c.variable}}}` : 'no variable';
            const k = c?.inputType || 'text';
            return `\u279c ${v} \u2022 ${k}`;
        },
    },
    branch: {
        type: 'branch',
        label: 'Branch',
        description: 'Route the conversation based on variables.',
        category: 'logic',
        icon: GitBranch,
        iconBg: 'bg-emerald-500/10',
        iconColor: 'text-emerald-600',
        stripe: 'bg-emerald-500',
        miniMapColor: '#10b981',
        rendersOutput: false,
        summary: (n) => {
            const c = (n as any).branch?.conditions?.length || 0;
            return `${c} rule${c === 1 ? '' : 's'} \u2022 fallback ${
                (n as any).branch?.fallbackNextNodeId ? '\u2713' : '\u2717'
            }`;
        },
    },
    set_variable: {
        type: 'set_variable',
        label: 'Set variable',
        description: 'Compute or assign a variable inline.',
        category: 'logic',
        icon: Variable,
        iconBg: 'bg-fuchsia-500/10',
        iconColor: 'text-fuchsia-600',
        stripe: 'bg-fuchsia-500',
        miniMapColor: '#d946ef',
        rendersOutput: false,
        summary: (n) => {
            const sv = (n as any).setVariable;
            if (!sv?.variable) return 'No variable assigned';
            return `vars.${sv.variable} = ${truncate(sv.value, 32) || '\u201c\u201d'}`;
        },
    },
    action_api: {
        type: 'action_api',
        label: 'Call API',
        description: 'Make an authenticated HTTP call and map the response.',
        category: 'action',
        icon: Globe2,
        iconBg: 'bg-blue-500/10',
        iconColor: 'text-blue-600',
        stripe: 'bg-blue-500',
        miniMapColor: '#3b82f6',
        rendersOutput: false,
        summary: (n) => {
            const a = (n as any).apiAction;
            if (!a?.url) return 'No URL configured';
            return `${a.method || 'GET'} ${truncate(a.url, 42)}`;
        },
    },
    action_handoff: {
        type: 'action_handoff',
        label: 'Talk to a human',
        description: 'Escalate to a live agent on a team.',
        category: 'action',
        icon: UserRound,
        iconBg: 'bg-rose-500/10',
        iconColor: 'text-rose-600',
        stripe: 'bg-rose-500',
        miniMapColor: '#f43f5e',
        rendersOutput: true,
        summary: (n) => `team: ${(n as any).handoff?.team || '\u2014'}`,
    },
    cards: {
        type: 'cards',
        label: 'Cards',
        description: 'Render product / option cards with action buttons.',
        category: 'conversation',
        icon: LayoutGrid,
        iconBg: 'bg-orange-500/10',
        iconColor: 'text-orange-600',
        stripe: 'bg-orange-500',
        miniMapColor: '#f97316',
        rendersOutput: true,
        summary: (n) => {
            const c = (n as any).cards?.length || 0;
            return `${c} card${c === 1 ? '' : 's'}`;
        },
    },
    delay: {
        type: 'delay',
        label: 'Pause',
        description: 'Show a typing indicator for N milliseconds.',
        category: 'conversation',
        icon: Timer,
        iconBg: 'bg-slate-500/10',
        iconColor: 'text-slate-600',
        stripe: 'bg-slate-400',
        miniMapColor: '#64748b',
        rendersOutput: true,
        summary: (n) => `${(n as any).delay?.ms ?? 0} ms`,
    },
    jump: {
        type: 'jump',
        label: 'Jump',
        description: 'Hop to another node \u2014 useful for shared sub-flows.',
        category: 'logic',
        icon: CornerDownRight,
        iconBg: 'bg-zinc-500/10',
        iconColor: 'text-zinc-700',
        stripe: 'bg-zinc-500',
        miniMapColor: '#71717a',
        rendersOutput: false,
        summary: (n) =>
            (n as any).jump?.nextNodeId
                ? `\u279c ${(n as any).jump.nextNodeId}`
                : 'No target',
    },
    trigger: {
        type: 'trigger',
        label: 'Trigger',
        description: 'Route the visitor based on the first message / intent.',
        category: 'trigger',
        icon: Zap,
        iconBg: 'bg-yellow-500/10',
        iconColor: 'text-yellow-600',
        stripe: 'bg-yellow-500',
        miniMapColor: '#eab308',
        rendersOutput: false,
        summary: (n) => {
            const t = (n as any).trigger;
            if (!t) return 'Trigger';
            if (t.matchType === 'keyword')
                return `keyword \u2022 ${t.keywords?.length || 0} word${
                    t.keywords?.length === 1 ? '' : 's'
                }`;
            if (t.matchType === 'intent') return `intent \u2022 ${t.intent || '\u2014'}`;
            return 'first message';
        },
    },
};

export const NODE_SPEC_LIST: NodeSpec[] = Object.values(NODE_SPECS);

// ---------------------------------------------------------------------------
// Palette grouping.
// ---------------------------------------------------------------------------

export type PaletteGroup = {
    category: FlowNodeCategory;
    label: string;
    description: string;
    items: NodeSpec[];
};

export const PALETTE_GROUPS: PaletteGroup[] = [
    {
        category: 'conversation',
        label: 'Conversation',
        description: 'What the visitor reads, hears, and answers.',
        items: NODE_SPEC_LIST.filter((s) => s.category === 'conversation'),
    },
    {
        category: 'logic',
        label: 'Logic',
        description: 'Branch, transform variables, jump.',
        items: NODE_SPEC_LIST.filter((s) => s.category === 'logic'),
    },
    {
        category: 'action',
        label: 'Actions',
        description: 'Reach out to APIs and live agents.',
        items: NODE_SPEC_LIST.filter((s) => s.category === 'action'),
    },
    {
        category: 'trigger',
        label: 'Triggers',
        description: 'Define how a flow is entered.',
        items: NODE_SPEC_LIST.filter((s) => s.category === 'trigger'),
    },
];

export const getNodeSpec = (type: FlowNodeType): NodeSpec => NODE_SPECS[type];

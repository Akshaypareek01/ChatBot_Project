import React, { useCallback, useMemo } from 'react';
import {
    ReactFlow,
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    Connection,
    Edge,
    Node,
    Panel,
    BackgroundVariant,
    Handle,
    Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
    Plus,
    Trash2,
    MessageSquare,
    HelpCircle,
    Sparkles,
    CircleSlash,
    GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FlowDocument, FlowNode, FlowNodeType, FlowOption } from './types';
import { createEmptyNode } from './utils';

/* -------------------------------------------------------------------------- */
/* Visual tokens                                                              */
/* -------------------------------------------------------------------------- */

type NodeVisual = {
    label: string;
    icon: React.ElementType;
    /** Vertical accent stripe on the left edge of the node card. */
    stripe: string;
    /** Icon tile background + icon color. */
    iconBg: string;
    iconColor: string;
};

const NODE_VISUALS: Record<FlowNodeType, NodeVisual> = {
    message: {
        label: 'Message',
        icon: MessageSquare,
        stripe: 'bg-indigo-500',
        iconBg: 'bg-indigo-500/10',
        iconColor: 'text-indigo-600',
    },
    question: {
        label: 'Question',
        icon: HelpCircle,
        stripe: 'bg-violet-500',
        iconBg: 'bg-violet-500/10',
        iconColor: 'text-violet-600',
    },
    ai: {
        label: 'AI reply',
        icon: Sparkles,
        stripe: 'bg-amber-500',
        iconBg: 'bg-amber-500/10',
        iconColor: 'text-amber-600',
    },
    end: {
        label: 'End',
        icon: CircleSlash,
        stripe: 'bg-slate-400',
        iconBg: 'bg-slate-500/10',
        iconColor: 'text-slate-600',
    },
};

/** Clean, flat input — matches the landing/login input style. */
const FlowInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({
    className,
    ...props
}) => (
    <input
        {...props}
        className={cn(
            'w-full h-8 px-2.5 rounded-md bg-white border border-slate-900/[0.08] text-[12.5px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/60 transition-colors',
            className
        )}
    />
);

const FlowTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({
    className,
    ...props
}) => (
    <textarea
        {...props}
        className={cn(
            'w-full px-2.5 py-2 rounded-md bg-white border border-slate-900/[0.08] text-[12.5px] leading-relaxed text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/60 transition-colors resize-none',
            className
        )}
    />
);

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        {children}
    </label>
);

/* -------------------------------------------------------------------------- */
/* Node                                                                        */
/* -------------------------------------------------------------------------- */

const BotNode = ({ data, id }: { data: any; id: string }) => {
    const { node, onUpdate, onDelete, isStart } = data as {
        node: FlowNode;
        onUpdate: (id: string, updates: Partial<FlowNode>) => void;
        onDelete: (id: string) => void;
        isStart: boolean;
    };

    const v = NODE_VISUALS[node.type];
    const Icon = v.icon;

    return (
        <div className="relative w-[300px] group/node">
            {/* Connection handles */}
            <Handle
                type="target"
                position={Position.Left}
                className="!w-2.5 !h-2.5 !bg-white !border-2 !border-slate-400 hover:!border-indigo-500 transition-colors"
            />

            <div className="relative rounded-xl bg-white border border-slate-900/[0.08] shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] overflow-hidden">
                {/* Accent stripe */}
                <div className={cn('absolute left-0 top-0 bottom-0 w-[3px]', v.stripe)} />

                {/* Header */}
                <div className="flex items-center justify-between pl-4 pr-2.5 py-2.5 border-b border-slate-900/[0.06]">
                    <div className="flex items-center gap-2">
                        <div
                            className={cn(
                                'w-6 h-6 rounded-md flex items-center justify-center',
                                v.iconBg,
                                v.iconColor
                            )}
                        >
                            <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                        </div>
                        <span className="text-[11.5px] font-semibold tracking-tight text-slate-700">
                            {v.label}
                        </span>
                        {isStart && (
                            <span className="inline-flex items-center h-5 px-2 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold uppercase tracking-[0.1em]">
                                Start
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-0.5">
                        <GripVertical
                            className="w-3.5 h-3.5 text-slate-300 group-hover/node:text-slate-500 transition-colors cursor-grab"
                            strokeWidth={2}
                        />
                        {!isStart && (
                            <button
                                type="button"
                                onClick={() => onDelete(id)}
                                className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                aria-label="Delete node"
                            >
                                <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Body */}
                <div className="p-3.5 pl-4 space-y-3 bg-white">
                    <div className="space-y-1">
                        <FieldLabel>Name</FieldLabel>
                        <FlowInput
                            value={node.title || ''}
                            onChange={(e) => onUpdate(id, { title: e.target.value })}
                            placeholder="e.g. Welcome message"
                        />
                    </div>

                    <div className="space-y-1">
                        <FieldLabel>
                            {node.type === 'ai' ? 'Instructions' : 'Message text'}
                        </FieldLabel>
                        <FlowTextarea
                            value={node.text || ''}
                            onChange={(e) => onUpdate(id, { text: e.target.value })}
                            rows={3}
                            placeholder={
                                node.type === 'message'
                                    ? 'What should the bot say here?'
                                    : node.type === 'question'
                                    ? 'Question to ask the user…'
                                    : node.type === 'ai'
                                    ? 'Let the AI answer based on KB…'
                                    : 'Closing message (optional)…'
                            }
                        />
                    </div>

                    {node.type === 'question' && (
                        <div className="pt-3 border-t border-slate-900/[0.06] space-y-2">
                            <div className="flex items-center justify-between">
                                <FieldLabel>Options</FieldLabel>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newOption: FlowOption = {
                                            id: `opt-${Math.random().toString(36).slice(2, 9)}`,
                                            label: 'New option',
                                            nextNodeId: '',
                                        };
                                        onUpdate(id, {
                                            options: [...(node.options || []), newOption],
                                        });
                                    }}
                                    className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-indigo-600 hover:text-indigo-700"
                                >
                                    <Plus className="w-3 h-3" strokeWidth={2.5} /> Add option
                                </button>
                            </div>
                            <div className="space-y-2">
                                {(node.options || []).map((opt, idx) => (
                                    <div key={opt.id} className="relative group/opt">
                                        <FlowInput
                                            value={opt.label}
                                            onChange={(e) => {
                                                const nextOptions = [...(node.options || [])];
                                                nextOptions[idx] = {
                                                    ...opt,
                                                    label: e.target.value,
                                                };
                                                onUpdate(id, { options: nextOptions });
                                            }}
                                            placeholder={`Option ${idx + 1}`}
                                            className="pr-8"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onUpdate(id, {
                                                    options: (node.options || []).filter(
                                                        (o) => o.id !== opt.id
                                                    ),
                                                })
                                            }
                                            className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover/opt:opacity-100 transition-all"
                                            aria-label="Remove option"
                                        >
                                            <Trash2 className="w-3 h-3" strokeWidth={2} />
                                        </button>
                                        <Handle
                                            type="source"
                                            position={Position.Right}
                                            id={opt.id}
                                            style={{ top: '50%', right: -8 }}
                                            className="!w-2.5 !h-2.5 !bg-white !border-2 !border-slate-400 hover:!border-indigo-500 transition-colors"
                                        />
                                    </div>
                                ))}
                                {(!node.options || node.options.length === 0) && (
                                    <p className="text-[11px] text-slate-400 italic">
                                        No options yet — add one to branch the flow.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Single source handle for message / ai / end */}
                {node.type !== 'question' && node.type !== 'end' && (
                    <Handle
                        type="source"
                        position={Position.Right}
                        className="!w-2.5 !h-2.5 !bg-white !border-2 !border-slate-400 hover:!border-indigo-500 transition-colors"
                    />
                )}
            </div>
        </div>
    );
};

const nodeTypes = {
    botNode: BotNode,
};

/* -------------------------------------------------------------------------- */
/* Toolbar — floating pill to add nodes                                        */
/* -------------------------------------------------------------------------- */

const AddNodeToolbar: React.FC<{ onAdd: (type: FlowNodeType) => void }> = ({ onAdd }) => {
    const items: { type: FlowNodeType; label: string; icon: React.ElementType }[] = [
        { type: 'message', label: 'Message', icon: MessageSquare },
        { type: 'question', label: 'Question', icon: HelpCircle },
        { type: 'ai', label: 'AI', icon: Sparkles },
        { type: 'end', label: 'End', icon: CircleSlash },
    ];

    return (
        <div className="inline-flex items-center gap-0.5 p-1 bg-white border border-slate-900/[0.08] rounded-lg shadow-[0_8px_30px_-12px_rgba(15,23,42,0.18)]">
            {items.map((item) => {
                const Icon = item.icon;
                const v = NODE_VISUALS[item.type];
                return (
                    <button
                        key={item.type}
                        onClick={() => onAdd(item.type)}
                        className="group/btn inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[12px] font-medium text-slate-600 hover:text-slate-950 hover:bg-slate-900/[0.04] transition-colors"
                    >
                        <Icon
                            className={cn(
                                'w-3.5 h-3.5 transition-colors',
                                v.iconColor
                            )}
                            strokeWidth={2}
                        />
                        {item.label}
                    </button>
                );
            })}
        </div>
    );
};

/* -------------------------------------------------------------------------- */
/* Main builder                                                                */
/* -------------------------------------------------------------------------- */

type Props = {
    value: FlowDocument;
    onChange: (next: FlowDocument) => void;
    className?: string;
};

export default function VisualFlowBuilder({ value, onChange, className }: Props) {
    const onUpdateNode = useCallback(
        (id: string, updates: Partial<FlowNode>) => {
            const nextNodes = value.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n));
            onChange({ ...value, nodes: nextNodes });
        },
        [value, onChange]
    );

    const onDeleteNode = useCallback(
        (id: string) => {
            const nextNodes = value.nodes.filter((n) => n.id !== id);
            const cleanedNodes = nextNodes.map((n) => ({
                ...n,
                options: n.options?.map((o) =>
                    o.nextNodeId === id ? { ...o, nextNodeId: '' } : o
                ),
                fallbackNextNodeId: n.fallbackNextNodeId === id ? '' : n.fallbackNextNodeId,
            }));
            onChange({ ...value, nodes: cleanedNodes });
        },
        [value, onChange]
    );

    const initialNodes: Node[] = useMemo(
        () =>
            value.nodes.map((node) => ({
                id: node.id,
                type: 'botNode',
                position: node.position || { x: 0, y: 0 },
                data: {
                    node,
                    onUpdate: onUpdateNode,
                    onDelete: onDeleteNode,
                    isStart: node.id === value.startNodeId || node.id === 'start',
                },
            })),
        [value.nodes, value.startNodeId, onUpdateNode, onDeleteNode]
    );

    const initialEdges: Edge[] = useMemo(() => {
        const edges: Edge[] = [];
        value.nodes.forEach((node) => {
            if (node.options && node.options.length > 0) {
                node.options.forEach((opt) => {
                    if (opt.nextNodeId) {
                        edges.push({
                            id: `edge-${node.id}-${opt.id}-${opt.nextNodeId}`,
                            source: node.id,
                            target: opt.nextNodeId,
                            sourceHandle: opt.id,
                            animated: true,
                            style: { stroke: '#94a3b8', strokeWidth: 1.5 },
                        });
                    }
                });
            } else if (node.fallbackNextNodeId) {
                edges.push({
                    id: `edge-${node.id}-fallback-${node.fallbackNextNodeId}`,
                    source: node.id,
                    target: node.fallbackNextNodeId,
                    animated: true,
                    style: { stroke: '#94a3b8', strokeWidth: 1.5 },
                });
            }
        });
        return edges;
    }, [value.nodes]);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    React.useEffect(() => {
        setNodes(initialNodes);
    }, [initialNodes, setNodes]);

    React.useEffect(() => {
        setEdges(initialEdges);
    }, [initialEdges, setEdges]);

    const onConnect = useCallback(
        (params: Connection) => {
            const { source, target, sourceHandle } = params;
            if (!source || !target) return;

            const nextNodes = value.nodes.map((node) => {
                if (node.id === source) {
                    if (sourceHandle) {
                        return {
                            ...node,
                            options: node.options?.map((opt) =>
                                opt.id === sourceHandle ? { ...opt, nextNodeId: target } : opt
                            ),
                        };
                    } else {
                        return { ...node, fallbackNextNodeId: target };
                    }
                }
                return node;
            });

            onChange({ ...value, nodes: nextNodes });
        },
        [value, onChange]
    );

    const onNodeDragStop = useCallback(
        (_: any, node: Node) => {
            const nextNodes = value.nodes.map((n) =>
                n.id === node.id ? { ...n, position: node.position } : n
            );
            onChange({ ...value, nodes: nextNodes });
        },
        [value, onChange]
    );

    const addNewNode = (type: FlowNodeType) => {
        const newNode = createEmptyNode(type);
        onChange({ ...value, nodes: [...value.nodes, newNode] });
    };

    return (
        <div
            className={cn(
                'h-[620px] w-full rounded-xl border border-slate-900/[0.08] bg-[#FAFAFA] overflow-hidden relative',
                className
            )}
        >
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeDragStop={onNodeDragStop}
                nodeTypes={nodeTypes}
                fitView
                proOptions={{ hideAttribution: true }}
                defaultEdgeOptions={{
                    animated: true,
                    style: { stroke: '#94a3b8', strokeWidth: 1.5 },
                }}
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={16}
                    size={1}
                    color="#cbd5e1"
                />
                <Controls
                    className="!bg-white !border !border-slate-900/[0.08] !rounded-lg !shadow-sm"
                    showInteractive={false}
                />
                <MiniMap
                    zoomable
                    pannable
                    className="!bg-white !border !border-slate-900/[0.08] !rounded-lg"
                    nodeColor={(n) => {
                        const type = (n.data as any)?.node?.type as FlowNodeType | undefined;
                        if (!type) return '#cbd5e1';
                        if (type === 'message') return '#6366f1';
                        if (type === 'question') return '#8b5cf6';
                        if (type === 'ai') return '#f59e0b';
                        return '#94a3b8';
                    }}
                    maskColor="rgba(248, 250, 252, 0.6)"
                />
                <Panel position="top-right">
                    <AddNodeToolbar onAdd={addNewNode} />
                </Panel>
            </ReactFlow>
        </div>
    );
}

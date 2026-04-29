/**
 * Visual flow builder \u2014 thin orchestrator on top of React Flow.
 *
 * Responsibilities (kept minimal so each layer stays under 250 lines):
 *   1. Render the NodePalette + canvas + (optional) panel slot.
 *   2. Adapt FlowDocument \u2194 React Flow nodes/edges via canvasAdapters.
 *   3. Open NodeConfigModal on double-click and on palette-item-just-added.
 *   4. Hand drag-drop palette adds + edge connects back to the parent
 *      through `onChange(nextDoc)`.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ReactFlow,
    MiniMap,
    Controls,
    Background,
    BackgroundVariant,
    Panel,
    useNodesState,
    useEdgesState,
    type Connection,
    type Edge,
    type Node,
    type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { cn } from '@/lib/utils';
import type { FlowDocument, FlowNode, FlowNodeType } from './types';
import { createEmptyNode, extractWrittenVariables } from './utils';
import { getNodeSpec } from './nodeSpecs';
import NodePalette, { PALETTE_DRAG_MIME } from './NodePalette';
import NodeConfigModal from './NodeConfigModal';
import CompactNode, { COMPACT_NODE_TYPE_KEY } from './nodes/CompactNode';
import {
    applyConnect,
    buildRfEdges,
    buildRfNodes,
    removeNode,
} from './canvas/canvasAdapters';

const nodeTypes = { [COMPACT_NODE_TYPE_KEY]: CompactNode };

type Props = {
    value: FlowDocument;
    onChange: (next: FlowDocument) => void;
    className?: string;
    /** Hide the palette (when rendered embedded somewhere small). */
    hidePalette?: boolean;
    /** Optional content rendered under the canvas (e.g. validation strip). */
    footerSlot?: React.ReactNode;
    /**
     * Externally requested selection. When this changes we recenter the
     * viewport on the matching node and visually highlight it. Used by the
     * Validation panel and Test sandbox to "jump to node".
     */
    focusNodeId?: string | null;
};

export default function VisualFlowBuilder({
    value,
    onChange,
    className,
    hidePalette,
    footerSlot,
    focusNodeId,
}: Props) {
    /**
     * Mutable refs so callbacks see the latest values without re-binding on
     * every keystroke. React Flow remounts heavy children when the props
     * shift, which kills focus inside any opened modal.
     */
    const valueRef = useRef(value);
    valueRef.current = value;
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);

    const variables = useMemo(() => extractWrittenVariables(value), [value]);

    const handleOpen = useCallback((id: string) => setEditingId(id), []);
    const handleDelete = useCallback((id: string) => {
        const v = valueRef.current;
        onChangeRef.current(removeNode(v, id));
    }, []);

    /**
     * Build initial RF nodes/edges from the FlowDocument. We rebuild only when
     * the underlying doc actually changes (parent passes a new object) \u2014
     * otherwise we patch RF state in place to keep selections stable.
     */
    const initialNodes: Node[] = useMemo(
        () =>
            buildRfNodes(value, {
                onOpen: handleOpen,
                onDelete: handleDelete,
            }),
        [value, handleOpen, handleDelete]
    );

    const initialEdges: Edge[] = useMemo(() => buildRfEdges(value), [value]);

    const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);

    useEffect(() => {
        setNodes(initialNodes);
        setEdges(initialEdges);
    }, [initialNodes, initialEdges, setNodes, setEdges]);

    /**
     * Recenter on focusNodeId whenever it flips. We also flip RF's
     * `selected` flag so the user gets the standard highlight ring.
     */
    useEffect(() => {
        if (!focusNodeId || !rfInstance) return;
        const target = value.nodes.find((n) => n.id === focusNodeId);
        if (!target?.position) return;
        rfInstance.setCenter(target.position.x + 150, target.position.y + 60, {
            zoom: 1.1,
            duration: 350,
        });
        setNodes((curr) =>
            curr.map((n) => ({ ...n, selected: n.id === focusNodeId }))
        );
    }, [focusNodeId, rfInstance, value.nodes, setNodes]);

    /** Persist node drag positions back into the document. */
    const onNodeDragStop = useCallback((_: any, node: Node) => {
        const v = valueRef.current;
        onChangeRef.current({
            ...v,
            nodes: v.nodes.map((n) =>
                n.id === node.id ? { ...n, position: node.position } : n
            ),
        });
    }, []);

    const onConnect = useCallback((params: Connection) => {
        const { source, target, sourceHandle } = params;
        if (!source || !target) return;
        onChangeRef.current(
            applyConnect(valueRef.current, { source, target, sourceHandle })
        );
    }, []);

    /* ---------- palette: drag-drop + click-to-add --------------------- */

    const insertNodeAt = useCallback(
        (type: FlowNodeType, position: { x: number; y: number }) => {
            const newNode = createEmptyNode(type);
            (newNode as any).position = position;
            const v = valueRef.current;
            onChangeRef.current({ ...v, nodes: [...v.nodes, newNode] });
            // open config modal on the next frame so RF has time to mount it
            setTimeout(() => setEditingId(newNode.id), 50);
        },
        []
    );

    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            const type = e.dataTransfer.getData(
                PALETTE_DRAG_MIME
            ) as FlowNodeType;
            if (!type || !wrapperRef.current || !rfInstance) return;
            const bounds = wrapperRef.current.getBoundingClientRect();
            const position = rfInstance.screenToFlowPosition({
                x: e.clientX - bounds.left,
                y: e.clientY - bounds.top,
            });
            insertNodeAt(type, position);
        },
        [rfInstance, insertNodeAt]
    );

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }, []);

    const handlePaletteClick = useCallback(
        (type: FlowNodeType) => {
            const center =
                rfInstance?.screenToFlowPosition({
                    x: (wrapperRef.current?.clientWidth || 800) / 2,
                    y: (wrapperRef.current?.clientHeight || 600) / 2,
                }) || { x: 240, y: 200 };
            insertNodeAt(type, center);
        },
        [rfInstance, insertNodeAt]
    );

    /* ---------- modal: save edited node ------------------------------ */

    const editingNode = useMemo<FlowNode | null>(
        () => value.nodes.find((n) => n.id === editingId) || null,
        [value.nodes, editingId]
    );

    const handleSaveNode = useCallback((next: FlowNode) => {
        const v = valueRef.current;
        onChangeRef.current({
            ...v,
            nodes: v.nodes.map((n) => (n.id === next.id ? next : n)),
        });
    }, []);

    return (
        <div
            className={cn(
                'flex w-full overflow-hidden rounded-xl border border-slate-900/[0.08] bg-[#FAFAFA]',
                className
            )}
        >
            {!hidePalette && (
                <NodePalette onAddNode={handlePaletteClick} />
            )}

            <div className="flex-1 min-w-0 flex flex-col">
                <div
                    ref={wrapperRef}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="relative flex-1 min-h-[480px]"
                >
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeDragStop={onNodeDragStop}
                        onInit={setRfInstance}
                        nodeTypes={nodeTypes}
                        fitView
                        proOptions={{ hideAttribution: true }}
                        deleteKeyCode={null}
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
                                const t = (n.data as any)?.node?.type as
                                    | FlowNodeType
                                    | undefined;
                                return t
                                    ? getNodeSpec(t).miniMapColor
                                    : '#cbd5e1';
                            }}
                            maskColor="rgba(248, 250, 252, 0.6)"
                        />
                        <Panel position="top-left">
                            <CanvasHint />
                        </Panel>
                    </ReactFlow>
                </div>
                {footerSlot}
            </div>

            <NodeConfigModal
                open={!!editingNode}
                node={editingNode}
                isStart={editingNode?.id === value.startNodeId}
                onClose={() => setEditingId(null)}
                onSave={handleSaveNode}
                nodes={value.nodes}
                variables={variables}
            />
        </div>
    );
}

const CanvasHint: React.FC = () => (
    <div className="px-3 py-2 rounded-lg bg-white/90 backdrop-blur border border-slate-900/[0.06] text-[11px] text-slate-500 leading-snug max-w-[260px] shadow-sm">
        Drag a node from the library, or click any card to edit. Double-click
        opens the full configuration.
    </div>
);

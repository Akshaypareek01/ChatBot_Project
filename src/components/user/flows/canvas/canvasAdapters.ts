/**
 * Helpers that adapt a FlowDocument (server-shape) to React Flow nodes/edges
 * and back. Pure functions \u2014 no React state \u2014 so the canvas component
 * stays small.
 */

import type { Edge, Node } from '@xyflow/react';
import type { FlowDocument, FlowNode, FlowOption } from '../types';
import { COMPACT_NODE_TYPE_KEY } from '../nodes/CompactNode';

export type RFEdge = Edge;
export type RFNode = Node;

export const buildRfNodes = (
    doc: FlowDocument,
    callbacks: {
        onOpen: (id: string) => void;
        onDelete: (id: string) => void;
    }
): RFNode[] =>
    doc.nodes.map((n) => ({
        id: n.id,
        type: COMPACT_NODE_TYPE_KEY,
        position: n.position || { x: 80, y: 80 },
        data: {
            node: n,
            isStart: n.id === doc.startNodeId,
            ...callbacks,
        },
    }));

const baseEdge = (
    id: string,
    source: string,
    sourceHandle: string | undefined,
    target: string,
    label?: string
): RFEdge => ({
    id,
    source,
    sourceHandle,
    target,
    label,
    animated: true,
    style: { stroke: '#94a3b8', strokeWidth: 1.5 },
    labelStyle: {
        fill: '#475569',
        fontSize: 10.5,
        fontWeight: 600,
    },
    labelBgStyle: { fill: '#fff', stroke: '#e2e8f0' },
    labelBgPadding: [4, 2] as any,
    labelBgBorderRadius: 4,
});

/**
 * Walk every node and produce the right edges based on its type. We support
 * the legacy options/fallback model AND the new per-type next ids.
 */
export const buildRfEdges = (doc: FlowDocument): RFEdge[] => {
    const out: RFEdge[] = [];

    doc.nodes.forEach((node) => {
        if (node.type === 'question') {
            (node.options || []).forEach((opt: FlowOption) => {
                if (opt.nextNodeId) {
                    out.push(
                        baseEdge(
                            `${node.id}->${opt.id}->${opt.nextNodeId}`,
                            node.id,
                            opt.id,
                            opt.nextNodeId,
                            opt.label
                        )
                    );
                }
            });
            if (node.fallbackNextNodeId) {
                out.push(
                    baseEdge(
                        `${node.id}->fallback->${node.fallbackNextNodeId}`,
                        node.id,
                        undefined,
                        node.fallbackNextNodeId,
                        'fallback'
                    )
                );
            }
            return;
        }

        if (node.type === 'branch') {
            const conds = node.branch?.conditions || [];
            conds.forEach((c, i) => {
                if (c.nextNodeId) {
                    out.push(
                        baseEdge(
                            `${node.id}->cond${i}->${c.nextNodeId}`,
                            node.id,
                            `cond-${i}`,
                            c.nextNodeId,
                            `${c.variable || '?'} ${c.op}`
                        )
                    );
                }
            });
            if (node.branch?.fallbackNextNodeId) {
                out.push(
                    baseEdge(
                        `${node.id}->bfall->${node.branch.fallbackNextNodeId}`,
                        node.id,
                        'fallback',
                        node.branch.fallbackNextNodeId,
                        'else'
                    )
                );
            }
            return;
        }

        if (node.type === 'action_api') {
            const a = node.apiAction;
            if (a?.onSuccessNodeId) {
                out.push(
                    baseEdge(
                        `${node.id}->ok->${a.onSuccessNodeId}`,
                        node.id,
                        'success',
                        a.onSuccessNodeId,
                        'success'
                    )
                );
            }
            if (a?.onErrorNodeId) {
                out.push(
                    baseEdge(
                        `${node.id}->err->${a.onErrorNodeId}`,
                        node.id,
                        'error',
                        a.onErrorNodeId,
                        'error'
                    )
                );
            }
            return;
        }

        // capture: nextNodeId + fallbackNextNodeId
        if (node.type === 'capture') {
            const c = node.capture;
            if (c?.nextNodeId) {
                out.push(
                    baseEdge(
                        `${node.id}->cap->${c.nextNodeId}`,
                        node.id,
                        undefined,
                        c.nextNodeId
                    )
                );
            }
            if (c?.fallbackNextNodeId) {
                out.push(
                    baseEdge(
                        `${node.id}->capfb->${c.fallbackNextNodeId}`,
                        node.id,
                        undefined,
                        c.fallbackNextNodeId,
                        'on retries fail'
                    )
                );
            }
            return;
        }

        // delay / set_variable / jump: pull next id from sub-config
        let next: string | undefined | null;
        if (node.type === 'delay') next = node.delay?.nextNodeId;
        if (node.type === 'set_variable') next = node.setVariable?.nextNodeId;
        if (node.type === 'jump') next = node.jump?.nextNodeId;
        if (node.type === 'trigger') next = node.trigger?.nextNodeId;

        // generic fallback for the rest
        if (!next) next = node.fallbackNextNodeId || undefined;

        if (next) {
            out.push(
                baseEdge(`${node.id}->next->${next}`, node.id, undefined, next)
            );
        }
    });

    return out;
};

/**
 * Connect-handler: when an author drags an edge, write the new target into
 * whichever sub-config matches the source handle.
 */
export const applyConnect = (
    doc: FlowDocument,
    params: { source: string; target: string; sourceHandle?: string | null }
): FlowDocument => {
    const { source, target, sourceHandle } = params;
    const nextNodes = doc.nodes.map((n) => {
        if (n.id !== source) return n;

        if (n.type === 'question') {
            if (sourceHandle) {
                return {
                    ...n,
                    options: (n.options || []).map((o) =>
                        o.id === sourceHandle ? { ...o, nextNodeId: target } : o
                    ),
                };
            }
            return { ...n, fallbackNextNodeId: target };
        }

        if (n.type === 'branch') {
            if (sourceHandle === 'fallback') {
                return {
                    ...n,
                    branch: {
                        ...(n.branch || { conditions: [] }),
                        fallbackNextNodeId: target,
                    },
                };
            }
            if (sourceHandle?.startsWith('cond-')) {
                const idx = parseInt(sourceHandle.slice('cond-'.length), 10);
                return {
                    ...n,
                    branch: {
                        ...(n.branch || { conditions: [] }),
                        conditions: (n.branch?.conditions || []).map((c, i) =>
                            i === idx ? { ...c, nextNodeId: target } : c
                        ),
                    },
                };
            }
        }

        if (n.type === 'action_api') {
            if (sourceHandle === 'success') {
                return {
                    ...n,
                    apiAction: {
                        ...(n.apiAction as any),
                        onSuccessNodeId: target,
                    },
                };
            }
            if (sourceHandle === 'error') {
                return {
                    ...n,
                    apiAction: {
                        ...(n.apiAction as any),
                        onErrorNodeId: target,
                    },
                };
            }
        }

        // sub-config-aware updates for "linear" node types
        if (n.type === 'capture') {
            return {
                ...n,
                capture: { ...(n.capture as any), nextNodeId: target },
            };
        }
        if (n.type === 'delay') {
            return {
                ...n,
                delay: { ...(n.delay as any), nextNodeId: target },
            };
        }
        if (n.type === 'set_variable') {
            return {
                ...n,
                setVariable: { ...(n.setVariable as any), nextNodeId: target },
            };
        }
        if (n.type === 'jump') {
            return {
                ...n,
                jump: { ...(n.jump as any), nextNodeId: target },
            };
        }
        if (n.type === 'trigger') {
            return {
                ...n,
                trigger: { ...(n.trigger as any), nextNodeId: target },
            };
        }

        return { ...n, fallbackNextNodeId: target } as FlowNode;
    });

    return { ...doc, nodes: nextNodes };
};

/**
 * Strips every reference to a node we just deleted so the graph stays
 * consistent.
 */
export const removeNode = (doc: FlowDocument, id: string): FlowDocument => {
    const cleaned = doc.nodes
        .filter((n) => n.id !== id)
        .map((n) => {
            const next: any = { ...n };
            if (n.fallbackNextNodeId === id) next.fallbackNextNodeId = '';
            if (n.options) {
                next.options = n.options.map((o) =>
                    o.nextNodeId === id ? { ...o, nextNodeId: '' } : o
                );
            }
            if (n.type === 'capture' && n.capture) {
                next.capture = {
                    ...n.capture,
                    nextNodeId:
                        n.capture.nextNodeId === id ? '' : n.capture.nextNodeId,
                    fallbackNextNodeId:
                        n.capture.fallbackNextNodeId === id
                            ? ''
                            : n.capture.fallbackNextNodeId,
                };
            }
            if (n.type === 'branch' && n.branch) {
                next.branch = {
                    ...n.branch,
                    fallbackNextNodeId:
                        n.branch.fallbackNextNodeId === id
                            ? ''
                            : n.branch.fallbackNextNodeId,
                    conditions: (n.branch.conditions || []).map((c) =>
                        c.nextNodeId === id ? { ...c, nextNodeId: '' } : c
                    ),
                };
            }
            if (n.type === 'action_api' && n.apiAction) {
                next.apiAction = {
                    ...n.apiAction,
                    onSuccessNodeId:
                        n.apiAction.onSuccessNodeId === id
                            ? ''
                            : n.apiAction.onSuccessNodeId,
                    onErrorNodeId:
                        n.apiAction.onErrorNodeId === id
                            ? ''
                            : n.apiAction.onErrorNodeId,
                };
            }
            if (n.type === 'delay' && n.delay) {
                next.delay = {
                    ...n.delay,
                    nextNodeId:
                        n.delay.nextNodeId === id ? '' : n.delay.nextNodeId,
                };
            }
            if (n.type === 'set_variable' && n.setVariable) {
                next.setVariable = {
                    ...n.setVariable,
                    nextNodeId:
                        n.setVariable.nextNodeId === id
                            ? ''
                            : n.setVariable.nextNodeId,
                };
            }
            if (n.type === 'jump' && n.jump) {
                next.jump = {
                    ...n.jump,
                    nextNodeId: n.jump.nextNodeId === id ? '' : n.jump.nextNodeId,
                };
            }
            if (n.type === 'trigger' && n.trigger) {
                next.trigger = {
                    ...n.trigger,
                    nextNodeId:
                        n.trigger.nextNodeId === id ? '' : n.trigger.nextNodeId,
                };
            }
            return next as FlowNode;
        });

    return {
        ...doc,
        nodes: cleaned,
        startNodeId: doc.startNodeId === id ? cleaned[0]?.id || '' : doc.startNodeId,
    };
};

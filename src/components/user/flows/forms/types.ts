/**
 * Common props every per-type form receives. Keeps the form files focused
 * on schema and avoids prop-drilling boilerplate at every call site.
 */

import type { FlowNode } from '../types';

export type FormCtx = {
    /** All nodes in the current flow (used for "next node" pickers). */
    nodes: FlowNode[];
    /** Names of variables already written to in this flow. */
    variables: string[];
};

export type NodeFormProps<T extends FlowNode> = {
    node: T;
    onChange: (updates: Partial<T>) => void;
    ctx: FormCtx;
};

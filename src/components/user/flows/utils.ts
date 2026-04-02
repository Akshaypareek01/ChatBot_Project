import { FlowDocument, FlowNode, FlowNodeType, FlowOption } from './types';

const uid = () => Math.random().toString(36).slice(2, 9);

export const prettyJson = (obj: unknown) => JSON.stringify(obj, null, 2);

export const createEmptyNode = (type: FlowNodeType, id?: string): FlowNode => ({
  id: id || `${type}-${uid()}`,
  type,
  title: type === 'message' ? 'Bot Response' : type === 'question' ? 'Question' : type === 'ai' ? 'AI Step' : 'End',
  text: type === 'end' ? 'Conversation ended.' : '',
  options: [],
  conditions: [],
  fallbackNextNodeId: '',
  aiInstructions: '',
});

export const createEmptyFlow = (): FlowDocument => ({
  startNodeId: 'start',
  isActive: false,
  nodes: [
    {
      id: 'start',
      type: 'message',
      title: 'Start',
      text: 'Hello! How can I help?',
      options: [],
      conditions: [],
      fallbackNextNodeId: '',
      aiInstructions: '',
    },
  ],
});

export const normalizeFlow = (raw: any): FlowDocument => {
  const nodes = Array.isArray(raw?.nodes) ? raw.nodes : [];
  const safeNodes: FlowNode[] = nodes.map((n: any) => ({
    id: String(n?.id || `node-${uid()}`),
    type: (n?.type || 'message') as FlowNodeType,
    title: n?.title || '',
    text: n?.text || '',
    options: Array.isArray(n?.options) ? n.options.map((o: any): FlowOption => ({
      id: String(o?.id || `opt-${uid()}`),
      label: String(o?.label || ''),
      nextNodeId: o?.nextNodeId ? String(o.nextNodeId) : '',
    })) : [],
    conditions: Array.isArray(n?.conditions) ? n.conditions : [],
    fallbackNextNodeId: n?.fallbackNextNodeId ? String(n.fallbackNextNodeId) : '',
    aiInstructions: n?.aiInstructions || '',
  }));

  const startNodeId = raw?.startNodeId || safeNodes[0]?.id || 'start';
  return { startNodeId, isActive: !!raw?.isActive, nodes: safeNodes.length ? safeNodes : createEmptyFlow().nodes };
};

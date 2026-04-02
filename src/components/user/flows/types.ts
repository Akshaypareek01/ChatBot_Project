export type FlowNodeType = 'message' | 'question' | 'ai' | 'end';

export type FlowOption = {
  id: string;
  label: string;
  nextNodeId?: string;
};

export type FlowCondition = {
  match: 'contains' | 'equals' | 'regex' | 'intent';
  value: string;
  nextNodeId: string;
};

export type FlowNode = {
  id: string;
  type: FlowNodeType;
  title?: string;
  text?: string;
  options?: FlowOption[];
  conditions?: FlowCondition[];
  fallbackNextNodeId?: string;
  aiInstructions?: string;
};

export type FlowDocument = {
  startNodeId: string;
  isActive: boolean;
  nodes: FlowNode[];
};

export type FlowSummary = {
  _id: string;
  name: string;
  isActive: boolean;
  updatedAt?: string;
};

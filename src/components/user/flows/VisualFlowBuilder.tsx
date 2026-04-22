import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Panel,
  BackgroundVariant,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, MessageSquare, HelpCircle, Zap, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FlowDocument, FlowNode, FlowNodeType, FlowOption } from './types';
import { createEmptyNode } from './utils';

// Custom Node Components
const BotNode = ({ data, id }: { data: any, id: string }) => {
  const { node, onUpdate, onDelete } = data;
  const isStart = node.id === 'start';

  const Icon = node.type === 'message' ? MessageSquare : 
               node.type === 'question' ? HelpCircle :
               node.type === 'ai' ? Zap : Ban;

  const nodeColor = node.type === 'message' ? 'border-blue-500/50 bg-blue-50/50' : 
                   node.type === 'question' ? 'border-purple-500/50 bg-purple-50/50' :
                   node.type === 'ai' ? 'border-amber-500/50 bg-amber-50/50' : 'border-gray-500/50 bg-gray-50/50';

  return (
    <Card className={cn("w-[280px] shadow-lg border-2", nodeColor)}>
      {isStart && (
        <div className="absolute -top-3 left-4 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
          START
        </div>
      )}
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-primary border-2 border-background" />
      <CardHeader className="p-3 border-b flex flex-row items-center justify-between space-y-0 bg-white/50">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", 
            node.type === 'message' ? 'text-blue-600' : 
            node.type === 'question' ? 'text-purple-600' : 
            node.type === 'ai' ? 'text-amber-600' : 'text-gray-600'
          )} />
          <CardTitle className="text-xs font-bold uppercase tracking-wider">{node.type}</CardTitle>
        </div>
        {!isStart && (
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => onDelete(id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-3 space-y-3 bg-white/30">
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground uppercase">Title</label>
          <Input 
            value={node.title || ''} 
            onChange={(e) => onUpdate(id, { title: e.target.value })}
            className="h-8 text-sm"
            placeholder="Node title..."
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground uppercase">Content</label>
          <Textarea 
            value={node.text || ''} 
            onChange={(e) => onUpdate(id, { text: e.target.value })}
            className="text-sm min-h-[60px] resize-none"
            placeholder="Enter message text..."
          />
        </div>

        {node.type === 'question' && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-medium text-muted-foreground uppercase">Options</label>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => {
                const newOption = { id: `opt-${Math.random().toString(36).slice(2, 9)}`, label: 'New Option', nextNodeId: '' };
                onUpdate(id, { options: [...(node.options || []), newOption] });
              }}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-2">
              {(node.options || []).map((opt: FlowOption, idx: number) => (
                <div key={opt.id} className="relative group">
                  <Input 
                    value={opt.label}
                    onChange={(e) => {
                      const nextOptions = [...node.options!];
                      nextOptions[idx] = { ...opt, label: e.target.value };
                      onUpdate(id, { options: nextOptions });
                    }}
                    className="h-8 pr-8 text-xs"
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-1 top-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => {
                      onUpdate(id, { options: node.options!.filter((o: FlowOption) => o.id !== opt.id) });
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                  <Handle 
                    type="source" 
                    position={Position.Right} 
                    id={opt.id}
                    style={{ top: '50%', right: -8 }}
                    className="w-3 h-3 bg-primary" 
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {(node.type === 'message' || node.type === 'ai') && (
           <Handle type="source" position={Position.Right} className="w-3 h-3 bg-primary" />
        )}
      </CardContent>
    </Card>
  );
};

const nodeTypes = {
  botNode: BotNode,
};

type Props = {
  value: FlowDocument;
  onChange: (next: FlowDocument) => void;
  className?: string;
};

export default function VisualFlowBuilder({ value, onChange, className }: Props) {
  const onUpdateNode = useCallback((id: string, updates: Partial<FlowNode>) => {
    const nextNodes = value.nodes.map(n => n.id === id ? { ...n, ...updates } : n);
    onChange({ ...value, nodes: nextNodes });
  }, [value, onChange]);

  const onDeleteNode = useCallback((id: string) => {
    const nextNodes = value.nodes.filter(n => n.id !== id);
    // Also clean up references to this node
    const cleanedNodes = nextNodes.map(n => ({
      ...n,
      options: n.options?.map(o => o.nextNodeId === id ? { ...o, nextNodeId: '' } : o),
      fallbackNextNodeId: n.fallbackNextNodeId === id ? '' : n.fallbackNextNodeId
    }));
    onChange({ ...value, nodes: cleanedNodes });
  }, [value, onChange]);

  const initialNodes: Node[] = useMemo(() => value.nodes.map((node) => ({
    id: node.id,
    type: 'botNode',
    position: node.position || { x: 0, y: 0 },
    data: { 
      node,
      onUpdate: onUpdateNode,
      onDelete: onDeleteNode,
    },
  })), [value.nodes, onUpdateNode, onDeleteNode]);

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
            });
          }
        });
      } else if (node.fallbackNextNodeId) {
        edges.push({
          id: `edge-${node.id}-fallback-${node.fallbackNextNodeId}`,
          source: node.id,
          target: node.fallbackNextNodeId,
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

  const onConnect = useCallback((params: Connection) => {
    const { source, target, sourceHandle } = params;
    if (!source || !target) return;

    const nextNodes = value.nodes.map((node) => {
      if (node.id === source) {
        if (sourceHandle) {
          // It's an option connection
          return {
            ...node,
            options: node.options?.map((opt) => opt.id === sourceHandle ? { ...opt, nextNodeId: target } : opt),
          };
        } else {
          // It's a fallback/direct connection
          return { ...node, fallbackNextNodeId: target };
        }
      }
      return node;
    });

    onChange({ ...value, nodes: nextNodes });
  }, [value, onChange]);

  const onNodeDragStop = useCallback((_: any, node: Node) => {
    const nextNodes = value.nodes.map(n => n.id === node.id ? { ...n, position: node.position } : n);
    onChange({ ...value, nodes: nextNodes });
  }, [value, onChange]);

  const addNewNode = (type: FlowNodeType) => {
    const newNode = createEmptyNode(type);
    onChange({ ...value, nodes: [...value.nodes, newNode] });
  };

  return (
    <div className={cn("h-[600px] w-full border rounded-xl bg-muted/5 overflow-hidden relative group", className)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        <Controls />
        <MiniMap zoomable pannable />
        <Panel position="top-right" className="flex gap-2">
          <Button size="sm" onClick={() => addNewNode('message')} className="shadow-md">
            <Plus className="h-4 w-4 mr-1" /> Add Message
          </Button>
          <Button size="sm" onClick={() => addNewNode('question')} className="shadow-md">
            <Plus className="h-4 w-4 mr-1" /> Add Question
          </Button>
          <Button size="sm" onClick={() => addNewNode('ai')} className="shadow-md">
            <Plus className="h-4 w-4 mr-1" /> Add AI
          </Button>
          <Button size="sm" onClick={() => addNewNode('end')} className="shadow-md">
            <Plus className="h-4 w-4 mr-1" /> Add End
          </Button>
        </Panel>
      </ReactFlow>
    </div>
  );
}

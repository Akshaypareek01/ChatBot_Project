import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { FlowDocument, FlowNode, FlowNodeType } from './types';
import { createEmptyNode } from './utils';

type Props = {
  value: FlowDocument;
  onChange: (next: FlowDocument) => void;
};

const NODE_TYPES: FlowNodeType[] = ['message', 'question', 'ai', 'end'];

export default function FlowCanvas({ value, onChange }: Props) {
  const nodeIds = value.nodes.map((n) => n.id);

  const setNode = (nodeId: string, updater: (node: FlowNode) => FlowNode) => {
    onChange({
      ...value,
      nodes: value.nodes.map((n) => (n.id === nodeId ? updater(n) : n)),
    });
  };

  const addNode = (type: FlowNodeType) => {
    const created = createEmptyNode(type);
    onChange({ ...value, nodes: [...value.nodes, created] });
  };

  const deleteNode = (nodeId: string) => {
    const nodes = value.nodes.filter((n) => n.id !== nodeId);
    const cleaned = nodes.map((node) => ({
      ...node,
      options: (node.options || []).map((o) => ({
        ...o,
        nextNodeId: o.nextNodeId === nodeId ? '' : o.nextNodeId,
      })),
      fallbackNextNodeId: node.fallbackNextNodeId === nodeId ? '' : node.fallbackNextNodeId,
    }));
    onChange({
      ...value,
      startNodeId: value.startNodeId === nodeId ? cleaned[0]?.id || '' : value.startNodeId,
      nodes: cleaned,
    });
  };

  const addOption = (nodeId: string) => {
    setNode(nodeId, (node) => ({
      ...node,
      options: [...(node.options || []), { id: `opt-${Date.now()}`, label: 'New option', nextNodeId: '' }],
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {NODE_TYPES.map((type) => (
          <Button key={type} size="sm" variant="outline" onClick={() => addNode(type)}>
            <Plus className="h-4 w-4 mr-2" />
            Add {type}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {value.nodes.map((node) => (
          <Card key={node.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Input
                    className="h-8 w-40 font-mono text-xs"
                    value={node.id}
                    onChange={(e) => {
                      const nextId = e.target.value.trim();
                      if (!nextId) return;
                      const nodes = value.nodes.map((n) => {
                        if (n.id === node.id) return { ...n, id: nextId };
                        return {
                          ...n,
                          options: (n.options || []).map((o) => ({
                            ...o,
                            nextNodeId: o.nextNodeId === node.id ? nextId : o.nextNodeId,
                          })),
                          fallbackNextNodeId: n.fallbackNextNodeId === node.id ? nextId : n.fallbackNextNodeId,
                        };
                      });
                      onChange({
                        ...value,
                        startNodeId: value.startNodeId === node.id ? nextId : value.startNodeId,
                        nodes,
                      });
                    }}
                  />
                  <Select value={node.type} onValueChange={(nextType: FlowNodeType) => setNode(node.id, (n) => ({ ...n, type: nextType }))}>
                    <SelectTrigger className="h-8 w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NODE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {value.startNodeId === node.id ? <span className="text-xs text-green-600 font-medium">Start node</span> : null}
                </div>
                <Button size="sm" variant="ghost" onClick={() => deleteNode(node.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={node.title || ''}
                onChange={(e) => setNode(node.id, (n) => ({ ...n, title: e.target.value }))}
                placeholder="Step title"
              />
              <Textarea
                rows={3}
                value={node.text || ''}
                onChange={(e) => setNode(node.id, (n) => ({ ...n, text: e.target.value }))}
                placeholder={node.type === 'question' ? 'Ask user a question...' : 'Bot response text...'}
              />

              {node.type === 'ai' ? (
                <Textarea
                  rows={2}
                  value={node.aiInstructions || ''}
                  onChange={(e) => setNode(node.id, (n) => ({ ...n, aiInstructions: e.target.value }))}
                  placeholder="AI instructions"
                />
              ) : null}

              <div className="space-y-2">
                {(node.options || []).map((option) => (
                  <div key={option.id} className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input
                      value={option.label}
                      onChange={(e) =>
                        setNode(node.id, (n) => ({
                          ...n,
                          options: (n.options || []).map((o) => (o.id === option.id ? { ...o, label: e.target.value } : o)),
                        }))
                      }
                      placeholder="Button label"
                    />
                    <Select
                      value={option.nextNodeId || '__none__'}
                      onValueChange={(nextId) =>
                        setNode(node.id, (n) => ({
                          ...n,
                          options: (n.options || []).map((o) =>
                            o.id === option.id ? { ...o, nextNodeId: nextId === '__none__' ? '' : nextId } : o
                          ),
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Go to step" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No target</SelectItem>
                        {nodeIds.map((id) => (
                          <SelectItem key={id} value={id}>
                            {id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setNode(node.id, (n) => ({
                          ...n,
                          options: (n.options || []).filter((o) => o.id !== option.id),
                        }))
                      }
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => addOption(node.id)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add button
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

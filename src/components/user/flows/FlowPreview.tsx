import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FlowDocument, FlowNode } from './types';

type Msg = { role: 'bot' | 'user'; text: string };

type Props = {
  flow: FlowDocument;
};

const getNodeMap = (nodes: FlowNode[]) => new Map(nodes.map((n) => [n.id, n]));

export default function FlowPreview({ flow }: Props) {
  const nodeMap = useMemo(() => getNodeMap(flow.nodes), [flow.nodes]);
  const [currentId, setCurrentId] = useState(flow.startNodeId);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');

  const current = nodeMap.get(currentId);

  const gotoNode = (id?: string) => {
    if (!id) return;
    setCurrentId(id);
    const next = nodeMap.get(id);
    if (next?.text) {
      setMessages((prev) => [...prev, { role: 'bot', text: next.text || '' }]);
    }
    if (next?.type === 'ai') {
      setMessages((prev) => [...prev, { role: 'bot', text: 'AI reply will run here in widget runtime.' }]);
    }
  };

  const restart = () => {
    setCurrentId(flow.startNodeId);
    setMessages([]);
    const start = nodeMap.get(flow.startNodeId);
    if (start?.text) setMessages([{ role: 'bot', text: start.text }]);
  };

  React.useEffect(() => {
    restart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow.startNodeId, flow.nodes.length]);

  const submitQuestion = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { role: 'user', text: input.trim() }]);
    setInput('');
    gotoNode(current?.fallbackNextNodeId);
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          Live Preview
          <Button variant="outline" size="sm" onClick={restart}>
            Restart
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border p-3 h-[420px] overflow-y-auto bg-muted/20">
          <div className="space-y-2">
            {messages.map((m, idx) => (
              <div
                key={`${m.role}-${idx}`}
                className={`max-w-[88%] rounded-lg px-3 py-2 text-sm ${m.role === 'bot' ? 'bg-white border' : 'bg-primary text-primary-foreground ml-auto'}`}
              >
                {m.text}
              </div>
            ))}
          </div>
        </div>

        {current?.options?.length ? (
          <div className="flex flex-wrap gap-2">
            {current.options.map((o) => (
              <Button
                key={o.id}
                variant="outline"
                size="sm"
                onClick={() => {
                  setMessages((prev) => [...prev, { role: 'user', text: o.label }]);
                  gotoNode(o.nextNodeId);
                }}
              >
                {o.label || 'Option'}
              </Button>
            ))}
          </div>
        ) : null}

        {current?.type === 'question' ? (
          <div className="flex gap-2">
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type test reply..." />
            <Button onClick={submitQuestion}>Send</Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

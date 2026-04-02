import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Trash2, Plus, Save, Power } from 'lucide-react';
import { createFlow, deleteFlow, getFlow, getFlowTemplates, listFlows, updateFlow } from '@/services/api';
import { useBot } from '@/context/BotContext';
import FlowCanvas from './flows/FlowCanvas';
import FlowPreview from './flows/FlowPreview';
import { createEmptyFlow, normalizeFlow, prettyJson } from './flows/utils';
import { FlowDocument, FlowSummary } from './flows/types';

export default function ChatFlows() {
  const { currentBotId } = useBot() || {};
  const [flows, setFlows] = useState<FlowSummary[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [flowDoc, setFlowDoc] = useState<FlowDocument>(createEmptyFlow());
  const [jsonText, setJsonText] = useState(prettyJson(createEmptyFlow()));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selected = useMemo(() => flows.find((f) => f._id === selectedId) || null, [flows, selectedId]);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await listFlows(currentBotId ?? undefined);
      setFlows(data?.flows ?? []);
      if (!selectedId && data?.flows?.[0]?._id) setSelectedId(data.flows[0]._id);
    } catch {
      toast.error('Failed to load flows');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    getFlowTemplates().then((d) => setTemplates(d?.templates ?? [])).catch(() => setTemplates([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBotId]);

  useEffect(() => {
    if (!selectedId) return;
    getFlow(selectedId)
      .then((f) => {
        setName(f?.name ?? '');
        const normalized = normalizeFlow({ startNodeId: f?.startNodeId, nodes: f?.nodes ?? [], isActive: !!f?.isActive });
        setFlowDoc(normalized);
        setJsonText(prettyJson(normalized));
      })
      .catch(() => toast.error('Failed to load flow'));
  }, [selectedId]);

  const syncJsonFromVisual = (nextDoc: FlowDocument) => {
    setFlowDoc(nextDoc);
    setJsonText(prettyJson(nextDoc));
  };

  const syncVisualFromJson = () => {
    try {
      const parsed = JSON.parse(jsonText || '{}');
      const normalized = normalizeFlow(parsed);
      setFlowDoc(normalized);
      setJsonText(prettyJson(normalized));
    } catch {
      toast.error('Invalid JSON');
    }
  };

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const parsed = normalizeFlow(JSON.parse(jsonText || '{}'));
      const payload = {
        name: name || selected?.name || 'Untitled flow',
        startNodeId: parsed.startNodeId,
        nodes: parsed.nodes,
        isActive: !!parsed.isActive,
      };
      await updateFlow(selectedId, payload);
      toast.success('Flow saved');
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Invalid JSON / flow');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateEmpty = async () => {
    try {
      const empty = createEmptyFlow();
      const created = await createFlow({
        botId: currentBotId ?? undefined,
        name: 'New flow',
        ...empty,
      });
      toast.success('Created flow');
      setSelectedId(created?._id ?? null);
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create flow');
    }
  };

  const handleCreateFromTemplate = async (templateId: string) => {
    const t = templates.find((x) => x.id === templateId);
    if (!t) return;
    try {
      const created = await createFlow({
        botId: currentBotId ?? undefined,
        name: t.flow?.name || t.name,
        startNodeId: t.flow?.startNodeId,
        nodes: t.flow?.nodes,
        isActive: false,
      });
      toast.success('Template imported');
      setSelectedId(created?._id ?? null);
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to import template');
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    try {
      await deleteFlow(selectedId);
      toast.success('Deleted');
      setSelectedId(null);
      await refresh();
    } catch {
      toast.error('Failed to delete');
    }
  };

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading flows…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Chat Flows</h1>
        <p className="text-muted-foreground">Visual flow builder with step links and live preview.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Flows</CardTitle>
            <CardDescription>One active flow per bot.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleCreateEmpty}>
                <Plus className="h-4 w-4 mr-2" />
                New
              </Button>
              <Select onValueChange={handleCreateFromTemplate}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Import template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              {flows.map((f) => (
                <Button
                  key={f._id}
                  variant={selectedId === f._id ? 'secondary' : 'ghost'}
                  className="w-full justify-between"
                  onClick={() => setSelectedId(f._id)}
                >
                  <span className="truncate">{f.name}</span>
                  {f.isActive ? <Power className="h-4 w-4 text-green-600" /> : null}
                </Button>
              ))}
              {flows.length === 0 && (
                <div className="text-sm text-muted-foreground">No flows yet. Create one.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Flow Builder</CardTitle>
            <CardDescription>
              Build responses, button branches, and fallback paths.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selectedId ? (
              <div className="text-muted-foreground">Select a flow to edit.</div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Flow name" />
                  <Button variant="destructive" size="sm" onClick={handleDelete}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>

                <Tabs defaultValue="json">
                  <TabsList>
                    <TabsTrigger value="visual">Visual</TabsTrigger>
                    <TabsTrigger value="json">Flow JSON</TabsTrigger>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                  </TabsList>
                  <TabsContent value="visual" className="mt-3">
                    <FlowCanvas value={flowDoc} onChange={syncJsonFromVisual} />
                  </TabsContent>
                  <TabsContent value="json" className="mt-3">
                    <Textarea
                      value={jsonText}
                      onChange={(e) => setJsonText(e.target.value)}
                      rows={18}
                      className="font-mono text-xs"
                    />
                    <div className="flex justify-between gap-2 mt-3">
                      <Button variant="outline" onClick={syncVisualFromJson}>
                        Apply JSON to visual
                      </Button>
                      <Button onClick={handleSave} disabled={saving}>
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? 'Saving…' : 'Save'}
                      </Button>
                    </div>
                  </TabsContent>
                  <TabsContent value="preview" className="mt-3">
                    <FlowPreview flow={flowDoc} />
                  </TabsContent>
                </Tabs>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


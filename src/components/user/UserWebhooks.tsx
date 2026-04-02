/**
 * Phase 5.2: Configure webhook URLs and events; view delivery logs.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  getWebhooks,
  getWebhookEvents,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  getWebhookLogs
} from '@/services/api';
import { toast } from 'sonner';
import { Link2, Plus, Trash2, ChevronDown, Loader2, Check, X } from 'lucide-react';

const EVENT_LABELS: Record<string, string> = {
  conversation_started: 'Conversation started',
  lead_captured: 'Lead captured',
  chat_escalated: 'Chat escalated to human',
  feedback_received: 'Feedback received',
  token_low: 'Token balance low'
};

export default function UserWebhooks() {
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newEvents, setNewEvents] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [whRes, evRes] = await Promise.all([getWebhooks(), getWebhookEvents()]);
      setWebhooks(whRes?.webhooks ?? []);
      setEvents(evRes?.events ?? []);
    } catch (e) {
      toast.error('Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const loadLogs = async (id: string) => {
    const next = expandedId === id ? null : id;
    setExpandedId(next);
    if (!next) return;
    setLogsLoading(true);
    try {
      const res = await getWebhookLogs(next, 30);
      setLogs(res?.logs ?? []);
    } catch {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newUrl.trim()) {
      toast.error('Enter a webhook URL');
      return;
    }
    setSaving(true);
    try {
      await createWebhook({ url: newUrl.trim(), events: newEvents });
      toast.success('Webhook added');
      setNewUrl('');
      setNewEvents([]);
      fetchData();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to add webhook');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await updateWebhook(id, { isActive });
      toast.success(isActive ? 'Webhook enabled' : 'Webhook disabled');
      fetchData();
    } catch {
      toast.error('Update failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this webhook?')) return;
    try {
      await deleteWebhook(id);
      toast.success('Webhook removed');
      fetchData();
    } catch {
      toast.error('Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Webhooks</h1>
        <p className="text-muted-foreground mt-1">
          Get notified on your server when events happen. We send POST requests with retries (3 attempts).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" /> Add webhook
          </CardTitle>
          <CardDescription>URL must be HTTPS in production. Optional secret for X-Webhook-Signature (HMAC-SHA256).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>URL</Label>
            <Input
              placeholder="https://your-server.com/webhook"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Events (click to toggle)</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {events.map((e) => (
                <Badge
                  key={e}
                  variant={newEvents.includes(e) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setNewEvents((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]))}
                >
                  {EVENT_LABELS[e] || e}
                </Badge>
              ))}
            </div>
          </div>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Add webhook
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your webhooks</CardTitle>
          <CardDescription>Delivery logs show last 30 attempts per webhook.</CardDescription>
        </CardHeader>
        <CardContent>
          {webhooks.length === 0 ? (
            <p className="text-muted-foreground">No webhooks yet. Add one above.</p>
          ) : (
            <div className="space-y-4">
              {webhooks.map((wh) => (
                <div key={wh._id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-mono text-sm break-all">{wh.url}</span>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={wh.isActive !== false}
                        onCheckedChange={(v) => handleToggleActive(wh._id, v)}
                      />
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(wh._id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => loadLogs(wh._id)}>
                        {expandedId === wh._id ? 'Hide logs' : 'Logs'}
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(wh.events || []).map((e: string) => (
                      <Badge key={e} variant="secondary" className="text-xs">
                        {EVENT_LABELS[e] || e}
                      </Badge>
                    ))}
                  </div>
                  {expandedId === wh._id && (
                    <div className="mt-4 border-t pt-4">
                      {logsLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : logs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No delivery logs yet.</p>
                      ) : (
                        <ul className="space-y-1 text-sm">
                          {logs.map((log: any, i: number) => (
                            <li key={i} className="flex items-center gap-2">
                              {log.success ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-destructive" />}
                              <span>{log.event}</span>
                              <span className="text-muted-foreground">attempt {log.attempt}</span>
                              {log.statusCode != null && <span>{log.statusCode}</span>}
                              {log.errorMessage && <span className="text-destructive truncate">{log.errorMessage}</span>}
                              {log.responseTimeMs != null && <span className="text-muted-foreground">{log.responseTimeMs}ms</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

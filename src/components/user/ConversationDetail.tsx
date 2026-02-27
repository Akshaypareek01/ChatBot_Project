import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getConversationById, updateConversation } from '@/services/api';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Message {
  role: string;
  content: string;
  timestamp?: string;
  feedback?: number;
}

interface Conversation {
  _id: string;
  visitorId: string;
  startedAt: string;
  status: string;
  rating?: number;
  leadInfo?: { name?: string; email?: string; phone?: string };
  messages: Message[];
  metadata?: { pageUrl?: string; userAgent?: string };
}

export default function ConversationDetail() {
  const { id } = useParams<{ id: string }>();
  const [conv, setConv] = useState<Conversation | null>(null);

  useEffect(() => {
    if (!id) return;
    getConversationById(id)
      .then(setConv)
      .catch(() => toast.error('Conversation not found'));
  }, [id]);

  if (!conv) {
    return <div className="p-6">Loading...</div>;
  }

  const formatDate = (d: string) => (d ? new Date(d).toLocaleString() : '—');

  return (
    <div className="p-6 space-y-6">
      <Link to="/user/conversations">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to list
        </Button>
      </Link>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Conversation</CardTitle>
              <p className="text-sm text-muted-foreground">
                Visitor {conv.visitorId} · Started {formatDate(conv.startedAt)}
              </p>
              {(conv.leadInfo?.name || conv.leadInfo?.email || conv.leadInfo?.phone) && (
                <p className="text-sm text-muted-foreground mt-1">
                  Lead: {[conv.leadInfo.name, conv.leadInfo.email, conv.leadInfo.phone].filter(Boolean).join(' · ')}
                </p>
              )}
              {conv.metadata?.pageUrl && (
                <p className="text-xs text-muted-foreground">Page: {conv.metadata.pageUrl}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={conv.status || 'active'}
                onValueChange={(v) => {
                  updateConversation(conv._id, { status: v }).then(setConv).catch(() => toast.error('Update failed'));
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="ended">Ended</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                </SelectContent>
              </Select>
              {conv.rating != null && <span className="text-sm">Rating: {conv.rating}★</span>}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {conv.messages?.map((m, i) => (
              <div
                key={i}
                className={`rounded-lg border p-4 ${
                  m.role === 'user' ? 'bg-muted/50 border-l-4 border-primary' : 'bg-background'
                }`}
              >
                <p className="text-xs font-medium text-muted-foreground uppercase mb-1">{m.role}</p>
                <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                <div className="flex items-center gap-2 mt-1">
                  {m.timestamp && (
                    <p className="text-xs text-muted-foreground">{formatDate(m.timestamp)}</p>
                  )}
                  {m.role === 'assistant' && m.feedback != null && (
                    <span className="text-xs">
                      {m.feedback === 1 ? '👍' : '👎'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

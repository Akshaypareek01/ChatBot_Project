import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getConversationById } from '@/services/api';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

interface Message {
  role: string;
  content: string;
  timestamp?: string;
}

interface Conversation {
  _id: string;
  visitorId: string;
  startedAt: string;
  status: string;
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
          <CardTitle>Conversation</CardTitle>
          <p className="text-sm text-muted-foreground">
            Visitor {conv.visitorId} · Started {formatDate(conv.startedAt)} · {conv.status || 'active'}
          </p>
          {conv.metadata?.pageUrl && (
            <p className="text-xs text-muted-foreground">Page: {conv.metadata.pageUrl}</p>
          )}
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
                {m.timestamp && (
                  <p className="text-xs text-muted-foreground mt-1">{formatDate(m.timestamp)}</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

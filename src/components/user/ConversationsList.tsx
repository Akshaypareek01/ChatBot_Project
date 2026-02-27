import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getConversations, exportConversationsCsv } from '@/services/api';
import { toast } from 'sonner';
import { MessageSquare, Download } from 'lucide-react';

interface Conversation {
  _id: string;
  visitorId: string;
  startedAt: string;
  status: string;
  messages?: { role: string; content: string }[];
}

export default function ConversationsList() {
  const [data, setData] = useState<{ conversations: Conversation[]; total: number; page: number; limit: number } | null>(null);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    getConversations({ page, limit: 20 })
      .then(setData)
      .catch(() => toast.error('Failed to load conversations'));
  }, [page]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await exportConversationsCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'conversations.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (d: string) => (d ? new Date(d).toLocaleString() : '—');

  if (!data) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Conversations</CardTitle>
              <CardDescription>Chat sessions from your widget visitors.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
              <Download className="mr-2 h-4 w-4" />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {data.conversations.length === 0 ? (
            <p className="text-muted-foreground">No conversations yet.</p>
          ) : (
            <ul className="space-y-3">
              {data.conversations.map((c) => (
                <li key={c._id}>
                  <Link to={`/user/conversations/${c._id}`}>
                    <div className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <MessageSquare className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Visitor {c.visitorId?.slice(0, 12)}…</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(c.startedAt)} · {(c.messages?.length ?? 0)} messages · {c.status || 'active'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {data.total > data.limit && (
            <div className="mt-4 flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Page {data.page} of {Math.ceil(data.total / data.limit)}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={data.page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={data.page >= Math.ceil(data.total / data.limit)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

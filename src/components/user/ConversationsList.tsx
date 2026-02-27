import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getConversations, exportConversationsCsv, exportLeadsCsv, getFeedbackStats } from '@/services/api';
import { useBot } from '@/context/BotContext';
import { toast } from 'sonner';
import { MessageSquare, Download, ThumbsUp, ThumbsDown } from 'lucide-react';

interface Conversation {
  _id: string;
  visitorId: string;
  startedAt: string;
  status: string;
  rating?: number;
  leadInfo?: { name?: string; email?: string; phone?: string };
  messages?: { role: string; content: string }[];
}

export default function ConversationsList() {
  const { currentBotId } = useBot() || {};
  const [data, setData] = useState<{ conversations: Conversation[]; total: number; page: number; limit: number } | null>(null);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [exportingLeads, setExportingLeads] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [feedbackFilter, setFeedbackFilter] = useState<string>('');
  const [keyword, setKeyword] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [feedbackStats, setFeedbackStats] = useState<{ positive: number; negative: number; total: number; percentPositive: number | null } | null>(null);

  useEffect(() => {
    getConversations({
      page,
      limit: 20,
      status: status || undefined,
      keyword: keyword || undefined,
      feedback: feedbackFilter || undefined,
      botId: currentBotId ?? undefined,
    })
      .then(setData)
      .catch(() => toast.error('Failed to load conversations'));
  }, [page, status, keyword, feedbackFilter, currentBotId]);

  useEffect(() => {
    getFeedbackStats().then(setFeedbackStats).catch(() => {});
  }, []);

  const applySearch = () => setKeyword(keywordInput.trim());

  const handleExportLeads = async () => {
    setExportingLeads(true);
    try {
      const blob = await exportLeadsCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'leads.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Leads export downloaded');
    } catch {
      toast.error('Export failed');
    } finally {
      setExportingLeads(false);
    }
  };

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
      {feedbackStats && feedbackStats.total > 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium">Response feedback</p>
            <div className="flex items-center gap-4 mt-2 text-muted-foreground">
              <span className="flex items-center gap-1"><ThumbsUp className="h-4 w-4 text-green-600" /> {feedbackStats.positive}</span>
              <span className="flex items-center gap-1"><ThumbsDown className="h-4 w-4 text-red-600" /> {feedbackStats.negative}</span>
              {feedbackStats.percentPositive != null && (
                <span>{feedbackStats.percentPositive}% positive</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Conversations</CardTitle>
              <CardDescription>Chat sessions from your widget visitors.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportLeads} disabled={exportingLeads}>
                <Download className="mr-2 h-4 w-4" />
                {exportingLeads ? '...' : 'Export leads'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
                <Download className="mr-2 h-4 w-4" />
                {exporting ? 'Exporting...' : 'Export CSV'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            <Select value={status || 'all'} onValueChange={(v) => setStatus(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="ended">Ended</SelectItem>
                <SelectItem value="escalated">Escalated</SelectItem>
              </SelectContent>
            </Select>
            <Select value={feedbackFilter || 'all'} onValueChange={(v) => setFeedbackFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Feedback" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="negative">Flagged (thumbs down)</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                placeholder="Search in messages..."
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                className="w-48"
              />
              <Button variant="secondary" size="sm" onClick={applySearch}>Search</Button>
            </div>
          </div>
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
                          <p className="font-medium">
                            {c.leadInfo?.name || c.leadInfo?.email || `Visitor ${c.visitorId?.slice(0, 12)}…`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(c.startedAt)} · {(c.messages?.length ?? 0)} messages · {c.status || 'active'}
                            {c.rating != null && ` · ${c.rating}★`}
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

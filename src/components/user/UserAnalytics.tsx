import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart2,
  MessageSquare,
  Users,
  Clock,
  TrendingUp,
  AlertCircle,
  Zap,
  ThumbsUp,
  Loader2,
  HelpCircle
} from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { getUserAnalytics } from '@/services/api';
import { useBot } from '@/context/BotContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

type Period = '7d' | '30d' | '90d';

interface AnalyticsData {
  period: string;
  startDate: string;
  chatVolumeOverTime: { date: string; conversations: number; messages: number }[];
  totalConversations: number;
  totalMessages: number;
  uniqueVisitors: number;
  avgResponseTimeMs: number | null;
  mostAskedQuestions: { question: string; count: number }[];
  unansweredEscalated: {
    escalatedCount: number;
    unansweredCount: number;
    sampleEscalated: { id: string; startedAt: string }[];
    sampleUnanswered: { id: string; startedAt: string }[];
  };
  leadConversion: { totalConversations: number; leadsCaptured: number; conversionRate: number };
  tokenUsageBreakdown: { chat: number; upload: number; scrape: number };
  peakHoursHeatmap: { hour: number; count: number }[];
  satisfactionScore: {
    positive: number;
    negative: number;
    total: number;
    percentPositive: number | null;
    satisfactionScore: number | null;
  };
}

const chartConfig = {
  conversations: { label: 'Conversations', color: 'hsl(var(--primary))' },
  messages: { label: 'Messages', color: 'hsl(var(--chart-2))' },
  count: { label: 'Chats', color: 'hsl(var(--primary))' },
  tokens: { label: 'Tokens', color: 'hsl(var(--chart-3))' },
  hour: { label: 'Hour', color: 'hsl(var(--muted-foreground))' }
};

const UserAnalytics = () => {
  const { currentBotId } = useBot() || {};
  const [period, setPeriod] = useState<Period>('30d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getUserAnalytics(period, currentBotId ?? undefined)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Failed to load analytics');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [period, currentBotId]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => setPeriod('30d')}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  const d = data!;
  const volumeData = d.chatVolumeOverTime.map((v) => ({
    ...v,
    date: new Date(v.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
  }));

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Chat volume, token usage, and satisfaction</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{d.totalConversations}</div>
            <p className="text-xs text-muted-foreground">Total sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{d.totalMessages}</div>
            <p className="text-xs text-muted-foreground">In period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{d.uniqueVisitors}</div>
            <p className="text-xs text-muted-foreground">Distinct visitors</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfaction</CardTitle>
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {d.satisfactionScore.satisfactionScore != null ? `${d.satisfactionScore.satisfactionScore}%` : '—'}
            </div>
            <p className="text-xs text-muted-foreground">Thumbs up (with feedback)</p>
          </CardContent>
        </Card>
      </div>

      {/* Chat volume over time */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Chat volume over time
          </CardTitle>
          <CardDescription>Conversations and messages per day</CardDescription>
        </CardHeader>
        <CardContent>
          {volumeData.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No data in this period</p>
          ) : (
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <AreaChart data={volumeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => String(v)} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="conversations" stroke="var(--color-conversations)" fill="var(--color-conversations)" fillOpacity={0.3} />
                <Area type="monotone" dataKey="messages" stroke="var(--color-messages)" fill="var(--color-messages)" fillOpacity={0.3} />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Token usage breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Token usage breakdown
            </CardTitle>
            <CardDescription>Chat vs upload vs scrape</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { key: 'chat', label: 'Chat', value: d.tokenUsageBreakdown.chat },
                { key: 'upload', label: 'Upload', value: d.tokenUsageBreakdown.upload },
                { key: 'scrape', label: 'Scrape', value: d.tokenUsageBreakdown.scrape }
              ].map(({ key, label, value }) => (
                <div key={key} className="flex justify-between items-center">
                  <span className="text-sm font-medium capitalize">{label}</span>
                  <span className="font-mono font-bold">{value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Lead conversion */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Lead capture
            </CardTitle>
            <CardDescription>Conversion rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{d.leadConversion.conversionRate}%</div>
            <p className="text-sm text-muted-foreground">
              {d.leadConversion.leadsCaptured} leads from {d.leadConversion.totalConversations} conversations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Peak hours heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Peak hours
          </CardTitle>
          <CardDescription>Conversations by hour (UTC)</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <BarChart data={d.peakHoursHeatmap} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="hour" tickLine={false} axisLine={false} tickFormatter={(h) => `${h}h`} />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Most asked questions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Most asked questions
          </CardTitle>
          <CardDescription>Top user questions in period</CardDescription>
        </CardHeader>
        <CardContent>
          {d.mostAskedQuestions.length === 0 ? (
            <p className="text-muted-foreground text-sm">No data</p>
          ) : (
            <ul className="space-y-2">
              {d.mostAskedQuestions.slice(0, 10).map((q, i) => (
                <li key={i} className="flex justify-between items-start gap-4 text-sm">
                  <span className="text-foreground line-clamp-2">{q.question}</span>
                  <span className="font-mono text-muted-foreground shrink-0">{q.count}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Unanswered / escalated */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Unanswered & escalated
          </CardTitle>
          <CardDescription>Conversations needing attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6">
            <div>
              <div className="text-2xl font-bold">{d.unansweredEscalated.escalatedCount}</div>
              <p className="text-xs text-muted-foreground">Escalated</p>
            </div>
            <div>
              <div className="text-2xl font-bold">{d.unansweredEscalated.unansweredCount}</div>
              <p className="text-xs text-muted-foreground">Unanswered</p>
            </div>
            {(d.unansweredEscalated.sampleEscalated.length > 0 || d.unansweredEscalated.sampleUnanswered.length > 0) && (
              <Button variant="outline" size="sm" onClick={() => navigate('/user/conversations')}>
                View conversations
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Average response time */}
      {d.avgResponseTimeMs != null && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Average response time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {d.avgResponseTimeMs < 1000
                ? `${d.avgResponseTimeMs} ms`
                : `${(d.avgResponseTimeMs / 1000).toFixed(1)} s`}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UserAnalytics;

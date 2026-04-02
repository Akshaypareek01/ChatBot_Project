/**
 * Phase 5.1: Live chat handoff — list escalated conversations, take over with real-time messaging.
 */

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getConversations, getConversationById, updateConversation } from '@/services/api';
import { SOCKET_URL } from '@/config/Base_url.jsx';
import { toast } from 'sonner';
import { MessageCircle, User, Send, PhoneOff, Loader2 } from 'lucide-react';

interface HandoffMessage {
  role: string;
  content: string;
  timestamp?: string;
}

interface ConvSummary {
  _id: string;
  visitorId: string;
  status: string;
  escalatedAt?: string;
  leadInfo?: { name?: string; email?: string; phone?: string };
  messages?: { role: string; content: string }[];
  handoffMessages?: HandoffMessage[];
  startedAt: string;
}

export default function UserLiveChat() {
  const [list, setList] = useState<ConvSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [conv, setConv] = useState<ConvSummary | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [agentJoined, setAgentJoined] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    getConversations({ status: 'escalated', limit: 50 })
      .then((r) => setList(r.conversations || []))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setConv(null);
      return;
    }
    getConversationById(selectedId).then(setConv).catch(() => toast.error('Failed to load'));
  }, [selectedId]);

  useEffect(() => {
    if (!token || !SOCKET_URL) return;
    const s = io(SOCKET_URL, {
      path: '/socket.io',
      auth: { token }
    });
    s.on('connect', () => {});
    s.on('escalation', (payload: { conversationId: string }) => {
      setList((prev) => {
        if (prev.some((c) => c._id === payload.conversationId)) return prev;
        getConversations({ status: 'escalated', limit: 50 }).then((r) => setList(r.conversations || []));
        return prev;
      });
    });
    setSocket(s);
    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [token]);

  useEffect(() => {
    if (!socket || !selectedId) return;
    socket.emit('agent_join', selectedId, (res: { error?: string }) => {
      if (res?.error) toast.error(res.error);
      else setAgentJoined(true);
    });
    const onMessage = (p: HandoffMessage & { conversationId?: string }) => {
      if (p.conversationId !== selectedId) return;
      setConv((prev) =>
        prev
          ? {
              ...prev,
              handoffMessages: [...(prev.handoffMessages || []), { role: p.role, content: p.content, timestamp: (p as any).timestamp }]
            }
          : prev
      );
    };
    const onLeft = (p: { conversationId: string }) => {
      if (p.conversationId === selectedId) setAgentJoined(false);
    };
    socket.on('handoff_message', onMessage);
    socket.on('agent_left', onLeft);
    return () => {
      socket.emit('agent_leave', selectedId, () => {});
      socket.off('handoff_message', onMessage);
      socket.off('agent_left', onLeft);
    };
  }, [socket, selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conv?.messages, conv?.handoffMessages]);

  const handleSend = () => {
    const text = message.trim();
    if (!text || !socket || !selectedId) return;
    socket.emit(
      'handoff_message',
      { conversationId: selectedId, content: text, role: 'agent' },
      (res: { error?: string }) => {
        if (res?.error) toast.error(res.error);
        setMessage('');
      }
    );
  };

  const handleEndChat = () => {
    if (!socket || !selectedId) return;
    socket.emit('agent_leave', selectedId, () => {});
    updateConversation(selectedId, { status: 'active' }).then(() => {
      setList((prev) => prev.filter((c) => c._id !== selectedId));
      setSelectedId(null);
      setConv(null);
      setAgentJoined(false);
      toast.success('Chat ended. Visitor can continue with the chatbot.');
    }).catch(() => toast.error('Update failed'));
  };

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Live Chat</h1>
        <p className="text-muted-foreground mt-1">Conversations escalated to human. Click to take over and reply in real time.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" /> Escalated
            </CardTitle>
            <p className="text-sm text-muted-foreground">{list.length} waiting</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : list.length === 0 ? (
              <p className="text-sm text-muted-foreground">No escalated conversations.</p>
            ) : (
              <ul className="space-y-2">
                {list.map((c) => (
                  <li key={c._id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(c._id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedId === c._id ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                      }`}
                    >
                      <span className="font-mono text-xs text-muted-foreground">{c.visitorId}</span>
                      <p className="text-sm truncate">
                        {c.leadInfo?.email || c.leadInfo?.name || c.leadInfo?.phone || 'No lead info'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.escalatedAt ? new Date(c.escalatedAt).toLocaleString() : ''}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              {conv ? (
                <>
                  <User className="h-5 w-5 inline mr-2" />
                  {conv.visitorId}
                  {agentJoined && <span className="ml-2 text-xs font-normal text-green-600">(You are live)</span>}
                </>
              ) : (
                'Select a conversation'
              )}
            </CardTitle>
            {conv && agentJoined && (
              <Button variant="outline" size="sm" onClick={handleEndChat}>
                <PhoneOff className="h-4 w-4 mr-1" /> End chat
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {!conv ? (
              <p className="text-muted-foreground text-sm">Select an escalated conversation from the list.</p>
            ) : (
              <>
                <div className="min-h-[280px] max-h-[400px] overflow-y-auto space-y-3 p-2 border rounded-lg bg-muted/20">
                  {(conv.messages || []).map((m, i) => (
                    <div key={`bot-${i}`} className={m.role === 'user' ? 'text-right' : ''}>
                      <span className={`inline-block px-3 py-1.5 rounded-lg text-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        {m.content}
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5">{m.role === 'user' ? 'Visitor' : 'Bot'}</p>
                    </div>
                  ))}
                  {(conv.handoffMessages || []).map((m, i) => (
                    <div key={`h-${i}`} className={m.role === 'visitor' ? 'text-right' : ''}>
                      <span
                        className={`inline-block px-3 py-1.5 rounded-lg text-sm ${
                          m.role === 'agent' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        }`}
                      >
                        {m.content}
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5">{m.role === 'agent' ? 'You' : 'Visitor'}</p>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                {agentJoined && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    />
                    <Button onClick={handleSend} size="icon">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

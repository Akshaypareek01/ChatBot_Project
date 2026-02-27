import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getNotifications, markNotificationRead } from '@/services/api';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  _id: string;
  type: string;
  title: string;
  body?: string;
  readAt: string | null;
  createdAt: string;
  data?: { conversationId?: string };
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await getNotifications({ limit: 15 });
      setList(res.notifications || []);
      setUnreadCount(res.unreadCount ?? 0);
    } catch {
      setList([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    const t = setInterval(fetchList, 60000);
    return () => clearInterval(t);
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setList((prev) => prev.map((n) => (n._id === id ? { ...n, readAt: new Date().toISOString() } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[360px] overflow-y-auto">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        {loading && list.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">Loading…</div>
        ) : list.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No notifications</div>
        ) : (
          list.map((n) => (
            <DropdownMenuItem
              key={n._id}
              className={n.readAt ? 'opacity-80' : ''}
              onSelect={() => {
                handleMarkRead(n._id);
                setOpen(false);
              }}
            >
              <div className="flex flex-col gap-0.5 py-1 w-full">
                <div className="font-medium text-sm">{n.title}</div>
                {n.body && <div className="text-xs text-muted-foreground line-clamp-2">{n.body}</div>}
                <div className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </div>
                {n.data?.conversationId && (
                  <Link
                    to={`/user/conversations/${n.data.conversationId}`}
                    className="text-xs text-primary mt-1"
                    onClick={() => setOpen(false)}
                  >
                    View conversation →
                  </Link>
                )}
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type NotificationEvent = {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  timestamp: number;
};

const STORAGE_KEY = 'evidentia_notifications';
const MAX_EVENTS = 10;

export function addNotification(message: string, type: NotificationEvent['type'] = 'info') {
  try {
    const existing: NotificationEvent[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    const updated = [
      { id: crypto.randomUUID(), type, message, timestamp: Date.now() },
      ...existing,
    ].slice(0, MAX_EVENTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('evidentia-notification'));
  } catch { /* silent */ }
}

export function NotificationCentre() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(() => {
    try {
      const stored: NotificationEvent[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      setNotifications(stored);
    } catch { setNotifications([]); }
  }, []);

  useEffect(() => {
    load();
    window.addEventListener('evidentia-notification', load);
    return () => window.removeEventListener('evidentia-notification', load);
  }, [load]);

  useEffect(() => {
    const lastRead = parseInt(localStorage.getItem('evidentia_last_read') ?? '0', 10);
    setUnread(notifications.filter(n => n.timestamp > lastRead).length);
  }, [notifications]);

  const handleOpen = () => {
    setOpen(true);
    localStorage.setItem('evidentia_last_read', Date.now().toString());
    setUnread(0);
  };

  const handleClear = () => {
    localStorage.removeItem(STORAGE_KEY);
    setNotifications([]);
    setUnread(0);
  };

  const icon = (type: NotificationEvent['type']) => {
    if (type === 'success') return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />;
    if (type === 'error') return <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />;
    return <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />;
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 relative"
        onClick={open ? () => setOpen(false) : handleOpen}
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-10 w-80 z-50 rounded-xl border bg-popover shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <p className="text-sm font-semibold">Notifications</p>
            <div className="flex items-center gap-1">
              {notifications.length > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={handleClear}>
                  Clear all
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-w w-7" onClick={() => setOpen(false)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="w-8 h-8 mx-auto mb-2 text-muted-foreground/20" />
                <p className="text-xs text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map(n => (
                  <div key={n.id} className="flex items-start gap-2.5 px-4 py-3">
                    {icon(n.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-snag">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
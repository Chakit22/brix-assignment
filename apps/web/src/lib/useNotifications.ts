import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  Notification,
  NotificationResponse,
  NotificationsListResponse,
} from '@brix/shared';
import { apiClient } from './api';

export const POLL_INTERVAL_MS = 10_000;

export type UseNotificationsOptions = {
  enabled: boolean;
  intervalMs?: number;
};

export type UseNotificationsResult = {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};

function deriveUnread(list: Notification[]): number {
  return list.reduce((acc, n) => (n.readAt ? acc : acc + 1), 0);
}

export function useNotifications(
  options: UseNotificationsOptions,
): UseNotificationsResult {
  const { enabled, intervalMs = POLL_INTERVAL_MS } = options;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);
  const cancelledRef = useRef(false);

  const fetchOnce = useCallback(async () => {
    try {
      const res = await apiClient.get<NotificationsListResponse>('/notifications');
      if (cancelledRef.current) return;
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
      setError(null);
    } catch (err) {
      if (cancelledRef.current) return;
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    if (!enabled) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      setError(null);
      return () => {
        cancelledRef.current = true;
      };
    }
    setLoading(true);
    void fetchOnce();
    const id = setInterval(() => {
      void fetchOnce();
    }, intervalMs);
    return () => {
      cancelledRef.current = true;
      clearInterval(id);
    };
  }, [enabled, intervalMs, fetchOnce]);

  const markRead = useCallback(async (id: string) => {
    const res = await apiClient.post<NotificationResponse>(
      `/notifications/${id}/read`,
    );
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? res.notification : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.readAt);
    if (unread.length === 0) return;
    const results = await Promise.allSettled(
      unread.map((n) =>
        apiClient.post<NotificationResponse>(`/notifications/${n.id}/read`),
      ),
    );
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n }));
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          const target = unread[i]!;
          const updated = next.find((x) => x.id === target.id);
          if (updated) updated.readAt = r.value.notification.readAt;
        }
      });
      return next;
    });
    setUnreadCount((prev) =>
      Math.max(0, prev - results.filter((r) => r.status === 'fulfilled').length),
    );
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh: fetchOnce,
    markRead,
    markAllRead,
  };
}

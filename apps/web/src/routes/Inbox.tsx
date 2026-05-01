import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { NotificationItem } from '../components/NotificationItem';
import { useAuth } from '../lib/auth';
import { useNotifications } from '../lib/useNotifications';

export function Inbox() {
  const { isAuthenticated } = useAuth();
  const { notifications, unreadCount, loading, error, markRead, markAllRead } =
    useNotifications({ enabled: isAuthenticated });
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <Layout>
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-accent-purple-400">
            Inbox
          </p>
          <h1 className="text-3xl font-semibold text-ink">Notifications</h1>
          <p className="text-sm text-ink-muted mt-1">
            Updates about your jobs will appear here as they happen.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void markAllRead()}
          disabled={unreadCount === 0}
          className="btn-ghost"
        >
          Mark all read
        </button>
      </header>

      <div className="card overflow-hidden">
        {loading && notifications.length === 0 ? (
          <p className="p-6 text-sm text-ink-muted">Loading…</p>
        ) : error ? (
          <p className="p-6 text-sm text-ink-muted">
            Couldn't load notifications.
          </p>
        ) : notifications.length === 0 ? (
          <p className="p-6 text-sm text-ink-muted">No notifications yet.</p>
        ) : (
          notifications.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              now={now}
              onClick={(id) => {
                if (!n.readAt) void markRead(id);
              }}
            />
          ))
        )}
      </div>
    </Layout>
  );
}

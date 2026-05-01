import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../lib/useNotifications';
import { useAuth } from '../lib/auth';
import { NotificationItem } from './NotificationItem';

const MAX_VISIBLE = 20;

export function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const { notifications, unreadCount, loading, error, markRead, markAllRead } =
    useNotifications({ enabled: isAuthenticated });
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setNow(new Date());
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!isAuthenticated) return null;

  const visible = notifications.slice(0, MAX_VISIBLE);
  const hasUnread = unreadCount > 0;

  return (
    <div ref={containerRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-muted hover:text-ink hover:bg-bg-elevated transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple-400"
        aria-label={
          hasUnread
            ? `Notifications, ${unreadCount} unread`
            : 'Notifications'
        }
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <BellIcon />
        {hasUnread ? (
          <span
            data-testid="notification-badge"
            className="absolute -top-0.5 -right-0.5 inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-accent-purple-500 text-[10px] font-semibold text-white px-1 shadow-glow"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notifications"
          className="fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 top-16 sm:top-auto sm:mt-2 w-auto sm:w-[22rem] origin-top-right card overflow-hidden z-50"
          style={{ maxHeight: 'calc(100dvh - 5rem)' }}
        >
          <header className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
            <span className="text-sm font-semibold text-ink">Notifications</span>
            <span className="text-2xs uppercase tracking-wider text-ink-subtle">
              {hasUnread ? `${unreadCount} unread` : 'all caught up'}
            </span>
          </header>

          <div className="overflow-y-auto" style={{ maxHeight: 'min(384px, calc(100dvh - 12rem))' }}>
            {loading && visible.length === 0 ? (
              <p className="px-4 py-6 text-sm text-ink-muted">Loading…</p>
            ) : error ? (
              <p className="px-4 py-6 text-sm text-ink-muted">
                Couldn't load notifications.
              </p>
            ) : visible.length === 0 ? (
              <p className="px-4 py-6 text-sm text-ink-muted">
                No notifications yet.
              </p>
            ) : (
              visible.map((n) => (
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

          <footer className="flex items-center justify-between px-4 py-2 border-t border-border-subtle bg-bg-canvas/40">
            <Link
              to="/inbox"
              onClick={() => setOpen(false)}
              className="text-xs text-accent-purple-300 hover:text-accent-purple-200"
            >
              View all
            </Link>
            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={!hasUnread}
              className="text-xs text-ink-muted hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Mark all read
            </button>
          </footer>
        </div>
      ) : null}
    </div>
  );
}

function BellIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      <path d="M6 8a6 6 0 1 1 12 0c0 3.5 1 5 2 6H4c1-1 2-2.5 2-6Z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </svg>
  );
}

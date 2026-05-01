import type { Notification, NotificationType } from '@brix/shared';

const TYPE_META: Record<NotificationType, { glyph: string; label: string }> = {
  job_assigned: { glyph: '◆', label: 'Assigned' },
  job_rescheduled: { glyph: '↻', label: 'Rescheduled' },
  job_cancelled: { glyph: '✕', label: 'Cancelled' },
  job_completed: { glyph: '✓', label: 'Completed' },
};

function relativeTime(iso: string, now: Date): string {
  const then = new Date(iso).getTime();
  const diffMs = now.getTime() - then;
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export type NotificationItemProps = {
  notification: Notification;
  now: Date;
  onClick: (id: string) => void;
};

export function NotificationItem({
  notification,
  now,
  onClick,
}: NotificationItemProps) {
  const meta = TYPE_META[notification.type];
  const isRead = Boolean(notification.readAt);

  return (
    <button
      type="button"
      onClick={() => onClick(notification.id)}
      className={`w-full text-left px-4 py-3 flex gap-3 items-start border-b border-border-subtle/60 last:border-b-0 transition ${
        isRead
          ? 'opacity-60 hover:bg-bg-elevated/40'
          : 'bg-accent-purple-500/[0.04] hover:bg-accent-purple-500/[0.08]'
      }`}
      aria-label={`${meta.label}: ${notification.message}`}
    >
      <span
        className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sm font-semibold ${
          isRead
            ? 'bg-bg-elevated text-ink-subtle'
            : 'bg-accent-purple-600/20 text-accent-purple-300'
        }`}
        aria-hidden
      >
        {meta.glyph}
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center justify-between gap-2">
          <span className="text-2xs uppercase tracking-wider text-ink-subtle">
            {meta.label}
          </span>
          <span className="text-2xs text-ink-subtle">
            {relativeTime(notification.createdAt, now)}
          </span>
        </span>
        <span
          className={`block text-sm mt-0.5 ${
            isRead ? 'text-ink-muted' : 'text-ink'
          }`}
        >
          {notification.message}
        </span>
      </span>
      {isRead ? null : (
        <span
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent-purple-400 shadow-glow"
          aria-hidden
        />
      )}
    </button>
  );
}

import type { JobStatus } from '@brix/shared';

type StatusBadgeProps = {
  status: JobStatus;
};

const LABEL: Record<JobStatus, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-0.5 text-2xs font-medium uppercase tracking-wider text-emerald-200">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        {LABEL.completed}
      </span>
    );
  }

  if (status === 'cancelled') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-bg-elevated px-2.5 py-0.5 text-2xs font-medium uppercase tracking-wider text-ink-muted">
        {LABEL.cancelled}
      </span>
    );
  }

  // scheduled / in_progress → purple
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-purple-400/40 bg-accent-purple-500/15 px-2.5 py-0.5 text-2xs font-medium uppercase tracking-wider text-accent-purple-200">
      <span className="h-1.5 w-1.5 rounded-full bg-accent-purple-400" />
      {LABEL[status]}
    </span>
  );
}

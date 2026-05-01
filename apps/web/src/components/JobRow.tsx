import type { Job } from '@brix/shared';
import { formatTimeRange } from '../lib/datetime';
import { StatusBadge } from './StatusBadge';

type JobRowProps = {
  job: Job;
  onMarkCompleted: (jobId: string) => void;
  pending?: boolean;
};

export function JobRow({ job, onMarkCompleted, pending = false }: JobRowProps) {
  const showButton = job.status === 'scheduled';
  return (
    <article
      data-testid="job-row"
      className="card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5"
    >
      <div className="sm:w-32 shrink-0">
        <p
          data-testid="job-time-range"
          className="font-mono text-sm text-ink"
        >
          {formatTimeRange(job.startTime, job.endTime)}
        </p>
      </div>
      <div className="flex-1 min-w-0">
        <h3
          data-testid="job-title"
          className="text-base font-semibold text-ink truncate"
        >
          {job.quote.title}
        </h3>
        <dl className="text-sm text-ink-muted mt-1 space-y-0.5">
          <div>
            <dt className="sr-only">Customer</dt>
            <dd>{job.quote.customerName}</dd>
          </div>
          <div>
            <dt className="sr-only">Address</dt>
            <dd className="text-ink-subtle">{job.quote.address}</dd>
          </div>
        </dl>
      </div>
      <div className="flex items-center gap-3 sm:self-center">
        <StatusBadge status={job.status} />
        {showButton ? (
          <button
            type="button"
            onClick={() => onMarkCompleted(job.id)}
            disabled={pending}
            className="btn-primary whitespace-nowrap disabled:opacity-50"
          >
            {pending ? 'Marking…' : 'Mark Completed'}
          </button>
        ) : null}
      </div>
    </article>
  );
}

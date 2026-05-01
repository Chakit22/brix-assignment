import { useEffect, useMemo, useState } from 'react';
import type { Job, JobResponse } from '@brix/shared';
import { Layout } from '../components/Layout';
import { JobRow } from '../components/JobRow';
import { apiClient } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useMyJobs } from '../lib/queries';
import {
  formatLongDate,
  groupJobsByDay,
} from '../lib/datetime';

type Toast = {
  id: number;
  kind: 'success' | 'error';
  message: string;
};

export function Technician() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { data, loading, error } = useMyJobs(userId);

  const [overrides, setOverrides] = useState<Record<string, Job['status']>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<Toast | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(id);
  }, [toast]);

  const today = useMemo(() => new Date(), []);
  const subtitle = formatLongDate(today);

  const jobs: Job[] = useMemo(() => {
    const list = data ?? [];
    return list.map((j) =>
      overrides[j.id] ? { ...j, status: overrides[j.id]! } : j,
    );
  }, [data, overrides]);

  const groups = useMemo(() => groupJobsByDay(jobs, today), [jobs, today]);

  const handleMarkCompleted = async (jobId: string) => {
    setOverrides((prev) => ({ ...prev, [jobId]: 'completed' }));
    setPending((prev) => ({ ...prev, [jobId]: true }));
    setErrorBanner(null);
    try {
      const res = await apiClient.patch<JobResponse>(`/jobs/${jobId}`, {
        status: 'completed',
      });
      setOverrides((prev) => ({ ...prev, [jobId]: res.job.status }));
      setToast({
        id: Date.now(),
        kind: 'success',
        message: 'Marked completed',
      });
    } catch (err) {
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[jobId];
        return next;
      });
      const message =
        err instanceof Error
          ? `Couldn't mark completed: ${err.message}`
          : "Couldn't mark completed.";
      setErrorBanner(message);
    } finally {
      setPending((prev) => {
        const next = { ...prev };
        delete next[jobId];
        return next;
      });
    }
  };

  return (
    <Layout>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-accent-purple-400">
          Technician
        </p>
        <h1 className="text-3xl font-semibold text-ink">Your Schedule</h1>
        <p className="text-sm text-ink-muted mt-1">{subtitle}</p>
      </header>

      {errorBanner ? (
        <div
          role="alert"
          className="card p-3 mb-4 border-red-400/40 bg-red-500/10 text-sm text-red-200"
        >
          {errorBanner}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-ink-subtle">Loading your jobs…</p>
      ) : error ? (
        <div
          role="alert"
          className="card p-6 text-sm text-red-300"
        >
          Couldn&rsquo;t load your jobs.
        </div>
      ) : groups.length === 0 ? (
        <div className="card p-6 text-sm text-ink-muted">No scheduled jobs</div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.key}>
              <h2 className="text-xs uppercase tracking-widest text-ink-subtle mb-3">
                {group.label}
              </h2>
              <div className="flex flex-col gap-3">
                {group.jobs.map((job) => (
                  <JobRow
                    key={job.id}
                    job={job}
                    onMarkCompleted={handleMarkCompleted}
                    pending={Boolean(pending[job.id])}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {toast ? (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-20 card px-4 py-3 text-sm shadow-glow border-emerald-400/50 bg-emerald-500/10 text-emerald-100"
        >
          {toast.message}
        </div>
      ) : null}
    </Layout>
  );
}

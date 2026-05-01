import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Calendar, type CalendarJob } from '../components/Calendar';
import { AssignConfirmModal } from '../components/AssignConfirmModal';
import {
  addWeeks,
  buildStartTimeISO,
  formatWeekRange,
  getWeekStart,
} from '../lib/datetime';
import { ApiError, apiClient } from '../lib/api';

type ScheduleState = {
  quoteId?: string;
  technicianId?: string;
  quoteName?: string;
  techName?: string;
};

type SelectedSlot = { day: Date; startHour: number };

export function ManagerSchedule() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? null) as ScheduleState | null;

  const quoteId = state?.quoteId;
  const technicianId = state?.technicianId;
  const quoteName = state?.quoteName ?? 'this quote';
  const techName = state?.techName ?? 'technician';

  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [jobs, setJobs] = useState<CalendarJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selected, setSelected] = useState<SelectedSlot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const weekEnd = useMemo(() => addWeeks(weekStart, 1), [weekStart]);

  useEffect(() => {
    if (!technicianId) return;
    let cancelled = false;
    setLoadingJobs(true);
    setLoadError(null);
    const fromISO = new Date(weekStart).toISOString();
    const toISO = new Date(weekEnd).toISOString();
    const path = `/jobs?technicianId=${encodeURIComponent(technicianId)}&from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(toISO)}`;
    apiClient
      .get<{ jobs: CalendarJob[] } | CalendarJob[]>(path)
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : (data?.jobs ?? []);
        setJobs(list);
        setLoadingJobs(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : 'Failed to load jobs');
        setLoadingJobs(false);
      });
    return () => {
      cancelled = true;
    };
  }, [technicianId, weekStart, weekEnd]);

  if (!quoteId || !technicianId) {
    return (
      <Layout>
        <header className="mb-6">
          <p className="text-xs uppercase tracking-widest text-accent-purple-400">Manager</p>
          <h1 className="text-3xl font-semibold text-ink">Schedule a job</h1>
        </header>
        <div className="card p-6 text-sm text-ink-muted">
          <p>No quote or technician selected.</p>
          <Link to="/manager" className="btn-ghost mt-3 inline-flex">
            Back to dashboard
          </Link>
        </div>
      </Layout>
    );
  }

  const handleSlotClick = (day: Date, startHour: number) => {
    setSubmitError(null);
    setSelected({ day, startHour });
  };

  const handleCancel = () => {
    if (submitting) return;
    setSelected(null);
    setSubmitError(null);
  };

  const handleConfirm = async () => {
    if (!selected) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const startTime = buildStartTimeISO(selected.day, selected.startHour);
      await apiClient.post('/jobs', { quoteId, technicianId, startTime });
      navigate('/manager', {
        replace: true,
        state: { toast: `Assigned to ${techName}.` },
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const body = err.body as { error?: string } | null;
        setSubmitError(body?.error ?? 'This slot is already booked.');
      } else if (err instanceof ApiError) {
        const body = err.body as { error?: string } | null;
        setSubmitError(body?.error ?? `Request failed (${err.status})`);
      } else {
        setSubmitError('Could not assign. Please try again.');
      }
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <header className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-accent-purple-400">Manager</p>
          <h1 className="text-3xl font-semibold text-ink leading-tight">
            Pick a 2-hour slot
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Assigning <span className="text-ink font-medium">{quoteName}</span> to{' '}
            <span className="text-ink font-medium">{techName}</span>
          </p>
        </div>
        <Link to="/manager" className="btn-ghost self-start md:self-auto">
          ← Back
        </Link>
      </header>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-ghost"
            aria-label="Previous week"
            onClick={() => setWeekStart((w) => addWeeks(w, -1))}
          >
            ←
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setWeekStart(getWeekStart(new Date()))}
          >
            Today
          </button>
          <button
            type="button"
            className="btn-ghost"
            aria-label="Next week"
            onClick={() => setWeekStart((w) => addWeeks(w, 1))}
          >
            →
          </button>
        </div>
        <p className="text-sm font-mono text-ink-muted">{formatWeekRange(weekStart)}</p>
      </div>

      {loadError ? (
        <div
          role="alert"
          className="card p-3 mb-4 border-red-500/40 text-sm text-red-200"
        >
          Couldn&rsquo;t load jobs: {loadError}
        </div>
      ) : null}

      {loadingJobs ? (
        <p className="text-sm text-ink-subtle mb-4">Loading schedule…</p>
      ) : null}

      <Calendar weekStart={weekStart} jobs={jobs} onSlotClick={handleSlotClick} />

      <AssignConfirmModal
        open={selected !== null}
        quoteName={quoteName}
        technicianName={techName}
        day={selected?.day ?? new Date()}
        startHour={selected?.startHour ?? 8}
        submitting={submitting}
        error={submitError}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </Layout>
  );
}

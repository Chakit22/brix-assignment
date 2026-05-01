import { Link, useLocation } from 'react-router-dom';
import { Layout } from '../components/Layout';

type ScheduleState = {
  quoteId?: string;
  technicianId?: string;
};

export function ManagerSchedule() {
  const location = useLocation();
  const state = (location.state ?? null) as ScheduleState | null;

  return (
    <Layout>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-accent-purple-400">Manager</p>
        <h1 className="text-3xl font-semibold text-ink">Schedule a job</h1>
        <p className="text-sm text-ink-muted mt-1">
          Calendar view lands in the next change. For now this confirms the assignment payload.
        </p>
      </header>
      <div className="card p-6 text-sm text-ink-muted space-y-2">
        <p>
          <span className="text-ink-subtle">Quote:</span> {state?.quoteId ?? '—'}
        </p>
        <p>
          <span className="text-ink-subtle">Technician:</span> {state?.technicianId ?? '—'}
        </p>
        <Link to="/manager" className="btn-ghost mt-2 inline-flex">
          Back
        </Link>
      </div>
    </Layout>
  );
}

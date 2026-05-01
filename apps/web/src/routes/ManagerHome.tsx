import { Layout } from '../components/Layout';
import { useAuth } from '../lib/auth';

export function ManagerHome() {
  const { user } = useAuth();
  return (
    <Layout>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-accent-purple-400">Manager</p>
        <h1 className="text-3xl font-semibold text-ink">Welcome, {user?.email}</h1>
        <p className="text-sm text-ink-muted mt-1">
          Schedule jobs and track technician availability.
        </p>
      </header>
      <div className="card p-6">
        <p className="text-sm text-ink-muted">
          Schedule view will land in a future change. This page exists so the auth + routing shell
          can be exercised end to end.
        </p>
      </div>
    </Layout>
  );
}

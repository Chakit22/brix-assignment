import { Layout } from '../components/Layout';
import { useAuth } from '../lib/auth';

export function TechnicianHome() {
  const { user } = useAuth();
  return (
    <Layout>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-accent-purple-400">Technician</p>
        <h1 className="text-3xl font-semibold text-ink">Hi, {user?.email}</h1>
        <p className="text-sm text-ink-muted mt-1">Your jobs will appear here.</p>
      </header>
      <div className="card p-6">
        <p className="text-sm text-ink-muted">
          Job list lands in a future change. This is a placeholder for the auth shell.
        </p>
      </div>
    </Layout>
  );
}

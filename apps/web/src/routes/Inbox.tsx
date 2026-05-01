import { Layout } from '../components/Layout';

export function Inbox() {
  return (
    <Layout>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-accent-purple-400">Inbox</p>
        <h1 className="text-3xl font-semibold text-ink">Notifications</h1>
        <p className="text-sm text-ink-muted mt-1">
          Updates about your jobs will appear here as they happen.
        </p>
      </header>
      <div className="card p-6">
        <p className="text-sm text-ink-muted">No notifications yet.</p>
      </div>
    </Layout>
  );
}

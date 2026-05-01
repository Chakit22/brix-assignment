import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../lib/api';
import { homePathForRole, StorageUnavailableError, useAuth } from '../lib/auth';

export function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as { from?: string } | null)?.from;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) navigate(fromPath ?? homePathForRole(user.role), { replace: true });
  }, [user, fromPath, navigate]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const next = await login(email, password);
      navigate(fromPath ?? homePathForRole(next.role), { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Invalid email or password.');
      } else if (err instanceof ApiError) {
        const body = err.body as { error?: string } | null;
        setError(body?.error ?? 'Something went wrong. Please try again.');
      } else if (err instanceof StorageUnavailableError) {
        setError(err.message);
      } else {
        setError('Could not reach the server. Check your connection.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <span className="h-9 w-9 rounded-lg bg-gradient-to-br from-accent-purple-400 to-accent-purple-700 shadow-glow" />
          <div>
            <div className="text-xl font-semibold tracking-tight text-ink">brix</div>
            <div className="text-xs text-ink-subtle">Service scheduling, without the chaos.</div>
          </div>
        </div>

        <div className="card p-7">
          <h1 className="text-2xl font-semibold text-ink mb-1">Welcome back</h1>
          <p className="text-sm text-ink-muted mb-6">Sign in to manage your schedule.</p>

          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <div className="field">
              <label htmlFor="email" className="field-label">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@company.io"
              />
            </div>

            <div className="field">
              <label htmlFor="password" className="field-label">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
              />
            </div>

            {error ? (
              <div
                role="alert"
                className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-md px-3 py-2"
              >
                {error}
              </div>
            ) : null}

            <button type="submit" className="btn-primary mt-2" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-xs text-ink-subtle text-center mt-6">
          Accounts are provisioned by your administrator.
        </p>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { homePathForRole, useAuth } from '../lib/auth';

export function NotFound() {
  const { user } = useAuth();
  const home = user ? homePathForRole(user.role) : '/login';

  return (
    <div className="min-h-full flex items-center justify-center px-4 py-16">
      <div className="card p-8 max-w-md text-center">
        <p className="text-xs uppercase tracking-widest text-accent-purple-400">404</p>
        <h1 className="text-3xl font-semibold text-ink mt-1 mb-2">Nothing here</h1>
        <p className="text-sm text-ink-muted mb-6">
          The page you were looking for has moved or never existed.
        </p>
        <Link to={home} className="btn-primary">
          Take me home
        </Link>
      </div>
    </div>
  );
}

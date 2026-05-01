import type { ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { homePathForRole, useAuth } from '../lib/auth';
import { NotificationBell } from './NotificationBell';

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const home = user ? homePathForRole(user.role) : '/login';

  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-bg-canvas/80 backdrop-blur">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <Link to={home} className="flex items-center gap-2 group">
            <span className="h-7 w-7 rounded-md bg-gradient-to-br from-accent-purple-400 to-accent-purple-700 shadow-glow" />
            <span className="text-lg font-semibold tracking-tight text-ink group-hover:text-accent-purple-300 transition">
              brix
            </span>
          </Link>
          {user ? (
            <nav className="flex items-center gap-1 text-sm">
              <NavLink
                to={home}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md transition ${
                    isActive ? 'text-ink bg-bg-elevated' : 'text-ink-muted hover:text-ink'
                  }`
                }
              >
                {user.role === 'manager' ? 'Schedule' : 'My jobs'}
              </NavLink>
              <NavLink
                to="/inbox"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md transition ${
                    isActive ? 'text-ink bg-bg-elevated' : 'text-ink-muted hover:text-ink'
                  }`
                }
              >
                Inbox
              </NavLink>
              <span className="mx-2 h-5 w-px bg-border-subtle" />
              <NotificationBell />
              <span className="text-xs text-ink-subtle">
                {user.email} · <span className="uppercase tracking-wider">{user.role}</span>
              </span>
              <button onClick={handleLogout} className="btn-ghost ml-1">
                Sign out
              </button>
            </nav>
          ) : null}
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}

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
        <div className="mx-auto max-w-6xl flex items-center justify-between gap-4 px-4 sm:px-6 py-3">
          <Link to={home} className="flex items-center gap-2 group shrink-0">
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
                  `hidden sm:block px-3 py-1.5 rounded-md transition whitespace-nowrap ${
                    isActive ? 'text-ink bg-bg-elevated' : 'text-ink-muted hover:text-ink'
                  }`
                }
              >
                {user.role === 'manager' ? 'Schedule' : 'My jobs'}
              </NavLink>
              <NavLink
                to="/inbox"
                className={({ isActive }) =>
                  `hidden sm:block px-3 py-1.5 rounded-md transition whitespace-nowrap ${
                    isActive ? 'text-ink bg-bg-elevated' : 'text-ink-muted hover:text-ink'
                  }`
                }
              >
                Inbox
              </NavLink>
              <span className="hidden sm:block mx-2 h-5 w-px bg-border-subtle shrink-0" />
              <NotificationBell />
              <span className="hidden sm:inline text-xs text-ink-subtle truncate max-w-[140px]">
                {user.email} · <span className="uppercase tracking-wider">{user.role}</span>
              </span>
              <button
                onClick={handleLogout}
                className="btn-ghost ml-1 whitespace-nowrap"
                aria-label="Sign out"
              >
                <span className="hidden sm:inline">Sign out</span>
                <SignOutIcon className="sm:hidden h-5 w-5" />
              </button>
            </nav>
          ) : null}
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 pb-20 sm:pb-8">{children}</div>
      </main>

      {user ? (
        <nav className="sm:hidden fixed bottom-0 inset-x-0 z-10 border-t border-border-subtle bg-bg-canvas/90 backdrop-blur flex">
          <NavLink
            to={home}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 text-xs gap-0.5 transition ${
                isActive ? 'text-accent-purple-300' : 'text-ink-muted'
              }`
            }
          >
            <HomeIcon className="h-5 w-5" />
            {user.role === 'manager' ? 'Schedule' : 'My jobs'}
          </NavLink>
          <NavLink
            to="/inbox"
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 text-xs gap-0.5 transition ${
                isActive ? 'text-accent-purple-300' : 'text-ink-muted'
              }`
            }
          >
            <InboxIcon className="h-5 w-5" />
            Inbox
          </NavLink>
        </nav>
      ) : null}
    </div>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function InboxIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

function SignOutIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

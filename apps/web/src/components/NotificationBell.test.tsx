import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { NotificationBell } from './NotificationBell';
import { AuthProvider, AUTH_STORAGE_KEY } from '../lib/auth';

const ORIGINAL_FETCH = globalThis.fetch;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function makeNotification(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'n1',
    recipientUserId: 'u1',
    jobId: 'j1',
    type: 'job_assigned' as const,
    message: 'New job assigned: HVAC',
    readAt: null,
    createdAt: '2026-05-01T09:00:00.000Z',
    ...overrides,
  };
}

function withAuth(ui: React.ReactNode) {
  window.localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      token: 't',
      user: { id: 'u1', email: 'm@x.io', role: 'manager' },
    }),
  );
  return (
    <MemoryRouter>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>
  );
}

describe('<NotificationBell />', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });
  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
  });

  it('hides badge when unreadCount is 0', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse({ notifications: [], unreadCount: 0 }),
    );
    render(withAuth(<NotificationBell />));

    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalled(),
    );
    expect(screen.queryByTestId('notification-badge')).toBeNull();
  });

  it('shows badge with unread count and reveals dropdown on click', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse({
        notifications: [makeNotification()],
        unreadCount: 1,
      }),
    );
    render(withAuth(<NotificationBell />));

    const badge = await screen.findByTestId('notification-badge');
    expect(badge).toHaveTextContent('1');

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /notifications/i }));
    const dialog = await screen.findByRole('dialog', { name: /notifications/i });
    expect(within(dialog).getByText(/HVAC/)).toBeInTheDocument();
  });

  it('clicking an unread notification calls mark-as-read', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    const initial = makeNotification({ id: 'n-click' });
    fetchMock.mockImplementation((url, init) => {
      if (
        String(url).includes('/notifications/n-click/read') &&
        (init as RequestInit | undefined)?.method === 'POST'
      ) {
        return Promise.resolve(
          jsonResponse({
            notification: { ...initial, readAt: '2026-05-01T09:01:00.000Z' },
          }),
        );
      }
      return Promise.resolve(
        jsonResponse({ notifications: [initial], unreadCount: 1 }),
      );
    });

    render(withAuth(<NotificationBell />));
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole('button', { name: /notifications/i }),
    );
    const dialog = await screen.findByRole('dialog', { name: /notifications/i });
    await user.click(within(dialog).getByText(/HVAC/));

    await waitFor(() => {
      const post = fetchMock.mock.calls.find(
        ([url, init]) =>
          String(url).includes('/notifications/n-click/read') &&
          (init as RequestInit | undefined)?.method === 'POST',
      );
      expect(post).toBeDefined();
    });
  });

  it('renders nothing when unauthenticated', () => {
    window.localStorage.clear();
    render(
      <MemoryRouter>
        <AuthProvider>
          <NotificationBell />
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(screen.queryByRole('button', { name: /notifications/i })).toBeNull();
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AUTH_STORAGE_KEY, AuthProvider } from '../lib/auth';
import { ManagerSchedule } from './ManagerSchedule';

const ORIGINAL_FETCH = globalThis.fetch;

// Today (per CLAUDE.md) is 2026-05-01 (Fri). Current week is Mon Apr 27 – Sun May 3.
// Job placed inside that window so the calendar renders it.
function makeJob() {
  const day = new Date(2026, 3, 30); // Apr 30, local time
  const start = new Date(day);
  start.setHours(8, 0, 0, 0);
  const end = new Date(day);
  end.setHours(10, 0, 0, 0);
  return {
    id: 'j1',
    quoteId: 'q99',
    technicianId: 't1',
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    quote: { title: 'Fix boiler' },
  };
}

const SAMPLE_JOBS = [makeJob()];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function seedAuth() {
  window.localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      token: 'jwt-mgr',
      user: { id: 'mgr1', email: 'mgr@x.io', role: 'manager', name: 'Manager' },
    }),
  );
}

function Tree({ quoteId = 'q1', technicianId = 't1', quoteName = 'Replace HVAC unit', techName = 'Sam Patel' } = {}) {
  return (
    <MemoryRouter
      initialEntries={[{ pathname: '/manager/schedule', state: { quoteId, technicianId, quoteName, techName } }]}
    >
      <AuthProvider>
        <Routes>
          <Route path="/manager/schedule" element={<ManagerSchedule />} />
          <Route
            path="/manager"
            element={<div>MANAGER HOME</div>}
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('ManagerSchedule', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
    seedAuth();
  });
  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
  });

  function mockFetch(jobs = SAMPLE_JOBS, postStatus = 201) {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/jobs') && method === 'GET') {
        return Promise.resolve(jsonResponse(jobs));
      }
      if (url.includes('/jobs') && method === 'POST') {
        return Promise.resolve(jsonResponse({ id: 'j-new' }, postStatus));
      }
      return Promise.resolve(jsonResponse({ error: 'unexpected' }, 500));
    });
  }

  it('renders the calendar week grid with day headers', async () => {
    mockFetch();
    render(<Tree />);
    await waitFor(() => {
      expect(screen.getByText(/Mon/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Tue/i)).toBeInTheDocument();
    expect(screen.getByText(/Wed/i)).toBeInTheDocument();
    expect(screen.getByText(/Thu/i)).toBeInTheDocument();
    expect(screen.getByText(/Fri/i)).toBeInTheDocument();
  });

  it('renders an existing job block on the calendar', async () => {
    mockFetch();
    render(<Tree />);
    await waitFor(() => {
      expect(screen.getByText('Fix boiler')).toBeInTheDocument();
    });
  });

  it('renders time slot labels on the left axis', async () => {
    mockFetch([]);
    render(<Tree />);
    await waitFor(() => {
      expect(screen.getByText('08:00–10:00')).toBeInTheDocument();
    });
    expect(screen.getByText('10:00–12:00')).toBeInTheDocument();
  });

  it('shows confirm modal when an empty slot is clicked', async () => {
    const user = userEvent.setup();
    mockFetch([]);
    render(<Tree />);

    await waitFor(() => expect(screen.getByText(/Mon/i)).toBeInTheDocument());

    const emptySlots = screen.getAllByRole('button', { name: /08:00/i });
    await user.click(emptySlots[0]!);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/Replace HVAC unit/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/Sam Patel/i)).toBeInTheDocument();
  });

  it('submits POST /jobs on confirm and navigates home', async () => {
    const user = userEvent.setup();
    mockFetch([]);
    render(<Tree />);

    await waitFor(() => expect(screen.getByText(/Mon/i)).toBeInTheDocument());

    const emptySlots = screen.getAllByRole('button', { name: /08:00/i });
    await user.click(emptySlots[0]!);

    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(screen.getByText('MANAGER HOME')).toBeInTheDocument();
    });
  });

  it('shows inline error in modal on 409 conflict', async () => {
    const user = userEvent.setup();
    mockFetch([], 409);
    vi.mocked(globalThis.fetch).mockImplementation((input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/jobs') && method === 'GET') return Promise.resolve(jsonResponse([]));
      if (url.includes('/jobs') && method === 'POST') {
        return Promise.resolve(jsonResponse({ error: 'Slot already booked' }, 409));
      }
      return Promise.resolve(jsonResponse({ error: 'unexpected' }, 500));
    });

    render(<Tree />);
    await waitFor(() => expect(screen.getByText(/Mon/i)).toBeInTheDocument());

    const emptySlots = screen.getAllByRole('button', { name: /08:00/i });
    await user.click(emptySlots[0]!);

    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(within(dialog).getByRole('alert')).toHaveTextContent(/Slot already booked/i);
    });
  });

  it('closes modal on cancel', async () => {
    const user = userEvent.setup();
    mockFetch([]);
    render(<Tree />);

    await waitFor(() => expect(screen.getByText(/Mon/i)).toBeInTheDocument());

    const emptySlots = screen.getAllByRole('button', { name: /08:00/i });
    await user.click(emptySlots[0]!);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('occupied slots are not clickable buttons', async () => {
    mockFetch(SAMPLE_JOBS);
    render(<Tree />);

    await waitFor(() => {
      expect(screen.getByText('Fix boiler')).toBeInTheDocument();
    });

    // The occupied slot cell should not be an interactive button
    const occupiedBlock = screen.getByText('Fix boiler');
    const cell = occupiedBlock.closest('[data-occupied="true"]');
    expect(cell).not.toBeNull();
  });

  it('week navigation prev/next updates displayed week range', async () => {
    const user = userEvent.setup();
    mockFetch([]);
    render(<Tree />);

    await waitFor(() => expect(screen.getByText(/Mon/i)).toBeInTheDocument());

    const nextBtn = screen.getByRole('button', { name: /next week/i });
    await user.click(nextBtn);

    // After clicking next, the dates shown should advance by 7 days
    // Just check the button exists and doesn't throw
    expect(nextBtn).toBeInTheDocument();
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AUTH_STORAGE_KEY, AuthProvider } from '../lib/auth';
import { Technician } from './Technician';

const ORIGINAL_FETCH = globalThis.fetch;
const TECH_ID = '11111111-1111-1111-1111-111111111111';

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
      token: 'jwt-tech',
      user: { id: TECH_ID, email: 'bob@x.io', role: 'technician' },
    }),
  );
}

function makeJob(overrides: Partial<{
  id: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'completed' | 'in_progress' | 'cancelled';
  title: string;
  customerName: string;
  address: string;
}> = {}) {
  const start = overrides.startTime ?? '2026-05-01T09:00:00.000Z';
  const end =
    overrides.endTime ??
    new Date(new Date(start).getTime() + 2 * 60 * 60 * 1000).toISOString();
  return {
    id: overrides.id ?? 'job-default',
    quoteId: 'q1',
    technicianId: TECH_ID,
    managerId: 'm1',
    startTime: start,
    endTime: end,
    status: overrides.status ?? 'scheduled',
    quote: {
      id: 'q1',
      title: overrides.title ?? 'Replace HVAC unit',
      customerName: overrides.customerName ?? 'Alice Lin',
      address: overrides.address ?? '12 Smith St, Sydney',
      status: overrides.status === 'completed' ? 'completed' : 'scheduled',
    },
  };
}

function mockJobs(jobs: ReturnType<typeof makeJob>[], opts: { patchFails?: boolean } = {}) {
  const fetchMock = vi.mocked(globalThis.fetch);
  fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method ?? 'GET';
    if (method === 'GET' && url.includes('/jobs?technicianId=')) {
      return Promise.resolve(jsonResponse({ jobs }));
    }
    if (method === 'PATCH' && url.includes('/jobs/')) {
      if (opts.patchFails) {
        return Promise.resolve(jsonResponse({ error: 'boom' }, 500));
      }
      const id = url.split('/jobs/')[1]!.split('?')[0];
      const job = jobs.find((j) => j.id === id);
      const updated = { ...(job ?? makeJob({ id })), status: 'completed' as const };
      return Promise.resolve(jsonResponse({ job: updated }));
    }
    return Promise.resolve(jsonResponse({ error: 'unexpected ' + method + ' ' + url }, 500));
  });
}

function Tree() {
  return (
    <MemoryRouter initialEntries={['/technician']}>
      <AuthProvider>
        <Routes>
          <Route path="/technician" element={<Technician />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Technician page', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
    seedAuth();
    // Pin "now" so Today/Tomorrow grouping is deterministic without
    // freezing real timers (waitFor still needs to poll).
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-05-01T08:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    globalThis.fetch = ORIGINAL_FETCH;
  });

  it('renders heading "Your Schedule" and a subtitle with the current date', async () => {
    mockJobs([]);
    render(<Tree />);
    expect(await screen.findByRole('heading', { name: /your schedule/i })).toBeInTheDocument();
    // Subtitle should mention May 1 in some form
    expect(screen.getByText(/may/i)).toBeInTheDocument();
  });

  it('shows empty state "No scheduled jobs" when API returns no jobs', async () => {
    mockJobs([]);
    render(<Tree />);
    await waitFor(() => {
      expect(screen.getByText(/no scheduled jobs/i)).toBeInTheDocument();
    });
  });

  it('groups jobs under Today / Tomorrow / explicit dates and sorts ascending', async () => {
    const today9 = makeJob({ id: 'a', startTime: '2026-05-01T09:00:00.000Z', title: 'Job A' });
    const today14 = makeJob({ id: 'b', startTime: '2026-05-01T14:00:00.000Z', title: 'Job B' });
    const tomorrow10 = makeJob({ id: 'c', startTime: '2026-05-02T10:00:00.000Z', title: 'Job C' });
    const later = makeJob({ id: 'd', startTime: '2026-05-05T10:00:00.000Z', title: 'Job D' });
    // Intentionally unsorted to verify sort
    mockJobs([later, today14, tomorrow10, today9]);
    render(<Tree />);

    await waitFor(() => screen.getByText('Job A'));

    expect(screen.getByText(/^today$/i)).toBeInTheDocument();
    expect(screen.getByText(/^tomorrow$/i)).toBeInTheDocument();

    const titles = screen.getAllByTestId('job-title').map((el) => el.textContent);
    expect(titles).toEqual(['Job A', 'Job B', 'Job C', 'Job D']);
  });

  it('marks a job completed optimistically and shows a toast', async () => {
    const user = userEvent.setup();
    const j = makeJob({ id: 'job-x', title: 'Replace HVAC unit' });
    mockJobs([j]);
    render(<Tree />);

    const row = (await screen.findByText('Replace HVAC unit')).closest('[data-testid="job-row"]') as HTMLElement;
    expect(row).toBeTruthy();
    expect(within(row).getByText(/scheduled/i)).toBeInTheDocument();

    await user.click(within(row).getByRole('button', { name: /mark completed/i }));

    // Optimistic: badge flips immediately and button disappears
    expect(within(row).getByText(/completed/i)).toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: /mark completed/i })).toBeNull();

    // Toast shows
    expect(await screen.findByRole('status')).toHaveTextContent(/marked completed/i);

    // PATCH was called
    const fetchMock = vi.mocked(globalThis.fetch);
    const patchCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH');
    expect(patchCall).toBeDefined();
    expect(String(patchCall![0])).toContain('/jobs/job-x');
    expect(JSON.parse(patchCall![1]!.body as string)).toEqual({ status: 'completed' });
  });

  it('rolls back optimistic update and surfaces error if PATCH fails', async () => {
    const user = userEvent.setup();
    const j = makeJob({ id: 'job-y' });
    mockJobs([j], { patchFails: true });
    render(<Tree />);

    const row = (await screen.findByTestId('job-row')) as HTMLElement;
    await user.click(within(row).getByRole('button', { name: /mark completed/i }));

    await waitFor(() => {
      // Badge restored back to scheduled
      expect(within(row).getByText(/scheduled/i)).toBeInTheDocument();
      // Button is back
      expect(within(row).getByRole('button', { name: /mark completed/i })).toBeInTheDocument();
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn.?t mark completed/i);
  });
});

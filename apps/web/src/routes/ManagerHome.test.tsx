import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AUTH_STORAGE_KEY, AuthProvider } from '../lib/auth';
import { ManagerHome } from './ManagerHome';

const ORIGINAL_FETCH = globalThis.fetch;

const SAMPLE_TECHS = [
  { id: 't1', email: 'sam@x.io', name: 'Sam Patel', role: 'technician' },
  { id: 't2', email: 'riya@x.io', name: 'Riya Chen', role: 'technician' },
];

const SAMPLE_QUOTES = [
  {
    id: 'q1',
    title: 'Replace HVAC unit',
    customerName: 'Alice Lin',
    address: '12 Smith St',
    status: 'unscheduled',
  },
  {
    id: 'q2',
    title: 'Repair leaking faucet',
    customerName: 'Bob Tran',
    address: '8 Elm Rd',
    status: 'unscheduled',
  },
];

function ScheduleProbe() {
  const loc = useLocation();
  const state = loc.state as { quoteId?: string; technicianId?: string } | null;
  return (
    <div>
      SCHEDULE PAGE quote={state?.quoteId ?? ''} tech={state?.technicianId ?? ''}
    </div>
  );
}

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
      user: { id: 'mgr1', email: 'mgr@x.io', role: 'manager' },
    }),
  );
}

function mockListEndpoints(opts: { quotes?: unknown; techs?: unknown; quotesStatus?: number; techsStatus?: number } = {}) {
  const fetchMock = vi.mocked(globalThis.fetch);
  fetchMock.mockImplementation((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes('/quotes')) {
      return Promise.resolve(jsonResponse(opts.quotes ?? SAMPLE_QUOTES, opts.quotesStatus ?? 200));
    }
    if (url.includes('/users')) {
      return Promise.resolve(jsonResponse(opts.techs ?? SAMPLE_TECHS, opts.techsStatus ?? 200));
    }
    return Promise.resolve(jsonResponse({ error: 'unexpected url ' + url }, 500));
  });
}

function Tree() {
  return (
    <MemoryRouter initialEntries={['/manager']}>
      <AuthProvider>
        <Routes>
          <Route path="/manager" element={<ManagerHome />} />
          <Route path="/manager/schedule" element={<ScheduleProbe />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('ManagerHome', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
    seedAuth();
  });
  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
  });

  it('renders technicians sidebar and unscheduled quote cards', async () => {
    mockListEndpoints();
    render(<Tree />);

    await waitFor(() => {
      expect(screen.getByText('Sam Patel')).toBeInTheDocument();
    });
    expect(screen.getByText('Riya Chen')).toBeInTheDocument();
    expect(screen.getByText('Replace HVAC unit')).toBeInTheDocument();
    expect(screen.getByText('Repair leaking faucet')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    mockListEndpoints();
    render(<Tree />);
    expect(screen.getAllByText(/loading/i).length).toBeGreaterThan(0);
  });

  it('shows an empty state when there are no unscheduled quotes', async () => {
    mockListEndpoints({ quotes: [] });
    render(<Tree />);
    await waitFor(() => {
      expect(screen.getByText(/no unscheduled quotes/i)).toBeInTheDocument();
    });
  });

  it('shows an error state if quotes fail to load', async () => {
    mockListEndpoints({ quotes: { error: 'boom' }, quotesStatus: 500 });
    render(<Tree />);
    await waitFor(() => {
      expect(screen.getByText(/couldn.?t load quotes/i)).toBeInTheDocument();
    });
  });

  it('prompts when Assign is clicked without a selected technician', async () => {
    const user = userEvent.setup();
    mockListEndpoints();
    render(<Tree />);

    await waitFor(() => screen.getByText('Replace HVAC unit'));

    const firstCard = screen.getByText('Replace HVAC unit').closest('article')!;
    await user.click(within(firstCard).getByRole('button', { name: /assign/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/select a technician/i);
  });

  it('navigates to /manager/schedule with quote + technician state when Assign is clicked with a selection', async () => {
    const user = userEvent.setup();
    mockListEndpoints();
    render(<Tree />);

    await waitFor(() => screen.getByText('Sam Patel'));

    await user.click(screen.getByRole('button', { name: /sam patel/i }));
    expect(screen.getByRole('button', { name: /sam patel/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    const card = screen.getByText('Replace HVAC unit').closest('article')!;
    await user.click(within(card).getByRole('button', { name: /assign/i }));

    await waitFor(() => {
      expect(screen.getByText(/SCHEDULE PAGE quote=q1 tech=t1/)).toBeInTheDocument();
    });
  });
});

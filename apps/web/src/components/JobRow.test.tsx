import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Job } from '@brix/shared';
import { JobRow } from './JobRow';

const baseJob: Job = {
  id: 'job1',
  quoteId: 'q1',
  technicianId: 't1',
  managerId: 'm1',
  startTime: '2026-05-01T09:00:00.000Z',
  endTime: '2026-05-01T11:00:00.000Z',
  status: 'scheduled',
  quote: {
    id: 'q1',
    title: 'Replace HVAC unit',
    customerName: 'Alice Lin',
    address: '12 Smith St, Sydney',
    status: 'scheduled',
  },
};

describe('JobRow', () => {
  it('renders quote title, customer, address, and a time range', () => {
    render(<JobRow job={baseJob} onMarkCompleted={() => {}} />);
    expect(screen.getByText('Replace HVAC unit')).toBeInTheDocument();
    expect(screen.getByText('Alice Lin')).toBeInTheDocument();
    expect(screen.getByText('12 Smith St, Sydney')).toBeInTheDocument();
    // 2-hour span — should render two times separated by an en or em dash
    expect(screen.getByTestId('job-time-range').textContent).toMatch(/.+[–-].+/);
  });

  it('shows Mark Completed button when scheduled and calls handler with job id', async () => {
    const user = userEvent.setup();
    const onMarkCompleted = vi.fn();
    render(<JobRow job={baseJob} onMarkCompleted={onMarkCompleted} />);

    const button = screen.getByRole('button', { name: /mark completed/i });
    await user.click(button);
    expect(onMarkCompleted).toHaveBeenCalledWith('job1');
  });

  it('hides Mark Completed button when status is completed', () => {
    const completed: Job = {
      ...baseJob,
      status: 'completed',
      quote: { ...baseJob.quote, status: 'completed' },
    };
    render(<JobRow job={completed} onMarkCompleted={() => {}} />);
    expect(screen.queryByRole('button', { name: /mark completed/i })).toBeNull();
  });

  it('renders the status badge', () => {
    render(<JobRow job={baseJob} onMarkCompleted={() => {}} />);
    expect(screen.getByText(/scheduled/i)).toBeInTheDocument();
  });
});

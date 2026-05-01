import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders Scheduled with purple accent for scheduled status', () => {
    render(<StatusBadge status="scheduled" />);
    const badge = screen.getByText(/scheduled/i);
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/purple/);
  });

  it('renders Completed with green accent for completed status', () => {
    render(<StatusBadge status="completed" />);
    const badge = screen.getByText(/completed/i);
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/green|emerald/);
  });
});

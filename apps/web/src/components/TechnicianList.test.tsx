import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TechnicianList } from './TechnicianList';

const techs = [
  { id: 't1', name: 'Sam Patel', email: 'sam@x.io', role: 'technician' as const },
  { id: 't2', name: 'Riya Chen', email: 'riya@x.io', role: 'technician' as const },
];

describe('TechnicianList', () => {
  it('renders each technician name', () => {
    render(<TechnicianList technicians={techs} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText('Sam Patel')).toBeInTheDocument();
    expect(screen.getByText('Riya Chen')).toBeInTheDocument();
  });

  it('marks the selected technician with aria-pressed=true', () => {
    render(<TechnicianList technicians={techs} selectedId="t2" onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: /sam patel/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: /riya chen/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('calls onSelect with the technician id on click', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<TechnicianList technicians={techs} selectedId={null} onSelect={onSelect} />);
    await user.click(screen.getByRole('button', { name: /sam patel/i }));
    expect(onSelect).toHaveBeenCalledWith('t1');
  });

  it('renders an empty-state message when there are no technicians', () => {
    render(<TechnicianList technicians={[]} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText(/no technicians/i)).toBeInTheDocument();
  });
});

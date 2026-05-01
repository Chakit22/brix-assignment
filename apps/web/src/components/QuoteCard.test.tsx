import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuoteCard } from './QuoteCard';

const baseQuote = {
  id: 'q1',
  title: 'Replace HVAC unit',
  customerName: 'Alice Lin',
  address: '12 Smith St, Sydney',
  status: 'unscheduled' as const,
};

describe('QuoteCard', () => {
  it('renders title, customer, and address', () => {
    render(<QuoteCard quote={baseQuote} onAssign={() => {}} />);
    expect(screen.getByText('Replace HVAC unit')).toBeInTheDocument();
    expect(screen.getByText('Alice Lin')).toBeInTheDocument();
    expect(screen.getByText('12 Smith St, Sydney')).toBeInTheDocument();
  });

  it('calls onAssign with the quote when Assign is clicked', async () => {
    const user = userEvent.setup();
    const onAssign = vi.fn();
    render(<QuoteCard quote={baseQuote} onAssign={onAssign} />);
    await user.click(screen.getByRole('button', { name: /assign/i }));
    expect(onAssign).toHaveBeenCalledWith(baseQuote);
  });
});

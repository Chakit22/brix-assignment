import type { Quote } from '@brix/shared';

type QuoteCardProps = {
  quote: Quote;
  onAssign: (quote: Quote) => void;
};

export function QuoteCard({ quote, onAssign }: QuoteCardProps) {
  return (
    <article className="card p-5 flex flex-col gap-3">
      <div>
        <h3 className="text-base font-semibold text-ink">{quote.title}</h3>
        <p className="text-xs uppercase tracking-wider text-accent-purple-300 mt-1">
          {quote.status}
        </p>
      </div>
      <dl className="text-sm text-ink-muted space-y-1">
        <div>
          <dt className="sr-only">Customer</dt>
          <dd>{quote.customerName}</dd>
        </div>
        <div>
          <dt className="sr-only">Address</dt>
          <dd className="text-ink-subtle">{quote.address}</dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={() => onAssign(quote)}
        className="btn-primary self-start"
      >
        Assign
      </button>
    </article>
  );
}

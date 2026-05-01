import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Quote } from '@brix/shared';
import { Layout } from '../components/Layout';
import { QuoteCard } from '../components/QuoteCard';
import { TechnicianList } from '../components/TechnicianList';
import { useTechnicians, useUnscheduledQuotes } from '../lib/queries';

export function ManagerHome() {
  const navigate = useNavigate();
  const techs = useTechnicians();
  const quotes = useUnscheduledQuotes();
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);

  const handleAssign = (quote: Quote) => {
    if (!selectedTechId) {
      setPrompt('Select a technician from the sidebar first.');
      return;
    }
    setPrompt(null);
    navigate('/manager/schedule', {
      state: { quoteId: quote.id, technicianId: selectedTechId },
    });
  };

  const handleSelectTech = (id: string) => {
    setSelectedTechId(id);
    if (prompt) setPrompt(null);
  };

  return (
    <Layout>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-accent-purple-400">Manager</p>
        <h1 className="text-3xl font-semibold text-ink">Schedule</h1>
        <p className="text-sm text-ink-muted mt-1">
          Pick a technician, then assign an unscheduled quote.
        </p>
      </header>

      {prompt ? (
        <div
          role="alert"
          className="card p-3 mb-4 border-accent-purple-500/50 text-sm text-accent-purple-200"
        >
          {prompt}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-6">
        <aside className="card p-4 h-fit">
          <h2 className="text-xs uppercase tracking-widest text-ink-subtle mb-3">
            Technicians
          </h2>
          {techs.loading ? (
            <p className="text-sm text-ink-subtle">Loading technicians…</p>
          ) : techs.error ? (
            <p className="text-sm text-red-300">Couldn&rsquo;t load technicians.</p>
          ) : (
            <TechnicianList
              technicians={techs.data ?? []}
              selectedId={selectedTechId}
              onSelect={handleSelectTech}
            />
          )}
        </aside>

        <section>
          <h2 className="text-xs uppercase tracking-widest text-ink-subtle mb-3">
            Unscheduled quotes
          </h2>
          {quotes.loading ? (
            <p className="text-sm text-ink-subtle">Loading quotes…</p>
          ) : quotes.error ? (
            <p className="text-sm text-red-300">Couldn&rsquo;t load quotes.</p>
          ) : (quotes.data ?? []).length === 0 ? (
            <div className="card p-6 text-sm text-ink-muted">
              No unscheduled quotes right now.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(quotes.data ?? []).map((q) => (
                <QuoteCard key={q.id} quote={q} onAssign={handleAssign} />
              ))}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}

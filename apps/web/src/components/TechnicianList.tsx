import type { PublicUser } from '@brix/shared';

type TechnicianListProps = {
  technicians: PublicUser[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function TechnicianList({ technicians, selectedId, onSelect }: TechnicianListProps) {
  if (technicians.length === 0) {
    return (
      <p className="text-sm text-ink-subtle">
        No technicians available yet.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {technicians.map((tech) => {
        const isSelected = tech.id === selectedId;
        return (
          <li key={tech.id}>
            <button
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(tech.id)}
              className={`w-full text-left rounded-md px-3 py-2 text-sm transition border ${
                isSelected
                  ? 'border-accent-purple-500 bg-accent-purple-500/10 text-ink shadow-glow'
                  : 'border-transparent text-ink-muted hover:text-ink hover:bg-bg-elevated'
              }`}
            >
              <span className="block font-medium">{tech.name}</span>
              <span className="block text-xs text-ink-subtle">{tech.email}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

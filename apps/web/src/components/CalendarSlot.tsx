import { formatSlotLabel } from '../lib/datetime';

type CalendarSlotProps = {
  day: Date;
  startHour: number;
  occupied: boolean;
  jobTitle?: string | null;
  onClick?: () => void;
};

export function CalendarSlot({ day, startHour, occupied, jobTitle, onClick }: CalendarSlotProps) {
  const slotLabel = formatSlotLabel(startHour);
  const dayLabel = day.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
  const ariaLabel = `${dayLabel} ${slotLabel}`;

  if (occupied) {
    return (
      <div
        data-occupied="true"
        className="relative h-20 rounded-md border border-accent-purple-500/40 bg-gradient-to-br from-accent-purple-700/60 to-accent-purple-900/60 px-2 py-1.5 cursor-not-allowed select-none overflow-hidden"
        aria-label={`${ariaLabel} — booked`}
      >
        <div className="absolute inset-0 opacity-20 pointer-events-none [background-image:repeating-linear-gradient(45deg,rgba(255,255,255,0.08)_0,rgba(255,255,255,0.08)_2px,transparent_2px,transparent_8px)]" />
        <p className="relative text-2xs uppercase tracking-wider text-accent-purple-200/70">
          {slotLabel.split('–')[0]}
        </p>
        <p className="relative text-xs font-medium text-ink leading-tight mt-0.5 line-clamp-2">
          {jobTitle ?? 'Booked'}
        </p>
      </div>
    );
  }

  return (
    <button
      type="button"
      data-occupied="false"
      onClick={onClick}
      aria-label={ariaLabel}
      className="group relative h-20 rounded-md border border-border-subtle/70 bg-bg-elevated/30 px-2 py-1.5 text-left transition hover:border-accent-purple-400/70 hover:bg-accent-purple-500/10 hover:shadow-glow focus-visible:outline-none focus-visible:border-accent-purple-400 focus-visible:ring-2 focus-visible:ring-accent-purple-500/40"
    >
      <p className="text-2xs uppercase tracking-wider text-ink-subtle group-hover:text-accent-purple-200">
        {slotLabel.split('–')[0]}
      </p>
      <p className="text-2xs text-ink-subtle/70 mt-0.5 opacity-0 group-hover:opacity-100 transition">
        Click to assign
      </p>
    </button>
  );
}

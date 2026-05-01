import { CalendarSlot } from './CalendarSlot';
import {
  formatDayHeader,
  formatSlotLabel,
  generateSlots,
  getJobForSlot,
  getWeekDays,
  isSlotOccupied,
} from '../lib/datetime';

export type CalendarJob = {
  id: string;
  startTime: string;
  endTime: string;
  quote?: { title: string } | null;
};

type CalendarProps = {
  weekStart: Date;
  jobs: CalendarJob[];
  dayStart?: number;
  dayEnd?: number;
  onSlotClick: (day: Date, startHour: number) => void;
};

export function Calendar({
  weekStart,
  jobs,
  dayStart = 8,
  dayEnd = 18,
  onSlotClick,
}: CalendarProps) {
  const days = getWeekDays(weekStart);
  const slots = generateSlots(dayStart, dayEnd);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="card overflow-hidden">
      <div
        className="grid border-b border-border-subtle"
        style={{ gridTemplateColumns: '72px repeat(7, minmax(0, 1fr))' }}
      >
        <div className="px-3 py-3 text-2xs uppercase tracking-widest text-ink-subtle">
          Time
        </div>
        {days.map((day) => {
          const isToday = day.getTime() === today.getTime();
          return (
            <div
              key={day.toISOString()}
              className={`px-2 py-3 text-center border-l border-border-subtle ${
                isToday ? 'bg-accent-purple-500/10' : ''
              }`}
            >
              <p
                className={`text-2xs uppercase tracking-widest ${
                  isToday ? 'text-accent-purple-300' : 'text-ink-subtle'
                }`}
              >
                {formatDayHeader(day).split(' ')[0]}
              </p>
              <p
                className={`text-base font-semibold mt-0.5 ${
                  isToday ? 'text-ink' : 'text-ink-muted'
                }`}
              >
                {day.getDate()}
              </p>
            </div>
          );
        })}
      </div>

      <div>
        {slots.map((slot) => (
          <div
            key={slot.startHour}
            className="grid border-b border-border-subtle/60 last:border-b-0"
            style={{ gridTemplateColumns: '72px repeat(7, minmax(0, 1fr))' }}
          >
            <div className="px-3 py-3 text-2xs font-mono text-ink-subtle border-r border-border-subtle/60">
              {formatSlotLabel(slot.startHour)}
            </div>
            {days.map((day) => {
              const occupied = isSlotOccupied(day, slot.startHour, jobs);
              const job = getJobForSlot(day, slot.startHour, jobs);
              return (
                <div
                  key={`${day.toISOString()}-${slot.startHour}`}
                  className="p-1.5 border-l border-border-subtle/60"
                >
                  <CalendarSlot
                    day={day}
                    startHour={slot.startHour}
                    occupied={occupied}
                    jobTitle={job?.quote?.title}
                    onClick={() => onSlotClick(day, slot.startHour)}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

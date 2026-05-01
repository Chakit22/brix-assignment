export type TimeSlot = {
  startHour: number;
  endHour: number;
};

export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function getWeekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export function generateSlots(dayStart: number, dayEnd: number): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (let h = dayStart; h < dayEnd; h += 2) {
    slots.push({ startHour: h, endHour: h + 2 });
  }
  return slots;
}

export function slotKey(day: Date, startHour: number): string {
  const yyyy = day.getFullYear();
  const mm = String(day.getMonth() + 1).padStart(2, '0');
  const dd = String(day.getDate()).padStart(2, '0');
  const hh = String(startHour).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}-${hh}`;
}

export function formatSlotLabel(startHour: number): string {
  const start = `${String(startHour).padStart(2, '0')}:00`;
  const end = `${String(startHour + 2).padStart(2, '0')}:00`;
  return `${start}–${end}`;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatDayHeader(day: Date): string {
  return `${DAY_NAMES[day.getDay()]} ${day.getDate()}`;
}

export function formatDayFull(day: Date): string {
  return day.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function addWeeks(date: Date, delta: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + delta * 7);
  return d;
}

export function toLocalISOString(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function slotStartISO(day: Date, startHour: number): string {
  const yyyy = day.getFullYear();
  const mm = String(day.getMonth() + 1).padStart(2, '0');
  const dd = String(day.getDate()).padStart(2, '0');
  const hh = String(startHour).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:00:00`;
}

export function buildStartTimeISO(day: Date, startHour: number): string {
  const d = new Date(day);
  d.setHours(startHour, 0, 0, 0);
  return d.toISOString();
}

export function isSlotOccupied(
  day: Date,
  startHour: number,
  jobs: { startTime: string; endTime: string }[],
): boolean {
  const slotStart = new Date(day);
  slotStart.setHours(startHour, 0, 0, 0);
  const slotEnd = new Date(slotStart);
  slotEnd.setHours(startHour + 2, 0, 0, 0);

  return jobs.some((job) => {
    const jobStart = new Date(job.startTime);
    const jobEnd = new Date(job.endTime);
    return jobStart < slotEnd && jobEnd > slotStart;
  });
}

export function getJobForSlot(
  day: Date,
  startHour: number,
  jobs: Array<{ startTime: string; endTime: string; quote?: { title: string } | null }>,
): { startTime: string; endTime: string; quote?: { title: string } | null } | null {
  const slotStart = new Date(day);
  slotStart.setHours(startHour, 0, 0, 0);
  const slotEnd = new Date(slotStart);
  slotEnd.setHours(startHour + 2, 0, 0, 0);

  return (
    jobs.find((job) => {
      const jobStart = new Date(job.startTime);
      const jobEnd = new Date(job.endTime);
      return jobStart < slotEnd && jobEnd > slotStart;
    }) ?? null
  );
}

export function formatTimeRange(startISO: string, endISO: string): string {
  const fmt: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  const start = new Date(startISO).toLocaleTimeString(undefined, fmt);
  const end = new Date(endISO).toLocaleTimeString(undefined, fmt);
  return `${start} – ${end}`;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function dayDeltaFromNow(target: Date, now: Date): number {
  const a = startOfDay(target).getTime();
  const b = startOfDay(now).getTime();
  return Math.round((a - b) / (24 * 60 * 60 * 1000));
}

export function formatDayLabel(target: Date, now: Date): string {
  const delta = dayDeltaFromNow(target, now);
  if (delta === 0) return 'Today';
  if (delta === 1) return 'Tomorrow';
  return target.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatLongDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export type JobLike = {
  id: string;
  startTime: string;
};

export type JobGroup<J extends JobLike = JobLike> = {
  key: string;
  label: string;
  date: Date;
  jobs: J[];
};

export function groupJobsByDay<J extends JobLike>(jobs: J[], now: Date): JobGroup<J>[] {
  const sorted = [...jobs].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );
  const groups = new Map<string, JobGroup<J>>();
  for (const job of sorted) {
    const day = startOfDay(new Date(job.startTime));
    const key = day.toISOString();
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        label: formatDayLabel(day, now),
        date: day,
        jobs: [],
      };
      groups.set(key, group);
    }
    group.jobs.push(job);
  }
  return [...groups.values()].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
}

export function formatWeekRange(monday: Date): string {
  const sunday = addWeeks(monday, 1);
  sunday.setDate(sunday.getDate() - 1);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${monday.toLocaleDateString(undefined, opts)} – ${sunday.toLocaleDateString(undefined, opts)}`;
}

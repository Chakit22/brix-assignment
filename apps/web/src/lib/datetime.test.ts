import { describe, it, expect } from 'vitest';
import {
  getWeekStart,
  getWeekDays,
  generateSlots,
  slotKey,
  formatSlotLabel,
  formatDayHeader,
  addWeeks,
} from './datetime';

describe('getWeekStart', () => {
  it('returns Monday of the current week (ISO week)', () => {
    const wed = new Date(2026, 4, 6); // Wed May 6 2026
    const monday = getWeekStart(wed);
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(4);
    expect(monday.getMonth()).toBe(4);
  });

  it('returns same day when date is Monday', () => {
    const mon = new Date(2026, 4, 4);
    const result = getWeekStart(mon);
    expect(result.getDate()).toBe(4);
    expect(result.getDay()).toBe(1);
  });

  it('returns Monday when date is Sunday', () => {
    const sun = new Date(2026, 4, 3); // Sunday
    const result = getWeekStart(sun);
    expect(result.getDate()).toBe(27); // prev Monday Apr 27
    expect(result.getDay()).toBe(1);
  });
});

describe('getWeekDays', () => {
  it('returns 7 days starting from the given Monday', () => {
    const monday = new Date(2026, 4, 4);
    const days = getWeekDays(monday);
    expect(days).toHaveLength(7);
    expect(days[0]!.getDate()).toBe(4);
    expect(days[6]!.getDate()).toBe(10);
  });
});

describe('generateSlots', () => {
  it('generates 5 slots from 08:00 to 18:00 (exclusive end)', () => {
    const slots = generateSlots(8, 18);
    expect(slots).toHaveLength(5);
    expect(slots[0]).toEqual({ startHour: 8, endHour: 10 });
    expect(slots[4]).toEqual({ startHour: 16, endHour: 18 });
  });

  it('generates 3 slots from 10:00 to 16:00', () => {
    const slots = generateSlots(10, 16);
    expect(slots).toHaveLength(3);
    expect(slots[0]).toEqual({ startHour: 10, endHour: 12 });
  });
});

describe('slotKey', () => {
  it('returns YYYY-MM-DD-HH for a given date and hour', () => {
    const day = new Date(2026, 4, 5); // May 5
    expect(slotKey(day, 9)).toBe('2026-05-05-09');
  });
});

describe('formatSlotLabel', () => {
  it('formats slot as "09:00–11:00"', () => {
    expect(formatSlotLabel(9)).toBe('09:00–11:00');
  });

  it('formats single-digit hours with leading zero', () => {
    expect(formatSlotLabel(8)).toBe('08:00–10:00');
  });
});

describe('formatDayHeader', () => {
  it('returns short weekday + date', () => {
    const day = new Date(2026, 4, 4); // Monday
    const result = formatDayHeader(day);
    expect(result).toMatch(/Mon/);
    expect(result).toMatch(/4/);
  });
});

describe('addWeeks', () => {
  it('adds positive weeks', () => {
    const mon = new Date(2026, 4, 4);
    const next = addWeeks(mon, 1);
    expect(next.getDate()).toBe(11);
  });

  it('subtracts weeks with negative delta', () => {
    const mon = new Date(2026, 4, 11);
    const prev = addWeeks(mon, -1);
    expect(prev.getDate()).toBe(4);
  });
});

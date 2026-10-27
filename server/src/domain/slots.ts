import type { Appointment, WorkingDay } from "./types.ts";
import {
  BOOKING_WINDOW_DAYS,
  SLOT_STEP_MINUTES,
  addDays,
  dayOfWeek,
  isValidDate,
  localDateOf,
  parseHm,
  toLocalIso,
} from "./time.ts";

export type SlotQuery = {
  date: string;
  durationMinutes: number;
  workingDays: WorkingDay[];
  appointments: Appointment[];
  now: Date;
};

export function getAvailableSlots({ date, durationMinutes, workingDays, appointments, now }: SlotQuery): string[] {
  const today = localDateOf(now);
  if (!isValidDate(date) || date < today || date > addDays(today, BOOKING_WINDOW_DAYS - 1)) return [];

  const busy = appointments.map((a) => [Date.parse(a.start), Date.parse(a.end)]);
  const day = dayOfWeek(date);
  const slots: string[] = [];

  for (const workingDay of workingDays.filter((w) => w.day === day)) {
    for (const range of workingDay.ranges) {
      const last = parseHm(range.end) - durationMinutes;
      for (let minutes = parseHm(range.start); minutes <= last; minutes += SLOT_STEP_MINUTES) {
        const start = toLocalIso(date, minutes);
        const startMs = Date.parse(start);
        const endMs = startMs + durationMinutes * 60_000;
        if (startMs < now.getTime()) continue;
        if (busy.some(([s, e]) => startMs < e && s < endMs)) continue;
        slots.push(start);
      }
    }
  }

  return slots.sort();
}

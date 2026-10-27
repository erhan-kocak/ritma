// Tüm hesaplar Europe/Istanbul için; Türkiye'de yaz saati yok, fark sabit +03:00.
export const TZ_OFFSET = "+03:00";
export const SLOT_STEP_MINUTES = 15;
export const BOOKING_WINDOW_DAYS = 14;

const OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (n: number) => String(n).padStart(2, "0");

function dateToUtcMs(date: string): number {
  const [, y, m, d] = DATE_PATTERN.exec(date)!;
  return Date.UTC(Number(y), Number(m) - 1, Number(d));
}

export function isValidDate(date: string): boolean {
  if (!DATE_PATTERN.test(date)) return false;
  return new Date(dateToUtcMs(date)).toISOString().slice(0, 10) === date;
}

export function localDateOf(instant: Date): string {
  return new Date(instant.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return new Date(dateToUtcMs(date) + days * DAY_MS).toISOString().slice(0, 10);
}

export function dayOfWeek(date: string): number {
  return new Date(dateToUtcMs(date)).getUTCDay() || 7;
}

export function parseHm(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

export function toLocalIso(date: string, minutes: number): string {
  return `${date}T${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}:00${TZ_OFFSET}`;
}

import { test } from "node:test";
import assert from "node:assert/strict";
import { getAvailableSlots } from "../src/domain/slots.ts";
import type { Appointment, WorkingDay } from "../src/domain/types.ts";

const NOW = new Date("2026-10-28T08:00:00+03:00");
const workingDays: WorkingDay[] = [1, 2, 3, 4, 5].map((day) => ({
  providerId: "p1",
  day,
  ranges: [
    { start: "09:00", end: "12:00" },
    { start: "13:00", end: "18:00" },
  ],
}));

const at = (hm: string, date = "2026-10-28") => `${date}T${hm}:00+03:00`;

function appointment(start: string, end: string): Appointment {
  return {
    id: start,
    providerId: "p1",
    serviceId: "s45",
    start: at(start),
    end: at(end),
    clientName: "Test",
    clientEmail: "test@ornek.com",
    createdAt: NOW.toISOString(),
  };
}

function slots(overrides: { date?: string; durationMinutes?: number; appointments?: Appointment[]; now?: Date } = {}) {
  return getAvailableSlots({
    date: "2026-10-28",
    durationMinutes: 45,
    workingDays,
    appointments: [],
    now: NOW,
    ...overrides,
  });
}

test("aralıkları ve öğle arasını böler, sığmayan slotu üretmez", () => {
  const result = slots();
  assert.equal(result[0], at("09:00"));
  assert.ok(result.includes(at("11:15")));
  assert.ok(!result.includes(at("11:30")));
  assert.ok(!result.includes(at("12:00")));
  assert.ok(result.includes(at("13:00")));
  assert.equal(result.at(-1), at("17:15"));
  assert.ok(!result.includes(at("17:30")));
  assert.equal(result.length, 28);
});

test("30 dk hizmette 30 slot üretir, son slot 17:30", () => {
  const result = slots({ durationMinutes: 30 });
  assert.equal(result.length, 30);
  assert.equal(result.at(-1), at("17:30"));
});

test("çakışanları eler, bitişik randevu çakışma sayılmaz", () => {
  const result = slots({ appointments: [appointment("09:00", "09:45"), appointment("10:30", "11:00")] });
  for (const hm of ["09:00", "09:15", "09:30", "10:00", "10:15", "10:30", "10:45"]) {
    assert.ok(!result.includes(at(hm)), `${hm} olmamalı`);
  }
  for (const hm of ["09:45", "11:00"]) {
    assert.ok(result.includes(at(hm)), `${hm} olmalı`);
  }
});

test("şu andan önceki slotları eler", () => {
  const result = slots({ now: new Date("2026-10-28T10:05:00+03:00") });
  assert.equal(result[0], at("10:15"));
});

test("hafta sonu, geçmiş gün ve 14 gün dışı boş döner", () => {
  assert.deepEqual(slots({ date: "2026-10-31" }), []);
  assert.deepEqual(slots({ date: "2026-10-27" }), []);
  assert.notDeepEqual(slots({ date: "2026-11-10" }), []);
  assert.deepEqual(slots({ date: "2026-11-11" }), []);
});

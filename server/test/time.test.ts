import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, dayOfWeek, isValidDate, localDateOf, nextWorkingDayAfter, parseHm, toLocalIso } from "../src/domain/time.ts";

test("isValidDate biçimi ve gerçek takvim gününü kontrol eder", () => {
  assert.equal(isValidDate("2026-10-28"), true);
  assert.equal(isValidDate("2026-02-30"), false);
  assert.equal(isValidDate("2026-10-8"), false);
  assert.equal(isValidDate("bugün"), false);
});

test("localDateOf İstanbul'daki takvim gününü verir", () => {
  assert.equal(localDateOf(new Date("2026-10-27T21:30:00Z")), "2026-10-28");
  assert.equal(localDateOf(new Date("2026-10-27T20:59:00Z")), "2026-10-27");
});

test("addDays ay sınırını geçer", () => {
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
  assert.equal(addDays("2026-10-28", 13), "2026-11-10");
});

test("dayOfWeek 1=Pazartesi … 7=Pazar", () => {
  assert.equal(dayOfWeek("2026-10-26"), 1);
  assert.equal(dayOfWeek("2026-11-01"), 7);
});

test("parseHm ve toLocalIso", () => {
  assert.equal(parseHm("09:30"), 570);
  assert.equal(toLocalIso("2026-10-28", 570), "2026-10-28T09:30:00+03:00");
});

test("nextWorkingDayAfter: hafta içi ertesi gün", () => {
  assert.equal(nextWorkingDayAfter("2026-10-28"), "2026-10-29"); // Çarşamba → Perşembe
});

test("nextWorkingDayAfter: Cuma, Cumartesi ve Pazar → Pazartesi", () => {
  assert.equal(nextWorkingDayAfter("2026-10-30"), "2026-11-02");
  assert.equal(nextWorkingDayAfter("2026-10-31"), "2026-11-02");
  assert.equal(nextWorkingDayAfter("2026-11-01"), "2026-11-02");
});

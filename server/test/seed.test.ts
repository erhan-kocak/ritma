import { test } from "node:test";
import assert from "node:assert/strict";
import { seedDatabase } from "../src/db/load-data.ts";
import { createSeedData } from "../src/store/seed.ts";
import { localDateOf } from "../src/domain/time.ts";
import { getAvailableSlots } from "../src/domain/slots.ts";
import { TEST_NOW } from "./fixtures.ts";
import { resetTestDb, testPool } from "./db.ts";

test("seedDatabase tekrar çalıştırılınca hiçbir şey eklemez", async () => {
  await resetTestDb({ providers: [], services: [], workingDays: [], appointments: [] });
  assert.deepEqual(await seedDatabase(testPool, "ritma_test", TEST_NOW), {
    providers: 1,
    services: 2,
    workingRanges: 10,
    appointments: 4,
  });
  assert.deepEqual(await seedDatabase(testPool, "ritma_test", TEST_NOW), {
    providers: 0,
    services: 0,
    workingRanges: 0,
    appointments: 0,
  });
});

test("createSeedData randevu id'leri uuid", () => {
  for (const a of createSeedData(TEST_NOW).appointments) assert.match(a.id, /^[0-9a-f-]{36}$/);
});

test("createSeedData bugün ve yarın için çakışmayan, çalışma saatleri içinde randevular içerir", () => {
  const seed = createSeedData(TEST_NOW);
  const days = seed.appointments.map((a) => localDateOf(new Date(a.start)));
  assert.ok(days.includes("2026-10-28"));
  assert.ok(days.includes("2026-10-29"));

  for (const appt of seed.appointments) {
    const service = seed.services.find((s) => s.id === appt.serviceId)!;
    const others = seed.appointments.filter((a) => a !== appt);
    // Randevunun kendi saati, diğer randevular varken ve "şu an" günün başındayken geçerli bir slot olmalı.
    const date = localDateOf(new Date(appt.start));
    const slots = getAvailableSlots({
      date,
      durationMinutes: service.durationMinutes,
      workingDays: seed.workingDays,
      appointments: others,
      now: new Date(`${date}T00:00:00+03:00`),
    });
    assert.ok(slots.includes(appt.start), appt.start);
  }
});

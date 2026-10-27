import { test } from "node:test";
import assert from "node:assert/strict";
import { createMemoryStore } from "../src/store/memory-store.ts";
import { createSeedData } from "../src/store/seed.ts";
import { localDateOf } from "../src/domain/time.ts";
import { getAvailableSlots } from "../src/domain/slots.ts";
import { TEST_NOW, testData } from "./fixtures.ts";

const newAppointment = (start: string, end: string) => ({
  providerId: "p1",
  serviceId: "s45",
  start,
  end,
  clientName: "Mehmet Kaya",
  clientEmail: "mehmet@ornek.com",
});

test("listAppointments güne göre süzer ve sıralar", () => {
  const store = createMemoryStore(testData());
  store.addAppointment(newAppointment("2026-10-28T14:00:00+03:00", "2026-10-28T14:45:00+03:00"), TEST_NOW);
  store.addAppointment(newAppointment("2026-10-28T09:00:00+03:00", "2026-10-28T09:45:00+03:00"), TEST_NOW);
  store.addAppointment(newAppointment("2026-10-29T10:00:00+03:00", "2026-10-29T10:45:00+03:00"), TEST_NOW);

  assert.deepEqual(
    store.listAppointments("p1", "2026-10-28").map((a) => a.start),
    ["2026-10-28T09:00:00+03:00", "2026-10-28T14:00:00+03:00"],
  );
  assert.equal(store.listAppointments("p1").length, 3);
});

test("addAppointment id ve createdAt atar", () => {
  const store = createMemoryStore(testData());
  const created = store.addAppointment(newAppointment("2026-10-28T09:00:00+03:00", "2026-10-28T09:45:00+03:00"), TEST_NOW);
  assert.ok(created.id);
  assert.equal(created.createdAt, TEST_NOW.toISOString());
});

test("verilen veri sonradan değiştirilse de depo etkilenmez", () => {
  const data = testData();
  const store = createMemoryStore(data);
  data.appointments.push({ ...newAppointment("2026-10-28T09:00:00+03:00", "2026-10-28T09:45:00+03:00"), id: "x", createdAt: "" });
  data.services.length = 0;
  assert.equal(store.listAppointments("p1").length, 0);
  assert.equal(store.listServices("p1").length, 2);
});

test("bulma yöntemleri", () => {
  const store = createMemoryStore(testData());
  assert.equal(store.getProviderBySlug("ayse-yilmaz")?.id, "p1");
  assert.equal(store.getProviderBySlug("yok"), undefined);
  assert.equal(store.getService("p1", "s30")?.durationMinutes, 30);
  assert.equal(store.listWorkingDays("p1").length, 5);
});

test("getService başka hizmet verenin hizmetini döndürmez", () => {
  const data = testData();
  data.providers.push({ id: "p2", slug: "can-ozturk", name: "Can Öztürk", title: "Koç" });
  const store = createMemoryStore(data);
  assert.equal(store.getService("p2", "s45"), undefined);
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

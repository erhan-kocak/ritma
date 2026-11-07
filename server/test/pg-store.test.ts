import { test } from "node:test";
import assert from "node:assert/strict";
import { SlotTakenError } from "../src/store/store.ts";
import { TEST_NOW, testData } from "./fixtures.ts";
import { createTestStore } from "./db.ts";

const newAppointment = (start: string, end: string) => ({
  providerId: "p1",
  serviceId: "s45",
  start,
  end,
  clientName: "Mehmet Kaya",
  clientEmail: "mehmet@ornek.com",
});

test("listAppointments güne göre süzer ve sıralar", async () => {
  const store = await createTestStore();
  await store.addAppointment(newAppointment("2026-10-28T14:00:00+03:00", "2026-10-28T14:45:00+03:00"), TEST_NOW);
  await store.addAppointment(newAppointment("2026-10-28T09:00:00+03:00", "2026-10-28T09:45:00+03:00"), TEST_NOW);
  await store.addAppointment(newAppointment("2026-10-29T10:00:00+03:00", "2026-10-29T10:45:00+03:00"), TEST_NOW);

  assert.deepEqual(
    (await store.listAppointments("p1", "2026-10-28")).map((a) => a.start),
    ["2026-10-28T09:00:00+03:00", "2026-10-28T14:00:00+03:00"],
  );
  assert.equal((await store.listAppointments("p1")).length, 3);
});

test("addAppointment id ve createdAt atar", async () => {
  const store = await createTestStore();
  const created = await store.addAppointment(
    newAppointment("2026-10-28T09:00:00+03:00", "2026-10-28T09:45:00+03:00"),
    TEST_NOW,
  );
  assert.match(created.id, /^[0-9a-f-]{36}$/);
  assert.equal(created.createdAt, TEST_NOW.toISOString());
  assert.deepEqual(await store.listAppointments("p1", "2026-10-28"), [created]);
});

test("bulma yöntemleri", async () => {
  const store = await createTestStore();
  assert.equal((await store.getProviderBySlug("ayse-yilmaz"))?.id, "p1");
  assert.equal(await store.getProviderBySlug("yok"), undefined);
  assert.equal((await store.getService("p1", "s30"))?.durationMinutes, 30);
  assert.equal(await store.getService("p1", "yok"), undefined);
  assert.equal((await store.listWorkingDays("p1")).length, 5);
});

test("getService başka hizmet verenin hizmetini döndürmez", async () => {
  const data = testData();
  data.providers.push({ id: "p2", slug: "can-ozturk", name: "Can Öztürk", title: "Koç" });
  const store = await createTestStore(data);
  assert.equal(await store.getService("p2", "s45"), undefined);
});

test("aynı slota eşzamanlı iki kayıttan biri SlotTakenError alır", async () => {
  const store = await createTestStore();
  const appt = newAppointment("2026-10-28T09:00:00+03:00", "2026-10-28T09:45:00+03:00");
  const results = await Promise.allSettled([store.addAppointment(appt, TEST_NOW), store.addAppointment(appt, TEST_NOW)]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
  assert.ok(rejected.reason instanceof SlotTakenError);
});

test("örtüşen ama aynı olmayan aralık da reddedilir", async () => {
  const store = await createTestStore();
  await store.addAppointment(newAppointment("2026-10-28T09:00:00+03:00", "2026-10-28T09:45:00+03:00"), TEST_NOW);
  await assert.rejects(
    store.addAppointment(newAppointment("2026-10-28T09:30:00+03:00", "2026-10-28T10:15:00+03:00"), TEST_NOW),
    SlotTakenError,
  );
});

test("bitişik randevular ikisi de kaydedilir", async () => {
  const store = await createTestStore();
  await store.addAppointment(newAppointment("2026-10-28T09:00:00+03:00", "2026-10-28T09:45:00+03:00"), TEST_NOW);
  await store.addAppointment(newAppointment("2026-10-28T09:45:00+03:00", "2026-10-28T10:30:00+03:00"), TEST_NOW);
  assert.equal((await store.listAppointments("p1", "2026-10-28")).length, 2);
});

test("saatler İstanbul biçiminde döner", async () => {
  const store = await createTestStore();
  await store.addAppointment(newAppointment("2026-10-28T06:00:00Z", "2026-10-28T06:45:00Z"), TEST_NOW);
  const [a] = await store.listAppointments("p1", "2026-10-28");
  assert.equal(a.start, "2026-10-28T09:00:00+03:00");
  assert.equal(a.end, "2026-10-28T09:45:00+03:00");
});

test("gün sınırı İstanbul gününe göre", async () => {
  const store = await createTestStore();
  await store.addAppointment(newAppointment("2026-10-28T23:30:00+03:00", "2026-10-29T00:15:00+03:00"), TEST_NOW);
  assert.equal((await store.listAppointments("p1", "2026-10-28")).length, 1);
  assert.equal((await store.listAppointments("p1", "2026-10-29")).length, 0);
});

test("çalışma aralıkları güne göre gruplanır", async () => {
  const store = await createTestStore();
  const days = await store.listWorkingDays("p1");
  assert.deepEqual(
    days.map((d) => d.day),
    [1, 2, 3, 4, 5],
  );
  assert.deepEqual(days[0], {
    providerId: "p1",
    day: 1,
    ranges: [
      { start: "09:00", end: "12:00" },
      { start: "13:00", end: "18:00" },
    ],
  });
});

test("hizmetler ada göre sıralı", async () => {
  const store = await createTestStore();
  assert.deepEqual(
    (await store.listServices("p1")).map((s) => s.id),
    ["s45", "s30"],
  );
});

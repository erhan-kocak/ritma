import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.ts";
import { createMemoryStore } from "../src/store/memory-store.ts";
import { startTestServer } from "./helpers.ts";
import { TEST_NOW, testData } from "./fixtures.ts";

const BASE = "/api/providers/ayse-yilmaz";
const at = (hm: string, date = "2026-10-28") => `${date}T${hm}:00+03:00`;

async function setup(t: TestContext) {
  const server = await startTestServer(createApp({ store: createMemoryStore(testData()), now: () => TEST_NOW }));
  t.after(() => server.close());

  const get = async (path: string) => {
    const res = await fetch(server.baseUrl + path);
    return { status: res.status, body: await res.json() };
  };
  const post = async (path: string, body: unknown) => {
    const res = await fetch(server.baseUrl + path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
    return { status: res.status, body: await res.json() };
  };
  const book = (start: string, extra: Record<string, unknown> = {}) =>
    post(`${BASE}/appointments`, {
      serviceId: "s45",
      start,
      clientName: "Mehmet Kaya",
      clientEmail: "mehmet@ornek.com",
      ...extra,
    });

  return { get, post, book };
}

test("hizmet veren ve hizmetleri döner", async (t) => {
  const { get } = await setup(t);
  const res = await get(BASE);
  assert.equal(res.status, 200);
  assert.equal(res.body.provider.name, "Ayşe Yılmaz");
  assert.equal(res.body.services.length, 2);
});

test("bilinmeyen slug 404 provider_not_found", async (t) => {
  const { get } = await setup(t);
  const res = await get("/api/providers/yok");
  assert.equal(res.status, 404);
  assert.deepEqual(res.body, { error: { code: "provider_not_found", message: "Hizmet veren bulunamadı." } });
});

test("slot listesi döner", async (t) => {
  const { get } = await setup(t);
  const res = await get(`${BASE}/slots?serviceId=s45&date=2026-10-28`);
  assert.equal(res.status, 200);
  assert.equal(res.body.date, "2026-10-28");
  assert.equal(res.body.slots.length, 28);
  assert.equal(res.body.slots[0], at("09:00"));
});

test("geçersiz ya da eksik tarih 400", async (t) => {
  const { get } = await setup(t);
  for (const path of [`${BASE}/slots?serviceId=s45&date=2026-02-30`, `${BASE}/slots?serviceId=s45`, `${BASE}/appointments?date=bugün`]) {
    const res = await get(path);
    assert.equal(res.status, 400, path);
    assert.deepEqual(res.body, { error: { code: "invalid_request", message: "Geçersiz tarih." } });
  }
});

test("bilinmeyen hizmet 404 service_not_found", async (t) => {
  const { get, book } = await setup(t);
  const slots = await get(`${BASE}/slots?serviceId=yok&date=2026-10-28`);
  assert.equal(slots.status, 404);
  assert.equal(slots.body.error.code, "service_not_found");
  const created = await book(at("09:30"), { serviceId: "yok" });
  assert.equal(created.status, 404);
  assert.equal(created.body.error.message, "Hizmet bulunamadı.");
});

test("randevu oluşturur ve slot listeden kalkar", async (t) => {
  const { get, book } = await setup(t);
  const created = await book(at("09:30"));
  assert.equal(created.status, 201);
  assert.equal(created.body.appointment.start, at("09:30"));
  assert.equal(created.body.appointment.end, at("10:15"));
  assert.equal(created.body.appointment.clientName, "Mehmet Kaya");

  const { body } = await get(`${BASE}/slots?serviceId=s45&date=2026-10-28`);
  assert.ok(!body.slots.includes(at("09:30")));
  assert.ok(!body.slots.includes(at("09:00")));
  assert.ok(body.slots.includes(at("10:15")));
});

test("aynı slota ikinci istek 409 slot_taken", async (t) => {
  const { book } = await setup(t);
  assert.equal((await book(at("09:30"))).status, 201);
  const second = await book(at("09:30"), { clientName: "Zeynep Demir" });
  assert.equal(second.status, 409);
  assert.deepEqual(second.body, { error: { code: "slot_taken", message: "Bu saat az önce doldu." } });
});

test("slot olmayan saat 400 invalid_slot", async (t) => {
  const { book } = await setup(t);
  for (const start of [at("09:10"), at("12:00"), at("10:00", "2026-10-31")]) {
    const res = await book(start);
    assert.equal(res.status, 400, start);
    assert.deepEqual(res.body, { error: { code: "invalid_slot", message: "Seçilen saat uygun değil." } });
  }
});

test("hatalı veri 400 ve Türkçe mesaj", async (t) => {
  const { book } = await setup(t);
  const res = await book(at("09:30"), { clientEmail: "mehmet@" });
  assert.equal(res.status, 400);
  assert.deepEqual(res.body, { error: { code: "invalid_request", message: "Geçerli bir e-posta adresi yazın." } });
});

test("bozuk JSON 400 İstek okunamadı", async (t) => {
  const { post } = await setup(t);
  const res = await post(`${BASE}/appointments`, '{"serviceId":');
  assert.equal(res.status, 400);
  assert.deepEqual(res.body, { error: { code: "invalid_request", message: "İstek okunamadı." } });
});

test("aynı an farklı biçimde kabul edilir", async (t) => {
  const { book } = await setup(t);
  const res = await book("2026-10-28T06:30:00Z");
  assert.equal(res.status, 201);
  assert.equal(res.body.appointment.start, at("09:30"));
});

test("takvim o günün randevularını sıralı döner", async (t) => {
  const { get, book } = await setup(t);
  await book(at("14:00"), { serviceId: "s30" });
  await book(at("09:30"));
  await book(at("10:00", "2026-10-29"));

  const res = await get(`${BASE}/appointments?date=2026-10-28`);
  assert.equal(res.status, 200);
  assert.equal(res.body.date, "2026-10-28");
  assert.deepEqual(
    res.body.appointments.map((a: { start: string }) => a.start),
    [at("09:30"), at("14:00")],
  );
  assert.equal(res.body.appointments[0].serviceName, "Beslenme danışmanlığı");
  assert.equal(res.body.appointments[1].durationMinutes, 30);
});

test("bilinmeyen /api yolu 404 not_found", async (t) => {
  const { get } = await setup(t);
  const res = await get("/api/yok");
  assert.equal(res.status, 404);
  assert.deepEqual(res.body, { error: { code: "not_found", message: "Bulunamadı." } });
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { validateAppointmentInput } from "../src/domain/validation.ts";

const valid = {
  serviceId: "s45",
  start: "2026-10-28T09:30:00+03:00",
  clientName: "  Mehmet Kaya ",
  clientEmail: " mehmet@ornek.com ",
};

function messageFor(body: unknown): string | undefined {
  const result = validateAppointmentInput(body);
  return result.ok ? undefined : result.message;
}

test("geçerli girdiyi kırpılmış olarak döner", () => {
  assert.deepEqual(validateAppointmentInput(valid), {
    ok: true,
    value: { serviceId: "s45", start: "2026-10-28T09:30:00+03:00", clientName: "Mehmet Kaya", clientEmail: "mehmet@ornek.com" },
  });
});

test("nesne olmayan gövde", () => {
  assert.equal(messageFor(null), "İstek okunamadı.");
  assert.equal(messageFor("metin"), "İstek okunamadı.");
});

test("hizmet yok", () => {
  assert.equal(messageFor({ ...valid, serviceId: undefined }), "Lütfen bir hizmet seçin.");
});

test("okunamayan saat", () => {
  assert.equal(messageFor({ ...valid, start: "yarın" }), "Lütfen bir saat seçin.");
});

test("boş ve çok uzun ad", () => {
  assert.equal(messageFor({ ...valid, clientName: "   " }), "Lütfen adınızı ve soyadınızı yazın.");
  assert.equal(messageFor({ ...valid, clientName: "a".repeat(101) }), "Ad soyad en fazla 100 karakter olabilir.");
  assert.equal(messageFor({ ...valid, clientName: "a".repeat(100) }), undefined);
});

test("boş ve hatalı e-posta", () => {
  assert.equal(messageFor({ ...valid, clientEmail: "" }), "Lütfen e-posta adresinizi yazın.");
  assert.equal(messageFor({ ...valid, clientEmail: "mehmet@" }), "Geçerli bir e-posta adresi yazın.");
});

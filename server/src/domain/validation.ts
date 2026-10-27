export type AppointmentInput = { serviceId: string; start: string; clientName: string; clientEmail: string };

export type ValidationResult = { ok: true; value: AppointmentInput } | { ok: false; message: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LENGTH = 100;

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export function validateAppointmentInput(body: unknown): ValidationResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, message: "İstek okunamadı." };
  }

  const fields = body as Record<string, unknown>;
  const value: AppointmentInput = {
    serviceId: text(fields.serviceId),
    start: text(fields.start),
    clientName: text(fields.clientName),
    clientEmail: text(fields.clientEmail),
  };

  const fail = (message: string): ValidationResult => ({ ok: false, message });

  if (!value.serviceId) return fail("Lütfen bir hizmet seçin.");
  if (!value.start || Number.isNaN(Date.parse(value.start))) return fail("Lütfen bir saat seçin.");
  if (!value.clientName) return fail("Lütfen adınızı ve soyadınızı yazın.");
  if (value.clientName.length > MAX_NAME_LENGTH) return fail("Ad soyad en fazla 100 karakter olabilir.");
  if (!value.clientEmail) return fail("Lütfen e-posta adresinizi yazın.");
  if (!EMAIL_PATTERN.test(value.clientEmail)) return fail("Geçerli bir e-posta adresi yazın.");

  return { ok: true, value };
}

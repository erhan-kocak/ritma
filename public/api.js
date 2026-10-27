// Randevu ve takvim sayfalarının ortak yardımcıları.
// Tüm tarih ve saatler, ziyaretçinin saat diliminden bağımsız olarak İstanbul saatiyle gösterilir.

const TIME_ZONE = "Europe/Istanbul";
const NETWORK_ERROR = "Sunucuya ulaşılamadı. Lütfen tekrar deneyin.";

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request(path, options) {
  let res;
  try {
    res = await fetch(path, options);
  } catch {
    throw new ApiError(0, "network_error", NETWORK_ERROR);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, body?.error?.code ?? "unknown", body?.error?.message ?? NETWORK_ERROR);
  }
  return body;
}

export const getJson = (path) => request(path);

export const postJson = (path, body) =>
  request(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

// "YYYY-MM-DD" biçimindeki bir günü, saat dilimi kaymasın diye İstanbul öğle saatine sabitler.
const middayOf = (date) => new Date(`${date}T12:00:00+03:00`);

const isoDate = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const timeFormat = new Intl.DateTimeFormat("tr-TR", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" });
const weekdayShort = new Intl.DateTimeFormat("tr-TR", { timeZone: TIME_ZONE, weekday: "short" });
const dayNumber = new Intl.DateTimeFormat("tr-TR", { timeZone: TIME_ZONE, day: "numeric" });
const dateLong = new Intl.DateTimeFormat("tr-TR", { timeZone: TIME_ZONE, day: "numeric", month: "long", year: "numeric", weekday: "long" });

export const todayInIstanbul = () => isoDate.format(new Date());

export const addDays = (date, days) => isoDate.format(new Date(middayOf(date).getTime() + days * 86_400_000));

export const isValidDate = (date) =>
  /^\d{4}-\d{2}-\d{2}$/.test(date ?? "") && !Number.isNaN(middayOf(date).getTime()) && addDays(date, 0) === date;

export const formatTime = (iso) => timeFormat.format(new Date(iso));

export const formatDayShort = (date) => ({
  weekday: weekdayShort.format(middayOf(date)),
  day: dayNumber.format(middayOf(date)),
});

// Hem "YYYY-MM-DD" hem tam zaman damgası alır. Örnek: "28 Ekim 2026 Çarşamba".
export const formatDateLong = (dateOrIso) =>
  dateLong.format(dateOrIso.length === 10 ? middayOf(dateOrIso) : new Date(dateOrIso));

export const providerSlugFromUrl = () => new URLSearchParams(location.search).get("p") || null;

export const providerPath = (slug) => `/api/providers/${encodeURIComponent(slug)}`;

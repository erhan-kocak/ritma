// /api-docs/ sayfasındaki Swagger UI'nin gösterdiği OpenAPI belgesi.
// Uç nokta eklenince ya da değişince burası da güncellenir; server/test/openapi.test.ts uyumu denetler.
import { localDateOf, nextWorkingDayAfter } from "./domain/time.ts";

export type BodyExample = {
  summary: string;
  description?: string;
  value: Record<string, unknown>;
  "x-expected-status": number;
  "x-expected-code"?: string;
};

export type Parameter = {
  name: string;
  in: "path" | "query";
  required: boolean;
  description: string;
  schema: unknown;
  example: string;
};

export type RequestBody = {
  required: true;
  content: { "application/json": { schema: unknown; examples: Record<string, BodyExample> } };
};

export type Operation = {
  tags: string[];
  summary: string;
  description?: string;
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, { description: string; content?: unknown }>;
};

export type OpenApiDocument = {
  openapi: "3.1.0";
  info: { title: string; version: string; description: string };
  tags: { name: string; description: string }[];
  paths: Record<string, Partial<Record<"get" | "post", Operation>>>;
  components: { schemas: Record<string, unknown> };
};

const TAG = "Randevu akışı";

const ERROR_CODES = [
  "invalid_request",
  "invalid_slot",
  "provider_not_found",
  "service_not_found",
  "slot_taken",
  "not_found",
  "internal_error",
];

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema: unknown) => ({ "application/json": { schema } });
const ok = (description: string, schema: unknown) => ({ description, content: json(schema) });
const error = (description: string) => ({ description, content: json(ref("ErrorResponse")) });

export function createOpenApiDocument(now: Date): OpenApiDocument {
  const exampleDate = nextWorkingDayAfter(localDateOf(now));

  const slug: Parameter = {
    name: "slug",
    in: "path",
    required: true,
    description: "Hizmet verenin adres adı.",
    schema: { type: "string" },
    example: "ayse-yilmaz",
  };
  const date: Parameter = {
    name: "date",
    in: "query",
    required: true,
    description: "Gün, YYYY-MM-DD biçiminde (İstanbul saati).",
    schema: { type: "string", format: "date" },
    example: exampleDate,
  };
  const serviceId: Parameter = {
    name: "serviceId",
    in: "query",
    required: true,
    description: "Hizmetin kimliği.",
    schema: { type: "string" },
    example: "nutrition-45",
  };

  // 11:00, örnek verideki randevularla hiçbir durumda çakışmaz (bkz. spec). Sıra önemli: 2. örnek 1.'ye bağlı.
  const at = (hm: string) => `${exampleDate}T${hm}:00+03:00`;
  const valid = {
    serviceId: "nutrition-45",
    start: at("11:00"),
    clientName: "Mehmet Kaya",
    clientEmail: "mehmet@ornek.com",
  };
  const examples: Record<string, BodyExample> = {
    gecerli: {
      summary: "1. Geçerli randevu (11:00, 45 dk) → 201",
      value: valid,
      "x-expected-status": 201,
    },
    tekrar: {
      summary: "2. Aynı isteği tekrar gönder → 409",
      description: "Önce 1. örneği gönderin; aynı saat dolu olduğu için 409 döner.",
      value: valid,
      "x-expected-status": 409,
      "x-expected-code": "slot_taken",
    },
    bozukEposta: {
      summary: "3. Bozuk e-posta → 400",
      value: { ...valid, clientEmail: "mehmet@" },
      "x-expected-status": 400,
      "x-expected-code": "invalid_request",
    },
    bosAd: {
      summary: "4. Boş ad → 400",
      value: { ...valid, clientName: "  " },
      "x-expected-status": 400,
      "x-expected-code": "invalid_request",
    },
    saatDilimiYok: {
      summary: "5. Saat dilimi yok → 400",
      value: { ...valid, start: `${exampleDate}T11:00:00` },
      "x-expected-status": 400,
      "x-expected-code": "invalid_request",
    },
    adimaUymayan: {
      summary: "6. 15 dakikalık adıma uymayan saat (11:07) → 400",
      value: { ...valid, start: at("11:07") },
      "x-expected-status": 400,
      "x-expected-code": "invalid_slot",
    },
    calismaSaatiDisi: {
      summary: "7. Çalışma saati dışı (19:00) → 400",
      value: { ...valid, start: at("19:00") },
      "x-expected-status": 400,
      "x-expected-code": "invalid_slot",
    },
    olmayanHizmet: {
      summary: "8. Olmayan hizmet → 404",
      value: { ...valid, serviceId: "olmayan-hizmet" },
      "x-expected-status": 404,
      "x-expected-code": "service_not_found",
    },
  };

  return {
    openapi: "3.1.0",
    info: {
      title: "Ritma API",
      version: "0.1.0",
      description: [
        "Ritma randevu akışının uç noktaları. Tüm saatler İstanbul saatine göredir (+03:00).",
        "",
        "Veriler bellekte tutulur. Randevu örneği bir kez gönderilince o saat dolar ve tekrar gönderilince 409 döner.",
        "Sunucu yeniden başlayınca veriler örnek haline döner.",
      ].join("\n"),
    },
    tags: [{ name: TAG, description: "Müşterinin randevu alması ve hizmet verenin takvimi." }],
    paths: {
      "/api/providers/{slug}": {
        get: {
          tags: [TAG],
          summary: "Hizmet veren ve hizmetleri",
          parameters: [slug],
          responses: {
            "200": ok("Hizmet veren ve hizmetleri.", {
              type: "object",
              properties: { provider: ref("Provider"), services: { type: "array", items: ref("Service") } },
            }),
            "404": error("Hizmet veren bulunamadı."),
          },
        },
      },
      "/api/providers/{slug}/slots": {
        get: {
          tags: [TAG],
          summary: "O günün boş başlangıç saatleri",
          description: "Seçilen hizmetin süresine göre, 15 dakikalık adımlarla. Geçmiş saatler ve 14 günden ileri tarihler boş liste döner.",
          parameters: [slug, serviceId, date],
          responses: {
            "200": ok("Boş başlangıç saatleri.", {
              type: "object",
              properties: {
                date: { type: "string", format: "date" },
                slots: { type: "array", items: { type: "string", format: "date-time" } },
              },
            }),
            "400": error("Geçersiz tarih."),
            "404": error("Hizmet veren ya da hizmet bulunamadı."),
          },
        },
      },
      "/api/providers/{slug}/appointments": {
        post: {
          tags: [TAG],
          summary: "Randevu oluşturur",
          description: "Randevu anında onaylanır. Aynı saate ikinci istek 409 alır.",
          parameters: [slug],
          requestBody: {
            required: true,
            content: { "application/json": { schema: ref("NewAppointment"), examples } },
          },
          responses: {
            "201": ok("Randevu oluşturuldu.", { type: "object", properties: { appointment: ref("Appointment") } }),
            "400": error("Eksik ya da hatalı bilgi, ya da uygun olmayan saat."),
            "404": error("Hizmet veren ya da hizmet bulunamadı."),
            "409": error("Bu saat dolu."),
          },
        },
        get: {
          tags: [TAG],
          summary: "Randevuları listeler",
          description: "Tarih ve başlangıç saatine göre sıralı. Tarih belirtilmezse tüm randevular döner.",
          parameters: [
            slug,
            {
              ...date,
              required: false,
              description: "Gün, YYYY-MM-DD biçiminde (İstanbul saati). Belirtilmezse tüm randevular döner.",
            },
          ],
          responses: {
            "200": ok("Randevular.", {
              type: "object",
              properties: {
                date: { type: ["string", "null"], format: "date" },
                appointments: { type: "array", items: ref("CalendarAppointment") },
              },
            }),
            "400": error("Geçersiz tarih."),
            "404": error("Hizmet veren bulunamadı."),
          },
        },
      },
    },
    components: {
      schemas: {
        Provider: {
          type: "object",
          properties: {
            id: { type: "string" },
            slug: { type: "string" },
            name: { type: "string" },
            title: { type: "string" },
          },
        },
        Service: {
          type: "object",
          properties: {
            id: { type: "string" },
            providerId: { type: "string" },
            name: { type: "string" },
            durationMinutes: { type: "integer" },
          },
        },
        NewAppointment: {
          type: "object",
          required: ["serviceId", "start", "clientName", "clientEmail"],
          properties: {
            serviceId: { type: "string" },
            start: { type: "string", format: "date-time", description: "Saat dilimiyle, ör. 2026-11-09T11:00:00+03:00." },
            clientName: { type: "string" },
            clientEmail: { type: "string", format: "email" },
          },
        },
        Appointment: {
          type: "object",
          properties: {
            id: { type: "string" },
            providerId: { type: "string" },
            serviceId: { type: "string" },
            start: { type: "string", format: "date-time" },
            end: { type: "string", format: "date-time" },
            clientName: { type: "string" },
            clientEmail: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        CalendarAppointment: {
          allOf: [
            ref("Appointment"),
            {
              type: "object",
              properties: { serviceName: { type: "string" }, durationMinutes: { type: "integer" } },
            },
          ],
        },
        ErrorResponse: {
          type: "object",
          properties: {
            error: {
              type: "object",
              properties: {
                code: { type: "string", enum: ERROR_CODES },
                message: { type: "string", description: "Türkçe, kullanıcıya gösterilebilir." },
              },
            },
          },
        },
      },
    },
  };
}

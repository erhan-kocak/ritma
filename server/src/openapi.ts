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
  summary: string;
  description?: string;
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, { description: string; content?: unknown }>;
};

export type OpenApiDocument = {
  openapi: "3.1.0";
  info: { title: string; version: string; description: string };
  paths: Record<string, Partial<Record<"get" | "post", Operation>>>;
  components: { schemas: Record<string, unknown> };
};

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

  const examples: Record<string, BodyExample> = {};

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
    paths: {
      "/api/providers/{slug}": {
        get: {
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
          summary: "O günün randevuları",
          description: "Başlangıç saatine göre sıralı.",
          parameters: [slug, date],
          responses: {
            "200": ok("Günün randevuları.", {
              type: "object",
              properties: {
                date: { type: "string", format: "date" },
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

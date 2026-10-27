import { Router, type Request } from "express";
import { ApiError } from "../errors.ts";
import { getAvailableSlots } from "../domain/slots.ts";
import { isValidDate, localDateOf, toLocalIso } from "../domain/time.ts";
import { validateAppointmentInput } from "../domain/validation.ts";
import type { Store } from "../store/store.ts";

export function providersRouter(store: Store, now: () => Date): Router {
  const router = Router();

  const findProvider = (req: Request<{ slug: string }>) => {
    const provider = store.getProviderBySlug(req.params.slug);
    if (!provider) throw new ApiError(404, "provider_not_found", "Hizmet veren bulunamadı.");
    return provider;
  };

  const findService = (providerId: string, serviceId: unknown) => {
    const service = typeof serviceId === "string" ? store.getService(providerId, serviceId) : undefined;
    if (!service) throw new ApiError(404, "service_not_found", "Hizmet bulunamadı.");
    return service;
  };

  const requireDate = (date: unknown) => {
    if (typeof date !== "string" || !isValidDate(date)) {
      throw new ApiError(400, "invalid_request", "Geçersiz tarih.");
    }
    return date;
  };

  const slotsFor = (providerId: string, date: string, durationMinutes: number, withAppointments: boolean) =>
    getAvailableSlots({
      date,
      durationMinutes,
      workingDays: store.listWorkingDays(providerId),
      appointments: withAppointments ? store.listAppointments(providerId, date) : [],
      now: now(),
    });

  router.get("/:slug", (req, res) => {
    const provider = findProvider(req);
    res.json({ provider, services: store.listServices(provider.id) });
  });

  router.get("/:slug/slots", (req, res) => {
    const provider = findProvider(req);
    const date = requireDate(req.query.date);
    const service = findService(provider.id, req.query.serviceId);
    res.json({ date, slots: slotsFor(provider.id, date, service.durationMinutes, true) });
  });

  router.post("/:slug/appointments", (req, res) => {
    const provider = findProvider(req);
    const result = validateAppointmentInput(req.body);
    if (!result.ok) throw new ApiError(400, "invalid_request", result.message);
    const input = result.value;
    const service = findService(provider.id, input.serviceId);

    // Gelen anı İstanbul biçimine çevirip slot listesiyle karşılaştırırız; "…Z" gibi biçimler de kabul edilir.
    const startMs = Date.parse(input.start);
    const date = localDateOf(new Date(startMs));
    const minutes = (startMs - Date.parse(toLocalIso(date, 0))) / 60_000;
    const start = Number.isInteger(minutes) ? toLocalIso(date, minutes) : "";

    if (!slotsFor(provider.id, date, service.durationMinutes, false).includes(start)) {
      throw new ApiError(400, "invalid_slot", "Seçilen saat uygun değil.");
    }
    // Kontrol ile kayıt arasında await yok: aynı slota gelen iki istekten yalnızca biri kaydedilir.
    if (!slotsFor(provider.id, date, service.durationMinutes, true).includes(start)) {
      throw new ApiError(409, "slot_taken", "Bu saat az önce doldu.");
    }

    const appointment = store.addAppointment(
      {
        providerId: provider.id,
        serviceId: service.id,
        start,
        end: toLocalIso(date, minutes + service.durationMinutes),
        clientName: input.clientName,
        clientEmail: input.clientEmail,
      },
      now(),
    );
    res.status(201).json({ appointment });
  });

  router.get("/:slug/appointments", (req, res) => {
    const provider = findProvider(req);
    const date = requireDate(req.query.date);
    const services = new Map(store.listServices(provider.id).map((s) => [s.id, s]));
    const appointments = store.listAppointments(provider.id, date).map((a) => ({
      ...a,
      serviceName: services.get(a.serviceId)?.name ?? "",
      durationMinutes: services.get(a.serviceId)?.durationMinutes ?? 0,
    }));
    res.json({ date, appointments });
  });

  return router;
}

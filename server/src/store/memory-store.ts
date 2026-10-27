import { randomUUID } from "node:crypto";
import { localDateOf } from "../domain/time.ts";
import type { Store, StoreData } from "./store.ts";

export function createMemoryStore(initial: StoreData): Store {
  const data: StoreData = structuredClone(initial);

  return {
    getProviderBySlug: (slug) => data.providers.find((p) => p.slug === slug),

    listServices: (providerId) => data.services.filter((s) => s.providerId === providerId),

    getService: (providerId, serviceId) =>
      data.services.find((s) => s.providerId === providerId && s.id === serviceId),

    listWorkingDays: (providerId) => data.workingDays.filter((w) => w.providerId === providerId),

    listAppointments: (providerId, date) =>
      data.appointments
        .filter((a) => a.providerId === providerId)
        .filter((a) => date === undefined || localDateOf(new Date(a.start)) === date)
        .sort((a, b) => Date.parse(a.start) - Date.parse(b.start)),

    addAppointment(input, now) {
      const appointment = { ...input, id: randomUUID(), createdAt: now.toISOString() };
      data.appointments.push(appointment);
      return { ...appointment };
    },
  };
}

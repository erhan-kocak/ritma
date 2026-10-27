import type { Appointment, Provider, Service, WorkingDay } from "../domain/types.ts";

export type NewAppointment = Omit<Appointment, "id" | "createdAt">;

export interface Store {
  getProviderBySlug(slug: string): Provider | undefined;
  listServices(providerId: string): Service[];
  getService(providerId: string, serviceId: string): Service | undefined;
  listWorkingDays(providerId: string): WorkingDay[];
  // Başlangıca göre sıralı; date verilirse yalnızca o İstanbul günü.
  listAppointments(providerId: string, date?: string): Appointment[];
  addAppointment(input: NewAppointment, now: Date): Appointment;
}

export type StoreData = {
  providers: Provider[];
  services: Service[];
  workingDays: WorkingDay[];
  appointments: Appointment[];
};

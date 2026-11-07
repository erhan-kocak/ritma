import type { Appointment, Provider, Service, WorkingDay } from "../domain/types.ts";

export type NewAppointment = Omit<Appointment, "id" | "createdAt">;

export interface Store {
  getProviderBySlug(slug: string): Promise<Provider | undefined>;
  // Ada göre sıralı.
  listServices(providerId: string): Promise<Service[]>;
  getService(providerId: string, serviceId: string): Promise<Service | undefined>;
  listWorkingDays(providerId: string): Promise<WorkingDay[]>;
  // Başlangıca göre sıralı; date verilirse yalnızca o İstanbul günü.
  listAppointments(providerId: string, date?: string): Promise<Appointment[]>;
  // Aynı hizmet verende zaman aralığı çakışan bir randevu varsa SlotTakenError fırlatır.
  addAppointment(input: NewAppointment, now: Date): Promise<Appointment>;
}

export class SlotTakenError extends Error {
  constructor() {
    super("Bu saat az önce doldu.");
    this.name = "SlotTakenError";
  }
}

export type StoreData = {
  providers: Provider[];
  services: Service[];
  workingDays: WorkingDay[];
  appointments: Appointment[];
};

export type Provider = { id: string; slug: string; name: string; title: string };

export type Service = { id: string; providerId: string; name: string; durationMinutes: number };

// "HH:MM", yerel saat.
export type TimeRange = { start: string; end: string };

// day: 1 = Pazartesi … 7 = Pazar.
export type WorkingDay = { providerId: string; day: number; ranges: TimeRange[] };

export type Appointment = {
  id: string;
  providerId: string;
  serviceId: string;
  start: string;
  end: string;
  clientName: string;
  clientEmail: string;
  createdAt: string;
};

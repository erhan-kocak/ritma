import type { Appointment } from "../domain/types.ts";
import { addDays, dayOfWeek, localDateOf, parseHm, toLocalIso } from "../domain/time.ts";
import type { StoreData } from "./store.ts";

const PROVIDER_ID = "ayse-yilmaz";

// Bugünden başlayarak ilk iki iş günü; hafta sonu açılırsa takvim yine boş görünmesin.
function nextWorkingDates(now: Date, count: number): string[] {
  const dates: string[] = [];
  for (let date = localDateOf(now); dates.length < count; date = addDays(date, 1)) {
    if (dayOfWeek(date) <= 5) dates.push(date);
  }
  return dates;
}

export function createSeedData(now: Date): StoreData {
  const [first, second] = nextWorkingDates(now, 2);
  const samples: [string, string, string, number, string, string][] = [
    [first, "10:00", "nutrition-45", 45, "Mehmet Kaya", "mehmet@ornek.com"],
    [first, "14:00", "follow-up-30", 30, "Zeynep Demir", "zeynep@ornek.com"],
    [first, "16:30", "follow-up-30", 30, "Can Öztürk", "can@ornek.com"],
    [second, "09:30", "nutrition-45", 45, "Elif Şahin", "elif@ornek.com"],
  ];

  const appointments: Appointment[] = samples.map(([date, hm, serviceId, duration, clientName, clientEmail], i) => ({
    id: `seed-${i + 1}`,
    providerId: PROVIDER_ID,
    serviceId,
    start: toLocalIso(date, parseHm(hm)),
    end: toLocalIso(date, parseHm(hm) + duration),
    clientName,
    clientEmail,
    createdAt: now.toISOString(),
  }));

  return {
    providers: [{ id: PROVIDER_ID, slug: "ayse-yilmaz", name: "Ayşe Yılmaz", title: "Diyetisyen" }],
    services: [
      { id: "nutrition-45", providerId: PROVIDER_ID, name: "Beslenme danışmanlığı", durationMinutes: 45 },
      { id: "follow-up-30", providerId: PROVIDER_ID, name: "Takip görüşmesi", durationMinutes: 30 },
    ],
    workingDays: [1, 2, 3, 4, 5].map((day) => ({
      providerId: PROVIDER_ID,
      day,
      ranges: [
        { start: "09:00", end: "12:00" },
        { start: "13:00", end: "18:00" },
      ],
    })),
    appointments,
  };
}

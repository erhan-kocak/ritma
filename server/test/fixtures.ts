import type { StoreData } from "../src/store/store.ts";

export const TEST_NOW = new Date("2026-10-28T08:00:00+03:00");

export function testData(): StoreData {
  return {
    providers: [{ id: "p1", slug: "ayse-yilmaz", name: "Ayşe Yılmaz", title: "Diyetisyen" }],
    services: [
      { id: "s45", providerId: "p1", name: "Beslenme danışmanlığı", durationMinutes: 45 },
      { id: "s30", providerId: "p1", name: "Takip görüşmesi", durationMinutes: 30 },
    ],
    workingDays: [1, 2, 3, 4, 5].map((day) => ({
      providerId: "p1",
      day,
      ranges: [
        { start: "09:00", end: "12:00" },
        { start: "13:00", end: "18:00" },
      ],
    })),
    appointments: [],
  };
}

import { randomUUID } from "node:crypto";
import type pg from "pg";
import { qualify, assertSchemaName, type SchemaName } from "../db/schema-name.ts";
import type { Appointment, Provider, Service, WorkingDay } from "../domain/types.ts";
import { addDays, toIstanbulIso, toLocalIso } from "../domain/time.ts";
import { SlotTakenError, type Store } from "./store.ts";

// PostgreSQL'in exclusion constraint ihlali.
const EXCLUSION_VIOLATION = "23P01";

type ServiceRow = { id: string; provider_id: string; name: string; duration_minutes: number };
type RangeRow = { day: number; start_time: string; end_time: string };
type AppointmentRow = {
  id: string;
  provider_id: string;
  service_id: string;
  starts_at: Date;
  ends_at: Date;
  client_name: string;
  client_email: string;
  created_at: Date;
};

const toService = (r: ServiceRow): Service => ({
  id: r.id,
  providerId: r.provider_id,
  name: r.name,
  durationMinutes: r.duration_minutes,
});

const toAppointment = (r: AppointmentRow): Appointment => ({
  id: r.id,
  providerId: r.provider_id,
  serviceId: r.service_id,
  start: toIstanbulIso(r.starts_at),
  end: toIstanbulIso(r.ends_at),
  clientName: r.client_name,
  clientEmail: r.client_email,
  createdAt: r.created_at.toISOString(),
});

// "09:00:00" → "09:00"
const toHm = (time: string) => time.slice(0, 5);

export function createPgStore({ pool, schema }: { pool: pg.Pool; schema: SchemaName }): Store {
  assertSchemaName(schema);
  const t = (name: string) => qualify(schema, name);

  return {
    async getProviderBySlug(slug) {
      const { rows } = await pool.query<Provider>(`select id, slug, name, title from ${t("providers")} where slug = $1`, [
        slug,
      ]);
      return rows[0];
    },

    async listServices(providerId) {
      const { rows } = await pool.query<ServiceRow>(
        `select * from ${t("services")} where provider_id = $1 order by name`,
        [providerId],
      );
      return rows.map(toService);
    },

    async getService(providerId, serviceId) {
      const { rows } = await pool.query<ServiceRow>(
        `select * from ${t("services")} where provider_id = $1 and id = $2`,
        [providerId, serviceId],
      );
      return rows[0] && toService(rows[0]);
    },

    async listWorkingDays(providerId) {
      const { rows } = await pool.query<RangeRow>(
        `select day, start_time, end_time from ${t("working_ranges")} where provider_id = $1 order by day, start_time`,
        [providerId],
      );
      const days: WorkingDay[] = [];
      for (const r of rows) {
        let day = days.at(-1);
        if (day?.day !== r.day) {
          day = { providerId, day: r.day, ranges: [] };
          days.push(day);
        }
        day.ranges.push({ start: toHm(r.start_time), end: toHm(r.end_time) });
      }
      return days;
    },

    async listAppointments(providerId, date) {
      const values: unknown[] = [providerId];
      let dayFilter = "";
      if (date !== undefined) {
        // İstanbul gününün başı ile ertesi günün başı arası.
        values.push(toLocalIso(date, 0), toLocalIso(addDays(date, 1), 0));
        dayFilter = "and starts_at >= $2 and starts_at < $3";
      }
      const { rows } = await pool.query<AppointmentRow>(
        `select * from ${t("appointments")} where provider_id = $1 ${dayFilter} order by starts_at`,
        values,
      );
      return rows.map(toAppointment);
    },

    async addAppointment(input, now) {
      try {
        const { rows } = await pool.query<AppointmentRow>(
          `insert into ${t("appointments")}
             (id, provider_id, service_id, starts_at, ends_at, client_name, client_email, created_at)
           values ($1, $2, $3, $4, $5, $6, $7, $8)
           returning *`,
          [randomUUID(), input.providerId, input.serviceId, input.start, input.end, input.clientName, input.clientEmail, now],
        );
        return toAppointment(rows[0]);
      } catch (err) {
        if ((err as { code?: string }).code === EXCLUSION_VIOLATION) throw new SlotTakenError();
        throw err;
      }
    },
  };
}

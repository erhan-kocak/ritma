import type pg from "pg";
import { createSeedData } from "../store/seed.ts";
import type { StoreData } from "../store/store.ts";
import { qualify, type SchemaName } from "./schema-name.ts";

export type InsertCounts = { providers: number; services: number; workingRanges: number; appointments: number };

// Veriyi tek işlemde ekler; var olan satırlara ve çakışan randevulara dokunmaz (on conflict do nothing).
// Döndürülen sayılar gerçekten eklenen satırlardır.
export async function insertStoreData(pool: pg.Pool, schema: SchemaName, data: StoreData): Promise<InsertCounts> {
  const t = (name: string) => qualify(schema, name);
  const counts: InsertCounts = { providers: 0, services: 0, workingRanges: 0, appointments: 0 };
  const client = await pool.connect();
  try {
    await client.query("begin");
    const insert = async (sql: string, values: unknown[]) => (await client.query(sql, values)).rowCount ?? 0;

    for (const p of data.providers) {
      counts.providers += await insert(
        `insert into ${t("providers")} (id, slug, name, title) values ($1, $2, $3, $4) on conflict do nothing`,
        [p.id, p.slug, p.name, p.title],
      );
    }
    for (const s of data.services) {
      counts.services += await insert(
        `insert into ${t("services")} (id, provider_id, name, duration_minutes) values ($1, $2, $3, $4) on conflict do nothing`,
        [s.id, s.providerId, s.name, s.durationMinutes],
      );
    }
    for (const w of data.workingDays) {
      for (const r of w.ranges) {
        counts.workingRanges += await insert(
          `insert into ${t("working_ranges")} (provider_id, day, start_time, end_time) values ($1, $2, $3, $4) on conflict do nothing`,
          [w.providerId, w.day, r.start, r.end],
        );
      }
    }
    for (const a of data.appointments) {
      counts.appointments += await insert(
        `insert into ${t("appointments")}
           (id, provider_id, service_id, starts_at, ends_at, client_name, client_email, created_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8) on conflict do nothing`,
        [a.id, a.providerId, a.serviceId, a.start, a.end, a.clientName, a.clientEmail, a.createdAt],
      );
    }

    await client.query("commit");
    return counts;
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

export function seedDatabase(pool: pg.Pool, schema: SchemaName, now: Date): Promise<InsertCounts> {
  return insertStoreData(pool, schema, createSeedData(now));
}

import type pg from "pg";
import { qualify, type SchemaName } from "./schema-name.ts";

// Sunucu açılırken tabloların kurulu olduğunu doğrular; yoksa her istek 500 dönerdi.
export async function checkTables(pool: pg.Pool, schema: SchemaName): Promise<void> {
  const { rows } = await pool.query<{ table: string | null }>("select to_regclass($1)::text as table", [
    qualify(schema, "providers"),
  ]);
  if (rows[0].table === null) throw new Error("Tablolar yok, npm run db:migrate çalıştırın.");
}

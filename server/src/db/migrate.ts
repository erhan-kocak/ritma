import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type pg from "pg";
import { assertSchemaName, qualify, type SchemaName } from "./schema-name.ts";

export const MIGRATIONS_DIR = path.join(import.meta.dirname, "../../../db/migrations");

// Uygulanmamış göçleri ada göre sırayla, her birini ayrı işlemde çalıştırır; uygulananların adlarını döndürür.
// Kilit işlem içinde alınır (pg_advisory_xact_lock) ve commit/rollback ile kendiliğinden bırakılır.
// Oturum kilidi Neon'un pooled (PgBouncer transaction mode) adresinde başka bir bağlantıda kalabilirdi.
export async function migrate(pool: pg.Pool, schema: SchemaName): Promise<string[]> {
  assertSchemaName(schema);
  const migrations = qualify(schema, "schema_migrations");
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();

  const client = await pool.connect();
  try {
    const applied: string[] = [];
    for (const file of files) {
      try {
        await client.query("begin");
        await client.query("select pg_advisory_xact_lock(hashtext($1))", [`ritma_migrate:${schema}`]);
        await client.query(`create schema if not exists "${schema}"`);
        await client.query(
          `create table if not exists ${migrations} (
             name text primary key,
             applied_at timestamptz not null default now()
           )`,
        );
        // Kilit alındıktan sonra bakılır; eşzamanlı başka bir migrate bu dosyayı az önce uygulamış olabilir.
        const done = await client.query(`select 1 from ${migrations} where name = $1`, [file]);
        if (done.rowCount) {
          await client.query("commit");
          continue;
        }

        await client.query(`set local search_path to "${schema}", public`);
        await client.query(await readFile(path.join(MIGRATIONS_DIR, file), "utf8"));
        await client.query(`insert into ${migrations} (name) values ($1)`, [file]);
        await client.query("commit");
        applied.push(file);
      } catch (err) {
        await client.query("rollback").catch(() => {});
        throw new Error(`Göç başarısız: ${file}: ${(err as Error).message}`);
      }
    }
    return applied;
  } finally {
    client.release();
  }
}

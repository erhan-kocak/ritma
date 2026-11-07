import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type pg from "pg";
import { assertSchemaName, qualify, type SchemaName } from "./schema-name.ts";

export const MIGRATIONS_DIR = path.join(import.meta.dirname, "../../../db/migrations");

// Uygulanmamış göçleri ada göre sırayla, her birini ayrı işlemde çalıştırır; uygulananların adlarını döndürür.
export async function migrate(pool: pg.Pool, schema: SchemaName): Promise<string[]> {
  assertSchemaName(schema);
  const client = await pool.connect();
  const lockKey = `ritma_migrate:${schema}`;
  try {
    await client.query("select pg_advisory_lock(hashtext($1))", [lockKey]);
    try {
      await client.query(`create schema if not exists "${schema}"`);
      await client.query(
        `create table if not exists ${qualify(schema, "schema_migrations")} (
           name text primary key,
           applied_at timestamptz not null default now()
         )`,
      );

      const { rows } = await client.query<{ name: string }>(`select name from ${qualify(schema, "schema_migrations")}`);
      const done = new Set(rows.map((r) => r.name));
      const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();

      const applied: string[] = [];
      for (const file of files.filter((f) => !done.has(f))) {
        const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
        try {
          await client.query("begin");
          await client.query(`set local search_path to "${schema}", public`);
          await client.query(sql);
          await client.query(`insert into ${qualify(schema, "schema_migrations")} (name) values ($1)`, [file]);
          await client.query("commit");
        } catch (err) {
          await client.query("rollback");
          throw new Error(`Göç başarısız: ${file}: ${(err as Error).message}`);
        }
        applied.push(file);
      }
      return applied;
    } finally {
      await client.query("select pg_advisory_unlock(hashtext($1))", [lockKey]);
    }
  } finally {
    client.release();
  }
}

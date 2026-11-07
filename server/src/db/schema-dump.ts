import path from "node:path";
import type pg from "pg";
import { assertSchemaName, type SchemaName } from "./schema-name.ts";

export const SCHEMA_FILE = path.join(import.meta.dirname, "../../../db/schema.sql");

const HEADER = "-- Bu dosya otomatik üretilir, elle düzenlemeyin; npm run db:migrate çalıştırın.";

// Şemanın tablolarını PostgreSQL kataloğundan okuyup sabit sırayla SQL olarak yazar.
// search_path şemaya ayarlandığı için çıktıda şema adı geçmez; "ritma" ve "ritma_test" aynı metni üretir.
export async function dumpSchema(pool: pg.Pool, schema: SchemaName): Promise<string> {
  assertSchemaName(schema);
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(`set local search_path to "${schema}", public`);

    const tables = await client.query<{ oid: number; name: string }>(
      `select c.oid, c.relname as name
         from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = $1 and c.relkind = 'r' and c.relname <> 'schema_migrations'
        order by c.relname`,
      [schema],
    );

    const blocks: string[] = [];
    for (const table of tables.rows) {
      const columns = await client.query<{ name: string; type: string; notnull: boolean; def: string | null }>(
        `select a.attname as name, format_type(a.atttypid, a.atttypmod) as type,
                a.attnotnull as notnull, pg_get_expr(d.adbin, d.adrelid) as def
           from pg_attribute a
           left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
          where a.attrelid = $1 and a.attnum > 0 and not a.attisdropped
          order by a.attnum`,
        [table.oid],
      );
      // contype 'n': PostgreSQL 18'de not null da kısıt olarak tutulur; sütun satırında zaten yazılıyor.
      const constraints = await client.query<{ name: string; def: string }>(
        `select conname as name, pg_get_constraintdef(oid) as def
           from pg_constraint
          where conrelid = $1 and contype <> 'n'
          order by conname`,
        [table.oid],
      );
      const indexes = await client.query<{ def: string }>(
        `select pg_get_indexdef(i.indexrelid) as def
           from pg_index i join pg_class ic on ic.oid = i.indexrelid
          where i.indrelid = $1
            and not exists (select 1 from pg_constraint c where c.conindid = i.indexrelid)
          order by ic.relname`,
        [table.oid],
      );

      const lines = [
        ...columns.rows.map(
          (c) => `  ${c.name} ${c.type}${c.notnull ? " not null" : ""}${c.def === null ? "" : ` default ${c.def}`}`,
        ),
        ...constraints.rows.map((c) => `  constraint ${c.name} ${c.def}`),
      ];
      blocks.push(
        [`create table ${table.name} (\n${lines.join(",\n")}\n);`, ...indexes.rows.map((i) => `${i.def};`)].join("\n"),
      );
    }

    return `${HEADER}\n\n${blocks.join("\n\n")}\n`;
  } finally {
    await client.query("rollback");
    client.release();
  }
}

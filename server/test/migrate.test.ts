import { before, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { migrate } from "../src/db/migrate.ts";
import { dumpSchema, SCHEMA_FILE } from "../src/db/schema-dump.ts";
import type { SchemaName } from "../src/db/schema-name.ts";
import { migrateTestDb, testPool } from "./db.ts";

before(async () => {
  await testPool.query('drop schema if exists "ritma_test" cascade');
});

test("migrate tabloları kurar, ikinci çalıştırma hiçbir şey uygulamaz", async () => {
  assert.deepEqual(await migrate(testPool, "ritma_test"), ["001-initial.sql"]);
  assert.deepEqual(await migrate(testPool, "ritma_test"), []);
  const { rows } = await testPool.query(
    "select table_name from information_schema.tables where table_schema = 'ritma_test' order by table_name",
  );
  assert.deepEqual(
    rows.map((r) => r.table_name),
    ["appointments", "providers", "schema_migrations", "services", "working_ranges"],
  );
});

test("btree_gist public şemasında", async () => {
  const { rows } = await testPool.query(
    "select n.nspname from pg_extension e join pg_namespace n on n.oid = e.extnamespace where e.extname = 'btree_gist'",
  );
  assert.equal(rows[0].nspname, "public");
});

test("migrate geçersiz şema adını reddeder", async () => {
  await assert.rejects(migrate(testPool, "public" as SchemaName), { message: "Geçersiz şema adı: public" });
});

const normalize = (s: string) => s.replace(/\r\n/g, "\n");

test("db/schema.sql göçlerden çıkan şemayla aynı", async () => {
  await migrateTestDb();
  const dumped = await dumpSchema(testPool, "ritma_test");
  assert.equal(normalize(readFileSync(SCHEMA_FILE, "utf8")), dumped, "db/schema.sql güncel değil: npm run db:migrate çalıştırın.");
});

test("dumpSchema şema adını yazmaz ve schema_migrations'ı içermez", async () => {
  await migrateTestDb();
  const dumped = await dumpSchema(testPool, "ritma_test");
  assert.doesNotMatch(dumped, /ritma_test|schema_migrations/);
  assert.match(dumped, /^-- Bu dosya otomatik üretilir, elle düzenlemeyin; npm run db:migrate çalıştırın\.\n/);
  assert.match(dumped, /EXCLUDE USING gist \(provider_id WITH =, tstzrange\(starts_at, ends_at, '\[\)'::text\) WITH &&\)/);
});

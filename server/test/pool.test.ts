import { test } from "node:test";
import assert from "node:assert/strict";
import { createPool } from "../src/db/pool.ts";
import { assertSchemaName, qualify } from "../src/db/schema-name.ts";

test("createPool DATABASE_URL yoksa Türkçe hata verir", () => {
  assert.throws(() => createPool({}), { message: "DATABASE_URL tanımlı değil, .env.example'a bakın." });
});

test("havuz bağlantı hatasında süreci çökertmez", () => {
  const pool = createPool({ DATABASE_URL: "postgresql://x:y@127.0.0.1:1/z" });
  assert.ok(pool.listenerCount("error") >= 1);
  return pool.end();
});

test("assertSchemaName yalnızca ritma ve ritma_test kabul eder", () => {
  assert.doesNotThrow(() => assertSchemaName("ritma"));
  assert.doesNotThrow(() => assertSchemaName("ritma_test"));
  assert.throws(() => assertSchemaName("public"), { message: "Geçersiz şema adı: public" });
  assert.equal(qualify("ritma", "appointments"), '"ritma"."appointments"');
});

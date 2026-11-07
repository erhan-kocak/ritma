import { after } from "node:test";
import { insertStoreData } from "../src/db/load-data.ts";
import { createPool } from "../src/db/pool.ts";
import { migrate } from "../src/db/migrate.ts";
import { assertSchemaName, qualify } from "../src/db/schema-name.ts";
import type { StoreData } from "../src/store/store.ts";

const TEST_SCHEMA: string = "ritma_test";

// Testler gerçek veritabanında yalnızca "ritma_test" şemasını kullanır.
export const testPool = createPool();
after(() => testPool.end());

let migrated: Promise<void> | undefined;

// Göçleri test dosyası başına bir kez uygular.
export function migrateTestDb(): Promise<void> {
  migrated ??= migrate(testPool, TEST_SCHEMA as "ritma_test").then(() => undefined);
  return migrated;
}

// Tabloları boşaltıp verilen veriyi ekler. Yalnızca test şemasında çalışır.
export async function resetTestDb(data: StoreData): Promise<void> {
  assertSchemaName(TEST_SCHEMA);
  if (TEST_SCHEMA !== "ritma_test") throw new Error("Tablo boşaltma yalnızca ritma_test şemasında yapılabilir.");
  await migrateTestDb();
  const tables = ["appointments", "working_ranges", "services", "providers"].map((t) => qualify(TEST_SCHEMA, t));
  await testPool.query(`truncate ${tables.join(", ")} cascade`);
  await insertStoreData(testPool, TEST_SCHEMA, data);
}

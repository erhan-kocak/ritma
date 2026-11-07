import { after } from "node:test";
import { createPool } from "../src/db/pool.ts";
import { migrate } from "../src/db/migrate.ts";

// Testler gerçek veritabanında yalnızca "ritma_test" şemasını kullanır.
export const testPool = createPool();
after(() => testPool.end());

let migrated: Promise<void> | undefined;

// Göçleri test dosyası başına bir kez uygular.
export function migrateTestDb(): Promise<void> {
  migrated ??= migrate(testPool, "ritma_test").then(() => undefined);
  return migrated;
}

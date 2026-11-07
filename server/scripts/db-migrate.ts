// npm run db:migrate: "ritma" şemasına bekleyen göçleri uygular ve db/schema.sql'i yeniden üretir.
import { writeFile } from "node:fs/promises";
import { migrate } from "../src/db/migrate.ts";
import { createPool } from "../src/db/pool.ts";
import { dumpSchema, SCHEMA_FILE } from "../src/db/schema-dump.ts";

try {
  const pool = createPool();
  try {
    const applied = await migrate(pool, "ritma");
    if (applied.length === 0) console.log("Şema güncel.");
    for (const name of applied) console.log(`Uygulandı: ${name}`);

    await writeFile(SCHEMA_FILE, await dumpSchema(pool, "ritma"), "utf8");
    console.log("db/schema.sql güncellendi.");
  } finally {
    await pool.end();
  }
} catch (err) {
  console.error((err as Error).message);
  process.exitCode = 1;
}

// npm run db:seed: "ritma" şemasına örnek veriyi ekler; tekrar çalıştırılabilir.
import { seedDatabase } from "../src/db/load-data.ts";
import { createPool } from "../src/db/pool.ts";

try {
  const pool = createPool();
  try {
    const c = await seedDatabase(pool, "ritma", new Date());
    console.log(
      `Eklendi: ${c.providers} hizmet veren, ${c.services} hizmet, ${c.workingRanges} çalışma aralığı, ${c.appointments} randevu.`,
    );
  } finally {
    await pool.end();
  }
} catch (err) {
  console.error((err as Error).message);
  process.exitCode = 1;
}

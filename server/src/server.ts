import { createApp } from "./app.ts";
import { checkTables } from "./db/check-tables.ts";
import { createPool } from "./db/pool.ts";
import { createPgStore } from "./store/pg-store.ts";

const port = Number(process.env.PORT ?? 3000);

async function main() {
  const pool = createPool();
  try {
    await checkTables(pool, "ritma");
  } catch (err) {
    await pool.end();
    throw err;
  }

  const store = createPgStore({ pool, schema: "ritma" });
  const server = createApp({ store, now: () => new Date() }).listen(port, () => {
    console.log(`Ritma: http://localhost:${port}`);
  });

  const shutdown = () => {
    server.close(() => {
      pool.end().finally(() => process.exit(0));
    });
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});

import { createApp } from "./app.ts";
import { createPool } from "./db/pool.ts";
import { createPgStore } from "./store/pg-store.ts";

const port = Number(process.env.PORT ?? 3000);
const store = createPgStore({ pool: createPool(), schema: "ritma" });

createApp({ store, now: () => new Date() }).listen(port, () => {
  console.log(`Ritma: http://localhost:${port}`);
});

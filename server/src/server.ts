import { createApp } from "./app.ts";
import { createMemoryStore } from "./store/memory-store.ts";
import { createSeedData } from "./store/seed.ts";

const port = Number(process.env.PORT ?? 3000);
const store = createMemoryStore(createSeedData(new Date()));

createApp({ store, now: () => new Date() }).listen(port, () => {
  console.log(`Ritma: http://localhost:${port}`);
});

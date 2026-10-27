import path from "node:path";
import express from "express";
import { ApiError, errorHandler } from "./errors.ts";
import { providersRouter } from "./routes/providers.ts";
import type { Store } from "./store/store.ts";

export type AppDeps = { store: Store; now: () => Date };

const publicDir = path.join(import.meta.dirname, "../../public");

export function createApp({ store, now }: AppDeps): express.Express {
  const app = express();
  app.use(express.json());
  app.use("/api/providers", providersRouter(store, now));
  app.use("/api", () => {
    throw new ApiError(404, "not_found", "Bulunamadı.");
  });
  app.use(express.static(publicDir));
  app.use(errorHandler);
  return app;
}

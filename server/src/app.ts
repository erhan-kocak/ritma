import path from "node:path";
import express from "express";

export type AppDeps = Record<string, never>;

const publicDir = path.join(import.meta.dirname, "../../public");

export function createApp(_deps: AppDeps): express.Express {
  const app = express();
  app.use(express.static(publicDir));
  return app;
}

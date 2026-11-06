import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.ts";
import { createOpenApiDocument } from "../src/openapi.ts";
import { providersRouter } from "../src/routes/providers.ts";
import { createMemoryStore } from "../src/store/memory-store.ts";
import { startTestServer } from "./helpers.ts";
import { TEST_NOW, testData } from "./fixtures.ts";

async function setup(t: TestContext) {
  const server = await startTestServer(createApp({ store: createMemoryStore(testData()), now: () => TEST_NOW }));
  t.after(() => server.close());
  return server;
}

type RouteLayer = { route: { path: string; methods: Record<string, boolean> } };

test("GET /api/openapi.json OpenAPI 3.1 belgesini döner", async (t) => {
  const { baseUrl } = await setup(t);

  const res = await fetch(`${baseUrl}/api/openapi.json`);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type") ?? "", /application\/json/);
  assert.equal(body.openapi, "3.1.0");
  assert.equal(body.info.title, "Ritma API");
});

test("/api yakalayıcısı belgeden sonra da çalışır", async (t) => {
  const { baseUrl } = await setup(t);

  const res = await fetch(`${baseUrl}/api/olmayan`);
  const body = await res.json();

  assert.equal(res.status, 404);
  assert.equal(body.error.code, "not_found");
});

test("belgedeki yollar router'daki rotalarla birebir aynı", () => {
  const layers = providersRouter(createMemoryStore(testData()), () => TEST_NOW).stack as unknown as RouteLayer[];
  const fromRouter = layers.flatMap((layer) =>
    Object.keys(layer.route.methods).map(
      (method) => `${method.toUpperCase()} /api/providers${layer.route.path.replace(/:(\w+)/g, "{$1}")}`,
    ),
  );
  const fromDoc = Object.entries(createOpenApiDocument(TEST_NOW).paths).flatMap(([path, operations]) =>
    Object.keys(operations).map((method) => `${method.toUpperCase()} ${path}`),
  );

  assert.deepEqual(fromDoc.sort(), fromRouter.sort());
});

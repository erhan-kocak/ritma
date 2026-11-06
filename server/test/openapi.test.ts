import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.ts";
import { createOpenApiDocument, type OpenApiDocument } from "../src/openapi.ts";
import { providersRouter } from "../src/routes/providers.ts";
import { createMemoryStore } from "../src/store/memory-store.ts";
import { createSeedData } from "../src/store/seed.ts";
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

const EXAMPLE_NOWS = [
  new Date("2026-10-28T08:00:00+03:00"), // Çarşamba sabah
  new Date("2026-10-30T20:00:00+03:00"), // Cuma akşam
  new Date("2026-10-31T12:00:00+03:00"), // Cumartesi
];

async function startSeeded(t: TestContext, now: Date) {
  const server = await startTestServer(createApp({ store: createMemoryStore(createSeedData(now)), now: () => now }));
  t.after(() => server.close());
  const doc: OpenApiDocument = await (await fetch(`${server.baseUrl}/api/openapi.json`)).json();
  return { baseUrl: server.baseUrl, doc };
}

for (const now of EXAMPLE_NOWS) {
  test(`POST örnekleri belgelenen kodları döner (şu an: ${now.toISOString()})`, async (t) => {
    const { baseUrl, doc } = await startSeeded(t, now);
    const post = doc.paths["/api/providers/{slug}/appointments"].post!;
    const examples = Object.values(post.requestBody!.content["application/json"].examples);

    assert.deepEqual(
      examples.map((ex) => ex["x-expected-status"]),
      [201, 409, 400, 400, 400, 400, 400, 404],
    );
    assert.deepEqual(
      examples.map((ex) => ex["x-expected-code"]),
      [undefined, "slot_taken", "invalid_request", "invalid_request", "invalid_request", "invalid_slot", "invalid_slot", "service_not_found"],
    );

    for (const ex of examples) {
      assert.ok(String(ex["x-expected-status"]) in post.responses, `${ex.summary}: yanıt belgelenmemiş`);
      const res = await fetch(`${baseUrl}/api/providers/ayse-yilmaz/appointments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(ex.value),
      });
      const body = await res.json();
      assert.equal(res.status, ex["x-expected-status"], ex.summary);
      if (ex["x-expected-code"]) assert.equal(body.error.code, ex["x-expected-code"], ex.summary);
    }
  });

  test(`GET işlemleri örnek parametrelerle 200 döner (şu an: ${now.toISOString()})`, async (t) => {
    const { baseUrl, doc } = await startSeeded(t, now);

    for (const [path, operations] of Object.entries(doc.paths)) {
      const get = operations.get;
      if (!get) continue;
      let url = path;
      const query = new URLSearchParams();
      for (const p of get.parameters ?? []) {
        if (p.in === "path") url = url.replace(`{${p.name}}`, p.example);
        else query.set(p.name, p.example);
      }
      const res = await fetch(`${baseUrl}${url}${query.size ? `?${query}` : ""}`);
      const body = await res.json();
      assert.equal(res.status, 200, path);
      if (path.endsWith("/slots")) assert.ok(body.slots.length > 0, "boş saat listesi boş");
    }
  });
}

test("GET /api-docs/ Swagger sayfasını döner", async (t) => {
  const { baseUrl } = await setup(t);

  const res = await fetch(`${baseUrl}/api-docs/`);
  const html = await res.text();

  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type") ?? "", /text\/html/);
  assert.match(html, /swagger-ui-dist@5\.17\.14/);
  assert.match(html, /integrity="sha384-/);
  assert.match(html, /\/api\/openapi\.json/);
});

test("GET /api-docs eğik çizgisiz sayfaya ulaşır", async (t) => {
  const { baseUrl } = await setup(t);

  const res = await fetch(`${baseUrl}/api-docs`);

  assert.equal(res.status, 200);
  assert.ok(res.url.endsWith("/api-docs/"), res.url);
});

test("her işlem Türkçe bir etiket altında (Swagger'da 'default' başlığı çıkmaz)", () => {
  const doc = createOpenApiDocument(TEST_NOW);

  assert.deepEqual(doc.tags.map((tag) => tag.name), ["Randevu akışı"]);
  for (const [path, operations] of Object.entries(doc.paths)) {
    for (const [method, operation] of Object.entries(operations)) {
      assert.deepEqual(operation.tags, ["Randevu akışı"], `${method} ${path}`);
    }
  }
});

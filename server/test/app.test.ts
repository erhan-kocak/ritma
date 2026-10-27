import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.ts";
import { createMemoryStore } from "../src/store/memory-store.ts";
import { startTestServer } from "./helpers.ts";
import { TEST_NOW, testData } from "./fixtures.ts";

test("GET / landing sayfasını döner", async (t) => {
  const server = await startTestServer(createApp({ store: createMemoryStore(testData()), now: () => TEST_NOW }));
  t.after(() => server.close());

  const res = await fetch(`${server.baseUrl}/`);

  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type") ?? "", /text\/html/);
  assert.match(await res.text(), /Randevular sizde/);
});

test("public dışındaki dosyalar sunulmaz", async (t) => {
  const server = await startTestServer(createApp({ store: createMemoryStore(testData()), now: () => TEST_NOW }));
  t.after(() => server.close());

  for (const path of ["/package.json", "/server/src/app.ts", "/CLAUDE.md"]) {
    const res = await fetch(`${server.baseUrl}${path}`);
    assert.equal(res.status, 404, path);
  }
});

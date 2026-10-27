import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { Express } from "express";

export type TestServer = { baseUrl: string; close(): Promise<void> };

export function startTestServer(app: Express): Promise<TestServer> {
  return new Promise((resolve) => {
    const server: Server = app.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise((done) => server.close(() => done())),
      });
    });
  });
}

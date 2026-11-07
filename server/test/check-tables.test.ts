import { test } from "node:test";
import { checkTables } from "../src/db/check-tables.ts";
import { migrateTestDb, testPool } from "./db.ts";

test("checkTables kurulu şemada sessiz geçer", async () => {
  await migrateTestDb();
  await checkTables(testPool, "ritma_test");
});

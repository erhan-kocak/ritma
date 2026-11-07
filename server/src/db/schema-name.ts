// Uygulama "ritma", testler "ritma_test" şemasını kullanır. Şema adı SQL'e yalnızca bu kontrolden sonra yazılır.
export type SchemaName = "ritma" | "ritma_test";

const SCHEMA_NAMES: readonly string[] = ["ritma", "ritma_test"];

export function assertSchemaName(name: string): asserts name is SchemaName {
  if (!SCHEMA_NAMES.includes(name)) throw new Error(`Geçersiz şema adı: ${name}`);
}

// '"ritma"."appointments"'
export function qualify(schema: SchemaName, table: string): string {
  assertSchemaName(schema);
  return `"${schema}"."${table}"`;
}

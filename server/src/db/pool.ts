import pg from "pg";

export function createPool(env: NodeJS.ProcessEnv = process.env): pg.Pool {
  const connectionString = env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL tanımlı değil, .env.example'a bakın.");

  const pool = new pg.Pool({ connectionString });
  // Neon boşta duran bağlantıları kapatabilir; dinlenmeyen "error" olayı süreci çökertir.
  pool.on("error", (err) => console.error("Veritabanı bağlantı hatası:", err.message));
  return pool;
}

// Apply database migrations (drizzle/*.sql). Runs before every production build,
// so a new deployment creates or updates its tables without manual steps.
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

try {
  process.loadEnvFile(".env");
} catch {
  // No .env file: rely on the real environment.
}

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL is not set, so database migrations were skipped.");
  process.exit(0);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
try {
  await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
  console.log("Database is up to date.");
} finally {
  await pool.end();
}

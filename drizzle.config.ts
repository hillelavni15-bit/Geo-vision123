import { defineConfig } from "drizzle-kit";

try {
  process.loadEnvFile(".env");
} catch {
  // No .env file: rely on the real environment.
}

if (!process.env.DATABASE_URL) {
  throw new Error("Set DATABASE_URL (see .env.example) before running database commands.");
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL },
});

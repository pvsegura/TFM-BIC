import { defineConfig } from "drizzle-kit";

/**
 * Memory trainer migration set (Verbysia): memory_cards and memory_reviews (SM-2 state and log).
 * Both tables reference `users`, so Identity's migrations run
 * first (MIGRATION_SETS order). Tracked in its own table like every other context.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/memory/db/schema.ts",
  out: "./src/memory/db/migrations",
  migrations: { table: "__drizzle_migrations_memory" },
  dbCredentials: {
    url: process.env["DATABASE_URL"] ?? "",
  },
});

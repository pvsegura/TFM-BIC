import { defineConfig } from "drizzle-kit";

/**
 * Used by `drizzle-kit generate` (produces SQL migrations from
 * src/identity/db/schema.ts — no live DB needed) and `drizzle-kit migrate`
 * (applies them against DATABASE_URL — Neon in production, local Docker
 * Postgres in dev; see docs/adr/adr-005-database.md). Automated tests do
 * not use this config at all — they run migrations programmatically
 * against an in-process PGlite instance, see src/identity/db/pglite.ts.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/identity/db/schema.ts",
  out: "./src/identity/db/migrations",
  dbCredentials: {
    url: process.env["DATABASE_URL"] ?? "",
  },
});

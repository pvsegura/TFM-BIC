import { defineConfig } from "drizzle-kit";

/**
 * Vocabulary's own migration set (M9): the `user_vocabulary` table, kept separate from Identity's
 * (drizzle.config.ts), Student Profile's, Lessons', Exercises' and Gamification's so each bounded
 * context owns its schema and history. `user_vocabulary` has a foreign key to `users`, so on a
 * fresh database run Identity's migration first (`pnpm --filter @tfm-bic/data db:migrate`), then
 * this one (`db:migrate:vocabulary`). It does not depend on Profile, Lessons, Exercises or
 * Gamification, so their order relative to it does not matter.
 *
 * It tracks applied migrations in its own table, for the same reason the others do: drizzle
 * applies only migrations newer than the latest one recorded, so sharing another context's
 * tracking table could silently skip one. Automated tests run these migrations programmatically
 * against PGlite, see src/vocabulary/db/test-support.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/vocabulary/db/schema.ts",
  out: "./src/vocabulary/db/migrations",
  migrations: { table: "__drizzle_migrations_vocabulary" },
  dbCredentials: {
    url: process.env["DATABASE_URL"] ?? "",
  },
});

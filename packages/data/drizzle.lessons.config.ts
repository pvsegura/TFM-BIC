import { defineConfig } from "drizzle-kit";

/**
 * Lessons' own migration set (M6): the `lesson_progress` table, kept separate
 * from Identity's (drizzle.config.ts) and Student Profile's
 * (drizzle.profile.config.ts) so each bounded context owns its schema and
 * history. `lesson_progress` has a foreign key to `users`, so on a fresh
 * database run Identity's migration first (`pnpm --filter @tfm-bic/data
 * db:migrate`), then this one (`db:migrate:lessons`). Profile and Lessons do
 * not depend on each other, so their order relative to each other does not
 * matter.
 *
 * It tracks applied migrations in its own table, for the same reason Profile
 * does: drizzle applies only migrations newer than the latest one recorded, so
 * sharing another context's tracking table could silently skip one. Automated
 * tests run these migrations programmatically against PGlite, see
 * src/lessons/db/test-support.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lessons/db/schema.ts",
  out: "./src/lessons/db/migrations",
  migrations: { table: "__drizzle_migrations_lessons" },
  dbCredentials: {
    url: process.env["DATABASE_URL"] ?? "",
  },
});

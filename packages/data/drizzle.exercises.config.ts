import { defineConfig } from "drizzle-kit";

/**
 * Exercises' own migration set (M7): the `exercise_attempts` table, kept
 * separate from Identity's (drizzle.config.ts), Student Profile's
 * (drizzle.profile.config.ts) and Lessons' (drizzle.lessons.config.ts) so each
 * bounded context owns its schema and history. `exercise_attempts` has a foreign
 * key to `users`, so on a fresh database run Identity's migration first
 * (`pnpm --filter @tfm-bic/data db:migrate`), then this one
 * (`db:migrate:exercises`). Profile, Lessons and Exercises do not depend on each
 * other, so their order relative to one another does not matter.
 *
 * It tracks applied migrations in its own table, for the same reason the others
 * do: drizzle applies only migrations newer than the latest one recorded, so
 * sharing another context's tracking table could silently skip one. Automated
 * tests run these migrations programmatically against PGlite, see
 * src/exercises/db/test-support.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/exercises/db/schema.ts",
  out: "./src/exercises/db/migrations",
  migrations: { table: "__drizzle_migrations_exercises" },
  dbCredentials: {
    url: process.env["DATABASE_URL"] ?? "",
  },
});

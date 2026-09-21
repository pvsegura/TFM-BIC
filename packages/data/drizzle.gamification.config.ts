import { defineConfig } from "drizzle-kit";

/**
 * Gamification's own migration set (M8): the `point_transactions` ledger and
 * `user_achievements`, kept separate from Identity's (drizzle.config.ts), Student Profile's
 * (drizzle.profile.config.ts), Lessons' (drizzle.lessons.config.ts) and Exercises'
 * (drizzle.exercises.config.ts) so each bounded context owns its schema and history. Both
 * tables have a foreign key to `users`, so on a fresh database run Identity's migration first
 * (`pnpm --filter @tfm-bic/data db:migrate`), then this one (`db:migrate:gamification`). It does
 * not depend on the Profile, Lessons or Exercises tables, so their order relative to it does
 * not matter.
 *
 * It tracks applied migrations in its own table, for the same reason the others do: drizzle
 * applies only migrations newer than the latest one recorded, so sharing another context's
 * tracking table could silently skip one. Automated tests run these migrations
 * programmatically against PGlite, see src/gamification/db/test-support.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/gamification/db/schema.ts",
  out: "./src/gamification/db/migrations",
  migrations: { table: "__drizzle_migrations_gamification" },
  dbCredentials: {
    url: process.env["DATABASE_URL"] ?? "",
  },
});

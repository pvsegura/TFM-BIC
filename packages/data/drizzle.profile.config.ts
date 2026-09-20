import { defineConfig } from "drizzle-kit";

/**
 * Student Profile's own migration set (M4), kept separate from Identity's
 * (drizzle.config.ts) so each bounded context owns its schema and history.
 * `student_profiles` has a foreign key to `users`, so on a fresh database run
 * Identity's migration first (`pnpm --filter @tfm-bic/data db:migrate`), then
 * this one (`db:migrate:profile`).
 *
 * It tracks applied migrations in its own table: drizzle applies only
 * migrations newer than the latest one recorded, so sharing Identity's
 * tracking table could silently skip a profile migration that was generated
 * before a later Identity one. Automated tests run these migrations
 * programmatically against PGlite, see src/profile/db/test-support.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/profile/db/schema.ts",
  out: "./src/profile/db/migrations",
  migrations: { table: "__drizzle_migrations_profile" },
  dbCredentials: {
    url: process.env["DATABASE_URL"] ?? "",
  },
});

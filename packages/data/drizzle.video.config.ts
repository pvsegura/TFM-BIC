import { defineConfig } from "drizzle-kit";

/**
 * Video's own migration set (M11): the `video_generation_jobs` table, kept separate from
 * Identity's (drizzle.config.ts), Student Profile's, Lessons', Exercises', Gamification's,
 * Vocabulary's and Phonetics', so each bounded context owns its schema and history.
 * `video_generation_jobs` has a foreign key to `users`, so on a fresh database run Identity's
 * migration first (`pnpm --filter @tfm-bic/data db:migrate`), then this one
 * (`db:migrate:video`). It does not depend on Profile, Lessons, Exercises, Gamification,
 * Vocabulary or Phonetics, so their order relative to it does not matter.
 *
 * It tracks applied migrations in its own table, for the same reason the others do: drizzle
 * applies only migrations newer than the latest one recorded, so sharing another context's
 * tracking table could silently skip one. Automated tests run these migrations programmatically
 * against PGlite, see src/video/db/test-support.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/video/db/schema.ts",
  out: "./src/video/db/migrations",
  migrations: { table: "__drizzle_migrations_video" },
  dbCredentials: {
    url: process.env["DATABASE_URL"] ?? "",
  },
});

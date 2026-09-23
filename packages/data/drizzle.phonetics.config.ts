import { defineConfig } from "drizzle-kit";

/**
 * Phonetics' own migration set (M10): the `user_phonetic_progress` table, kept separate from
 * Identity's (drizzle.config.ts), Student Profile's, Lessons', Exercises', Gamification's and
 * Vocabulary's, so each bounded context owns its schema and history. `user_phonetic_progress` has
 * a foreign key to `users`, so on a fresh database run Identity's migration first
 * (`pnpm --filter @tfm-bic/data db:migrate`), then this one (`db:migrate:phonetics`). It does not
 * depend on Profile, Lessons, Exercises, Gamification or Vocabulary, so their order relative to it
 * does not matter.
 *
 * It tracks applied migrations in its own table, for the same reason the others do: drizzle
 * applies only migrations newer than the latest one recorded, so sharing another context's
 * tracking table could silently skip one. Automated tests run these migrations programmatically
 * against PGlite, see src/phonetics/db/test-support.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/phonetics/db/schema.ts",
  out: "./src/phonetics/db/migrations",
  migrations: { table: "__drizzle_migrations_phonetics" },
  dbCredentials: {
    url: process.env["DATABASE_URL"] ?? "",
  },
});

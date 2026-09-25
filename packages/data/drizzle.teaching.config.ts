import { defineConfig } from "drizzle-kit";

/**
 * Teaching's own migration set (M13): the `teacher_students` table. It has two foreign keys to
 * `users`, so on a fresh database run Identity's migration first (`pnpm --filter @tfm-bic/data
 * db:migrate`), then this one (`db:migrate:teaching`). The teacher dashboard's read model also
 * *reads* Profile, Lessons, Exercises and Gamification tables, but defines none of them, so the
 * order relative to those migrations does not matter for applying this one.
 *
 * Tracked in its own table, like every other context (see drizzle.video.config.ts for why).
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/teaching/db/schema.ts",
  out: "./src/teaching/db/migrations",
  migrations: { table: "__drizzle_migrations_teaching" },
  dbCredentials: {
    url: process.env["DATABASE_URL"] ?? "",
  },
});

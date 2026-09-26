import { defineConfig } from "drizzle-kit";

/**
 * Newsletter's own migration set (M14): the `newsletter_subscriptions` table. It has a foreign key
 * to `users`, so on a fresh database run Identity's migration first (`pnpm --filter @tfm-bic/data
 * db:migrate`), then this one (`db:migrate:newsletter`). Independent of every other context.
 *
 * Tracked in its own table, like every other context (see drizzle.video.config.ts for why).
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/newsletter/db/schema.ts",
  out: "./src/newsletter/db/migrations",
  migrations: { table: "__drizzle_migrations_newsletter" },
  dbCredentials: {
    url: process.env["DATABASE_URL"] ?? "",
  },
});

import { defineConfig } from "drizzle-kit";

/**
 * Commerce's own migration set (Verbysia): products, purchases, subscriptions, licences, payment
 * events and the admin audit log. Its tables reference `users`, so Identity's migrations run
 * first (MIGRATION_SETS order). Tracked in its own table like every other context.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/commerce/db/schema.ts",
  out: "./src/commerce/db/migrations",
  migrations: { table: "__drizzle_migrations_commerce" },
  dbCredentials: {
    url: process.env["DATABASE_URL"] ?? "",
  },
});

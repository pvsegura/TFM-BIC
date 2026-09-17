import { loadEnv } from "@tfm-bic/config";

import { createAuthDependencies } from "./composition/auth-dependencies.js";
import { buildServer } from "./server.js";

const env = loadEnv();
// loadEnv() already fails fast if DATABASE_URL is missing outside
// NODE_ENV=test (see packages/config) — this is a defensive re-check, not
// the primary guard.
if (!env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required outside of NODE_ENV=test.");
}
const authDeps = createAuthDependencies(env.DATABASE_URL);
const app = buildServer(env, authDeps);

async function start(): Promise<void> {
  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

async function shutdown(signal: string): Promise<void> {
  app.log.info({ signal }, "Shutting down");
  await app.close();
  await authDeps.close();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

void start();

import { createCommerceDb } from "./db/client.js";
import { runPlatformAdminCommand } from "./platform-admin-command.js";

/** Operator entry point — see platform-admin-command.ts. Never prints DATABASE_URL. */
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  process.stderr.write("DATABASE_URL is required.\n");
  process.exit(2);
}

const handle = createCommerceDb(databaseUrl);
try {
  const result = await runPlatformAdminCommand(process.argv.slice(2), handle.db);
  (result.exitCode === 0 ? process.stdout : process.stderr).write(`${result.message}\n`);
  process.exitCode = result.exitCode;
} finally {
  await handle.close();
}

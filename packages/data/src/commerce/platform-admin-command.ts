import { eq, sql } from "drizzle-orm";

import { users } from "../identity/db/schema.js";
import type { CommerceDb } from "./db/client.js";

export const PLATFORM_ADMIN_USAGE =
  "Usage: pnpm --filter @verbysia/data platform:admin <promote|demote> <email>";

/**
 * The only way to create a Verbysia administrator: an operator command run against
 * DATABASE_URL (no HTTP route can grant ADMIN, so a compromised account cannot escalate).
 * `demote` returns the account to STUDENT. Email matching is case-insensitive.
 */
export async function runPlatformAdminCommand(
  args: readonly string[],
  db: CommerceDb,
): Promise<{ exitCode: number; message: string }> {
  const [action, email] = args;
  if ((action !== "promote" && action !== "demote") || !email) {
    return { exitCode: 2, message: PLATFORM_ADMIN_USAGE };
  }
  const role = action === "promote" ? "ADMIN" : "STUDENT";
  const updated = await db
    .update(users)
    .set({ role, updatedAt: sql`now()` })
    .where(eq(users.normalizedEmail, email.trim().toLowerCase()))
    .returning({ id: users.id });
  if (updated.length === 0) {
    return { exitCode: 1, message: "No account with that email." };
  }
  return { exitCode: 0, message: `Account is now ${role}.` };
}

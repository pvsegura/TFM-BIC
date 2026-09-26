import type { AccountErasureStore } from "@tfm-bic/application";
import { validateUserDataRegister, type UserDataRegisterEntry } from "@tfm-bic/domain";
import { sql } from "drizzle-orm";

import type { PrivacyDb } from "./db/client.js";
import { USER_DATA_REGISTER } from "./user-data-register.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function deleteStatement(entry: UserDataRegisterEntry, userId: string) {
  const matchesUser = sql.join(
    entry.userReferences.map((column) => sql`${sql.identifier(column)} = ${userId}::uuid`),
    sql` OR `,
  );
  return sql`DELETE FROM ${sql.identifier(entry.store)} WHERE ${matchesUser}`;
}

/**
 * Account erasure over PostgreSQL (M15, ADR-026). One transaction:
 *
 * 1. `SELECT … FOR UPDATE` on the user's row — no concurrent request can add a row that
 *    references the user (its foreign-key check needs a lock this one conflicts with) until the
 *    transaction ends; an account that is already gone ends here with `false`.
 * 2. An explicit `DELETE` per registered store, in the register's order — the decision for each
 *    table is visible in code rather than implied by `ON DELETE CASCADE`, which stays in the
 *    schema only as a safety net.
 * 3. `DELETE` of the account itself.
 *
 * Any failure rolls every step back. Table and column names only ever come from the register
 * (constants), never from input; the user id is a bound parameter.
 */
export class DrizzleAccountErasureStore implements AccountErasureStore {
  private readonly dependents: readonly UserDataRegisterEntry[];

  constructor(
    private readonly db: PrivacyDb,
    register: readonly UserDataRegisterEntry[] = USER_DATA_REGISTER,
  ) {
    validateUserDataRegister(register);
    const undecided = register.filter((entry) => entry.erasure !== "delete");
    if (undecided.length > 0) {
      // Retention/anonymisation needs its own implementation once a decision exists (ADR-026).
      throw new Error(
        `Erasure is implemented for "delete" only; not for: ${undecided.map((e) => e.store).join(", ")}.`,
      );
    }
    this.dependents = register.filter((entry) => entry.store !== "users");
  }

  async eraseAccount(userId: string): Promise<boolean> {
    if (!UUID_PATTERN.test(userId)) {
      return false;
    }
    return this.db.transaction(async (tx) => {
      const locked = await tx.execute(
        sql`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`,
      );
      if (locked.rows.length === 0) {
        return false;
      }
      for (const entry of this.dependents) {
        await tx.execute(deleteStatement(entry, userId));
      }
      await tx.execute(sql`DELETE FROM users WHERE id = ${userId}::uuid`);
      return true;
    });
  }
}

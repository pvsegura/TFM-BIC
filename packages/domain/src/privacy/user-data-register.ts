import type { DataClassification } from "./data-classification.js";
import { InvalidUserDataRegisterError } from "./errors/invalid-user-data-register.error.js";

/**
 * What happens to a store's rows when their user's account is deleted (M15, ADR-026).
 * `retain` and `anonymise` exist so a future legal/product decision can be expressed, but each
 * must carry its documented reason — nothing is kept "just in case".
 */
export const ERASURE_DISPOSITIONS = ["delete", "anonymise", "retain"] as const;

export type ErasureDisposition = (typeof ERASURE_DISPOSITIONS)[number];

/**
 * One store (a table) that holds rows about a user, as the account-deletion workflow and the
 * deletion matrix (docs/privacy/DATA-DELETION-MATRIX.md) see it. `userReferences` are the
 * columns that point at the user; a row matches when any of them does.
 */
export interface UserDataRegisterEntry {
  readonly store: string;
  readonly context: string;
  readonly userReferences: readonly string[];
  readonly classification: DataClassification;
  readonly erasure: ErasureDisposition;
  /** Required for `retain` and `anonymise`: why the rows outlive the account. */
  readonly reason?: string;
}

/**
 * The register's rules: not empty, one entry per store, at least one user reference, and a
 * documented reason for anything that is not deleted. Throws `InvalidUserDataRegisterError`.
 */
export function validateUserDataRegister(entries: readonly UserDataRegisterEntry[]): void {
  if (entries.length === 0) {
    throw new InvalidUserDataRegisterError("the register is empty");
  }
  const seen = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.store)) {
      throw new InvalidUserDataRegisterError(`"${entry.store}" is listed twice`);
    }
    seen.add(entry.store);
    if (entry.userReferences.length === 0) {
      throw new InvalidUserDataRegisterError(`"${entry.store}" has no user reference`);
    }
    if (entry.erasure !== "delete" && (entry.reason ?? "").trim() === "") {
      throw new InvalidUserDataRegisterError(
        `"${entry.store}" is ${entry.erasure === "retain" ? "retained" : "anonymised"} without a documented reason`,
      );
    }
  }
}

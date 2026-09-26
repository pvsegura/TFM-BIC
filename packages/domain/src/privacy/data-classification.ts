/**
 * A lightweight internal classification of what the application stores (M15). It guides logging,
 * API exposure, export and deletion — see docs/privacy/DATA-CLASSIFICATION.md. It is an
 * engineering label, not a legal category: `PERSONAL` is data about an identifiable user, and
 * nothing here is presumed to be a GDPR "special category".
 *
 * - `PUBLIC` — published content anyone can read (the catalog).
 * - `INTERNAL` — operational data about the system, not about a person (provider job references,
 *   server file paths, migration bookkeeping).
 * - `PERSONAL` — data about an identifiable user (account, profile, learning records, consent).
 * - `SECURITY_SENSITIVE` — credentials and their derivatives (password hashes, session and token
 *   hashes, unsubscribe keys). Never exported, returned or logged.
 */
export const DATA_CLASSIFICATIONS = [
  "PUBLIC",
  "INTERNAL",
  "PERSONAL",
  "SECURITY_SENSITIVE",
] as const;

export type DataClassification = (typeof DATA_CLASSIFICATIONS)[number];

/** A personal-data export carries `PERSONAL` fields only — never secrets or infrastructure data. */
export function isExportableClassification(classification: DataClassification): boolean {
  return classification === "PERSONAL";
}

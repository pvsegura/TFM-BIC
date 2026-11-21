/**
 * What a learner may open, decided on the server from their licences — never by hiding buttons.
 * Matrix: docs/product/verbysia/AUDITORIA-Y-PLAN.md §5.
 */
import type { LevelId } from "../language/level-id.js";

export const LICENCE_KINDS = [
  "FREE",
  "CHALLENGE_7D",
  "COURSE_A1",
  "COURSE_A2",
  "COURSE_B1",
  "COURSE_B2",
  "PREMIUM_MONTHLY",
  "PREMIUM_YEARLY",
] as const;
export type LicenceKind = (typeof LICENCE_KINDS)[number];

export function isLicenceKind(value: string): value is LicenceKind {
  return LICENCE_KINDS.some((kind) => kind === value);
}

export interface Licence {
  kind: LicenceKind;
  /** Inclusive start. */
  startsAt: Date;
  /** Exclusive end; `null` = indefinite (one-off course purchase). */
  endsAt: Date | null;
  /** Set when refunded or revoked by an administrator; a revoked licence grants nothing. */
  revokedAt: Date | null;
}

/** The access a piece of content requires. `free` items are open to every signed-in learner. */
export type ContentAccess =
  { tier: "free" } | { tier: "challenge" } | { tier: "course"; levelId: LevelId };

const COURSE_LICENCE: Partial<Record<LevelId, LicenceKind>> = {
  a1: "COURSE_A1",
  a2: "COURSE_A2",
  b1: "COURSE_B1",
  b2: "COURSE_B2",
};

const PREMIUM: readonly LicenceKind[] = ["PREMIUM_MONTHLY", "PREMIUM_YEARLY"];

export function isLicenceActive(licence: Licence, now: Date): boolean {
  if (licence.revokedAt !== null && licence.revokedAt <= now) return false;
  if (licence.startsAt > now) return false;
  return licence.endsAt === null || now < licence.endsAt;
}

/** Whether these licences open content with this access requirement at `now`. */
export function canAccess(licences: readonly Licence[], access: ContentAccess, now: Date): boolean {
  if (access.tier === "free" || access.tier === "challenge") return true;

  const active = licences.filter((licence) => isLicenceActive(licence, now));
  if (active.some((licence) => PREMIUM.includes(licence.kind))) return true;

  const required = COURSE_LICENCE[access.levelId];
  return required !== undefined && active.some((licence) => licence.kind === required);
}

/** Whether any active licence is a Premium subscription (memory trainer in full, AI coach quota). */
export function hasPremium(licences: readonly Licence[], now: Date): boolean {
  return licences.some(
    (licence) => PREMIUM.includes(licence.kind) && isLicenceActive(licence, now),
  );
}

import type { ContentAccess } from "../commerce/entitlement.js";
import type { LevelId } from "../language/level-id.js";

/**
 * How a content file declares who may open it. `course` is the safe default: a file that says
 * nothing needs a licence for its level, so forgetting the field never gives premium away.
 */
export const CONTENT_ACCESS_LEVELS = ["free", "course"] as const;
export type ContentAccessLevel = (typeof CONTENT_ACCESS_LEVELS)[number];

/** The licence requirement of an item placed at `levelId` that declares `access`. */
export function contentAccessFor(
  access: ContentAccessLevel | undefined,
  levelId: LevelId,
): ContentAccess {
  return access === "free" ? { tier: "free" } : { tier: "course", levelId };
}

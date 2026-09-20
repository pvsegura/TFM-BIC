import { type AvatarId, isValidAvatarId } from "../media/avatar-catalog.js";
import { InvalidAvatarIdError } from "./errors/invalid-avatar-id.error.js";

/**
 * The only way an avatar id enters a profile: it must be an exact catalog id.
 * Not trimmed or case-folded — an id is an opaque key, not user-entered text,
 * so anything that isn't byte-for-byte a catalog id is rejected.
 */
export function createAvatarId(value: string): AvatarId {
  if (!isValidAvatarId(value)) {
    throw new InvalidAvatarIdError();
  }
  return value;
}

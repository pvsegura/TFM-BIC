/**
 * How each catalog avatar *looks* — a purely presentational lookup keyed by
 * avatar id. Which avatars exist (and their labels) is owned by the avatar
 * catalog in packages/domain; this file only decorates those ids, so it holds
 * no avatar metadata of its own. A `Map` (not an object) so an id like
 * `"constructor"` can never resolve to an inherited property.
 */
const AVATAR_GLYPHS: ReadonlyMap<string, string> = new Map([
  ["avatar-01", "🦊"],
  ["avatar-02", "🦉"],
  ["avatar-03", "🐻"],
  ["avatar-04", "🦦"],
  ["avatar-05", "🐰"],
  ["avatar-06", "🐺"],
]);

/** Shown for "no avatar chosen yet" and for an id this UI has no glyph for. */
export const FALLBACK_AVATAR_GLYPH = "👤";

export function hasAvatarGlyph(avatarId: string): boolean {
  return AVATAR_GLYPHS.has(avatarId);
}

export function getAvatarGlyph(avatarId: string | null): string {
  return (avatarId !== null ? AVATAR_GLYPHS.get(avatarId) : undefined) ?? FALLBACK_AVATAR_GLYPH;
}

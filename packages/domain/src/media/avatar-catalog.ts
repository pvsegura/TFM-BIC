/**
 * The application-defined avatar catalog (Media context — see
 * docs/architecture/domain-model.md). A student picks one of these by id;
 * arbitrary client-supplied images/URLs are never accepted, so what gets
 * persisted is always one of these stable ids. Adding an avatar later means
 * appending an entry here — nothing else needs to change.
 *
 * Only identity + label live here: how an avatar *looks* is a presentation
 * concern owned by the UI layer, keyed by id.
 */
export const AVATAR_CATALOG = [
  { id: "avatar-01", label: "Fox" },
  { id: "avatar-02", label: "Owl" },
  { id: "avatar-03", label: "Bear" },
  { id: "avatar-04", label: "Otter" },
  { id: "avatar-05", label: "Rabbit" },
  { id: "avatar-06", label: "Wolf" },
] as const;

export type AvatarDefinition = (typeof AVATAR_CATALOG)[number];
export type AvatarId = AvatarDefinition["id"];

/** Non-empty tuple form of the ids, as required by `z.enum`. */
export const AVATAR_IDS = AVATAR_CATALOG.map((avatar) => avatar.id) as unknown as readonly [
  AvatarId,
  ...AvatarId[],
];

const AVATAR_ID_SET: ReadonlySet<string> = new Set(AVATAR_IDS);

export function isValidAvatarId(value: string): value is AvatarId {
  return AVATAR_ID_SET.has(value);
}

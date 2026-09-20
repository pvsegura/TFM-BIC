import { AVATAR_CATALOG, AVATAR_IDS, type AvatarId } from "@tfm-bic/domain";
import { z } from "zod";

/**
 * Only an exact catalog id passes — never a URL or free text. The catalog
 * itself is re-exported here because `apps/web` depends on this package (not
 * on `packages/domain`), so this is how the picker gets the one source of
 * truth for which avatars exist without duplicating that list in the UI.
 */
export const avatarIdSchema = z.enum(AVATAR_IDS);

export { AVATAR_CATALOG, type AvatarId };

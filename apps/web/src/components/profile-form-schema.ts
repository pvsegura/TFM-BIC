import {
  avatarIdSchema,
  updateProfileRequestSchema,
  type ProfileResponse,
} from "@tfm-bic/contracts";
import { z } from "zod";

/** What the form's inputs hold: text inputs are always strings (blank when
 * unset); the avatar is `null` until one is chosen. */
export type ProfileFormValues = z.input<typeof profileFormSchema>;

/** What is submitted: exactly the shared `UpdateProfileRequest`. */
export type ProfileFormRequest = z.output<typeof profileFormSchema>;

export function toFormValues(profile: ProfileResponse): ProfileFormValues {
  return {
    firstName: profile.firstName ?? "",
    lastName: profile.lastName ?? "",
    nickname: profile.nickname ?? "",
    avatarId: profile.avatarId,
  };
}

/** The request schema's own input type — annotating the transform with it
 * keeps the pipe type-safe under `exactOptionalPropertyTypes`. */
type PipedRequest = z.input<typeof updateProfileRequestSchema>;

/** A blank (empty or whitespace-only) input means "no value": sent as `null`,
 * which clears the field. The API itself is stricter — it rejects a blank
 * string — so this is the one place the UI's "blank = unset" convention is
 * translated into the API's explicit-null contract. */
function blankToNull(value: string): string | null {
  return value.trim() === "" ? null : value;
}

/**
 * Validates the form by feeding it through the shared request contract, so
 * the name/nickname/avatar rules live in one place (packages/domain via
 * packages/contracts) rather than being re-declared here. Error paths line up
 * with the form's field names, so they map straight onto inputs.
 */
export const profileFormSchema = z
  .object({
    firstName: z.string(),
    lastName: z.string(),
    nickname: z.string(),
    avatarId: avatarIdSchema.nullable(),
  })
  .transform((values): PipedRequest => ({
    firstName: blankToNull(values.firstName),
    lastName: blankToNull(values.lastName),
    nickname: blankToNull(values.nickname),
    // An avatar can be replaced but never cleared, so "none chosen" is
    // simply not sent.
    ...(values.avatarId !== null ? { avatarId: values.avatarId } : {}),
  }))
  .pipe(updateProfileRequestSchema);

import {
  createAvatarId,
  createNickname,
  createProfileName,
  type StudentProfile,
} from "@tfm-bic/domain";

import type { ProfilePatch, ProfileRepository } from "../ports/profile-repository.js";

export interface UpdateCurrentStudentProfileInput {
  /** Must come from the authenticated session — never from client input. */
  userId: string;
  /** Omitted/`undefined` = leave unchanged, `null` = clear, string = validate and set. */
  firstName?: string | null | undefined;
  lastName?: string | null | undefined;
  nickname?: string | null | undefined;
  avatarId?: string | undefined;
}

/**
 * The input type carries only `userId` plus the four editable profile
 * fields — there is no `role`, `email` or any authentication field for a
 * route to accidentally forward from a request body (mass-assignment
 * prevention, see docs/security/security-baseline.md). Each field is mapped
 * explicitly below; nothing is spread from the input.
 *
 * Empty-value policy: a text field is either omitted (unchanged), `null`
 * (cleared) or a valid string. An empty or whitespace-only string is never
 * stored — it is rejected, not silently turned into `null`.
 *
 * Every provided field is validated before anything is written, so a single
 * invalid field saves nothing.
 */
export class UpdateCurrentStudentProfileUseCase {
  constructor(private readonly profileRepository: ProfileRepository) {}

  async execute(input: UpdateCurrentStudentProfileInput): Promise<StudentProfile> {
    const patch: ProfilePatch = {};
    if (input.firstName !== undefined) {
      patch.firstName = input.firstName === null ? null : createProfileName(input.firstName);
    }
    if (input.lastName !== undefined) {
      patch.lastName = input.lastName === null ? null : createProfileName(input.lastName);
    }
    if (input.nickname !== undefined) {
      patch.nickname = input.nickname === null ? null : createNickname(input.nickname);
    }
    if (input.avatarId !== undefined) {
      patch.avatarId = createAvatarId(input.avatarId);
    }

    return this.profileRepository.upsert(input.userId, patch);
  }
}

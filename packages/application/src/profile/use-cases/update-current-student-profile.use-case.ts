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
  firstName?: string;
  lastName?: string;
  nickname?: string;
  avatarId?: string;
}

/**
 * The input type carries only `userId` plus the four editable profile
 * fields — there is no `role`, `email` or any authentication field for a
 * route to accidentally forward from a request body (mass-assignment
 * prevention, see docs/security/security-baseline.md). Each field is mapped
 * explicitly below; nothing is spread from the input.
 *
 * Every provided field is validated before anything is written, so a single
 * invalid field saves nothing.
 */
export class UpdateCurrentStudentProfileUseCase {
  constructor(private readonly profileRepository: ProfileRepository) {}

  async execute(input: UpdateCurrentStudentProfileInput): Promise<StudentProfile> {
    const patch: ProfilePatch = {};
    if (input.firstName !== undefined) {
      patch.firstName = createProfileName(input.firstName);
    }
    if (input.lastName !== undefined) {
      patch.lastName = createProfileName(input.lastName);
    }
    if (input.nickname !== undefined) {
      patch.nickname = createNickname(input.nickname);
    }
    if (input.avatarId !== undefined) {
      patch.avatarId = createAvatarId(input.avatarId);
    }

    return this.profileRepository.upsert(input.userId, patch);
  }
}

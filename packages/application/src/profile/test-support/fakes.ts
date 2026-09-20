import type { StudentProfile } from "@tfm-bic/domain";

import type { Clock } from "../../ports/clock.js";
import type { ProfilePatch, ProfileRepository } from "../ports/profile-repository.js";

/** In-memory, deterministic test double for the Student Profile port — used
 * by the profile use-case tests and apps/api's HTTP-layer tests so neither
 * needs real I/O. Not exported from the package's public index; test-only. */
export class FakeProfileRepository implements ProfileRepository {
  readonly profiles: StudentProfile[] = [];
  /** How many times `upsert` was called — lets a test assert a rejected
   * request never reached persistence. */
  upsertCalls = 0;

  constructor(private readonly clock: Clock) {}

  findByUserId(userId: string): Promise<StudentProfile | null> {
    return Promise.resolve(this.profiles.find((p) => p.userId === userId) ?? null);
  }

  upsert(userId: string, patch: ProfilePatch): Promise<StudentProfile> {
    this.upsertCalls += 1;
    const now = this.clock.now();
    const index = this.profiles.findIndex((p) => p.userId === userId);
    const existing = this.profiles[index];

    const next: StudentProfile = {
      userId,
      firstName: patch.firstName ?? existing?.firstName ?? null,
      lastName: patch.lastName ?? existing?.lastName ?? null,
      nickname: patch.nickname ?? existing?.nickname ?? null,
      avatarId: patch.avatarId ?? existing?.avatarId ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    if (index === -1) {
      this.profiles.push(next);
    } else {
      this.profiles[index] = next;
    }
    return Promise.resolve(next);
  }
}

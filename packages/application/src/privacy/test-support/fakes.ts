import type {
  FakeSessionRepository,
  FakeUserRepository,
} from "../../identity/test-support/fakes.js";
import type { AccountErasureStore } from "../ports/account-erasure-store.js";
import type {
  PersonalDataReadModel,
  PersonalDataRecords,
} from "../ports/personal-data-read-model.js";

/** A full set of records for one user, with fixed dates — override what a test cares about. */
export function makePersonalDataRecords(userId: string): PersonalDataRecords {
  return {
    account: {
      userId,
      email: "ada@example.com",
      role: "STUDENT",
      emailVerified: true,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    },
    profile: {
      firstName: "Ada",
      lastName: "Lovelace",
      nickname: "ada",
      avatarId: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-03T00:00:00.000Z"),
    },
    lessonProgress: [
      {
        lessonId: "pl-greetings",
        status: "completed",
        startedAt: new Date("2026-02-01T00:00:00.000Z"),
        completedAt: new Date("2026-02-02T00:00:00.000Z"),
        updatedAt: new Date("2026-02-02T00:00:00.000Z"),
      },
    ],
    exerciseAttempts: [
      {
        exerciseId: "pl-greetings-choice",
        submittedAnswer: "cześć",
        correct: true,
        answeredAt: new Date("2026-02-01T01:00:00.000Z"),
      },
    ],
    vocabulary: [
      {
        vocabularyItemId: "pl-vocab-dom",
        status: "learning",
        createdAt: new Date("2026-02-03T00:00:00.000Z"),
        updatedAt: new Date("2026-02-04T00:00:00.000Z"),
        learnedAt: null,
      },
    ],
    phonetics: [
      {
        phoneticRepresentationId: "pl-ipa-onasal",
        status: "viewed",
        firstViewedAt: new Date("2026-02-05T00:00:00.000Z"),
        lastViewedAt: new Date("2026-02-06T00:00:00.000Z"),
        practicedAt: null,
        completedAt: null,
      },
    ],
    pointTransactions: [
      {
        reason: "exercise-completed",
        sourceId: "pl-greetings-choice",
        amount: 10,
        createdAt: new Date("2026-02-01T01:00:00.000Z"),
      },
      {
        reason: "lesson-completed",
        sourceId: "pl-greetings",
        amount: 25,
        createdAt: new Date("2026-02-02T00:00:00.000Z"),
      },
    ],
    achievements: [
      { achievementKey: "first-lesson", unlockedAt: new Date("2026-02-02T00:00:00.000Z") },
    ],
    videoGenerationJobs: [
      {
        jobId: "44444444-4444-4444-8444-444444444444",
        videoDefinitionId: "pl-a1-nasal-vowels-demo",
        status: "completed",
        errorCategory: null,
        createdAt: new Date("2026-02-07T00:00:00.000Z"),
        updatedAt: new Date("2026-02-07T00:01:00.000Z"),
        completedAt: new Date("2026-02-07T00:01:00.000Z"),
      },
    ],
    newsletter: {
      status: "unsubscribed",
      consentVersion: "newsletter-consent-v1",
      consentSource: "settings",
      requestedAt: new Date("2026-03-01T00:00:00.000Z"),
      confirmedAt: new Date("2026-03-01T01:00:00.000Z"),
      unsubscribedAt: new Date("2026-03-02T00:00:00.000Z"),
    },
    teacherLinks: [{ linkedAt: new Date("2026-01-05T00:00:00.000Z") }],
    linkedStudentCount: 0,
  };
}

/** In-memory read model: records seeded per user id; remembers which ids it was asked for. */
export class FakePersonalDataReadModel implements PersonalDataReadModel {
  readonly records = new Map<string, PersonalDataRecords>();
  readonly requestedUserIds: string[] = [];

  seed(records: PersonalDataRecords): void {
    this.records.set(records.account.userId, records);
  }

  load(userId: string): Promise<PersonalDataRecords | null> {
    this.requestedUserIds.push(userId);
    return Promise.resolve(this.records.get(userId) ?? null);
  }
}

/**
 * In-memory erasure over the identity fakes: removes the user and their sessions (the rows that
 * make a deleted account's cookie stop working), plus anything a test registers in `alsoErase`.
 */
export class FakeAccountErasureStore implements AccountErasureStore {
  readonly erasedUserIds: string[] = [];
  readonly alsoErase: ((userId: string) => void)[] = [];
  failWith: Error | null = null;
  beforeErase: (() => void) | null = null;

  constructor(
    private readonly users: FakeUserRepository,
    private readonly sessions: FakeSessionRepository,
  ) {}

  async eraseAccount(userId: string): Promise<boolean> {
    this.beforeErase?.();
    if (this.failWith !== null) {
      throw this.failWith;
    }
    const index = this.users.users.findIndex((user) => user.id === userId);
    if (index === -1) {
      return false;
    }
    this.users.users.splice(index, 1);
    await this.sessions.revokeAllForUser(userId);
    for (const erase of this.alsoErase) {
      erase(userId);
    }
    this.erasedUserIds.push(userId);
    return true;
  }
}

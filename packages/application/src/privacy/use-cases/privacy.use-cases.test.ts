import { AccountDeletionRefusedError, PERSONAL_DATA_EXPORT_VERSION } from "@tfm-bic/domain";
import { describe, expect, it } from "vitest";

import {
  FakePasswordHasher,
  FakeSessionRepository,
  FakeUserRepository,
  FixedClock,
} from "../../identity/test-support/fakes.js";
import {
  FakeAccountErasureStore,
  FakePersonalDataReadModel,
  makePersonalDataRecords,
} from "../test-support/fakes.js";
import { DeleteAccountUseCase } from "./delete-account.use-case.js";
import { ExportPersonalDataUseCase } from "./export-personal-data.use-case.js";

const NOW = new Date("2026-09-26T10:00:00.000Z");
const USER_ID = "11111111-1111-4111-8111-111111111111";

describe("ExportPersonalDataUseCase", () => {
  function setup() {
    const readModel = new FakePersonalDataReadModel();
    const useCase = new ExportPersonalDataUseCase(readModel, new FixedClock(NOW));
    return { readModel, useCase };
  }

  it("returns null when the account no longer exists", async () => {
    const { useCase } = setup();
    expect(await useCase.execute({ userId: USER_ID })).toBeNull();
  });

  it("assembles a versioned export with ISO 8601 timestamps from the user's own records", async () => {
    const { readModel, useCase } = setup();
    readModel.seed(makePersonalDataRecords(USER_ID));

    const result = await useCase.execute({ userId: USER_ID });

    expect(result).not.toBeNull();
    expect(result!.exportVersion).toBe(PERSONAL_DATA_EXPORT_VERSION);
    expect(result!.generatedAt).toBe(NOW.toISOString());
    expect(result!.account).toEqual({
      userId: USER_ID,
      email: "ada@example.com",
      role: "STUDENT",
      emailVerified: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
    expect(result!.profile).toEqual({
      firstName: "Ada",
      lastName: "Lovelace",
      nickname: "ada",
      avatarId: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-03T00:00:00.000Z",
    });
    expect(result!.learning.lessons).toEqual([
      {
        lessonId: "pl-greetings",
        status: "completed",
        startedAt: "2026-02-01T00:00:00.000Z",
        completedAt: "2026-02-02T00:00:00.000Z",
        updatedAt: "2026-02-02T00:00:00.000Z",
      },
    ]);
    expect(result!.learning.exerciseAttempts).toEqual([
      {
        exerciseId: "pl-greetings-choice",
        submittedAnswer: "cześć",
        correct: true,
        answeredAt: "2026-02-01T01:00:00.000Z",
      },
    ]);
    expect(result!.vocabulary.items).toHaveLength(1);
    expect(result!.phonetics.items[0]).toMatchObject({ practicedAt: null, completedAt: null });
    expect(result!.gamification.totalPoints).toBe(35);
    expect(result!.gamification.achievements).toEqual([
      { key: "first-lesson", unlockedAt: "2026-02-02T00:00:00.000Z" },
    ]);
    expect(result!.media.videoGenerationJobs[0]).toMatchObject({ status: "completed" });
    expect(result!.communication.newsletter).toEqual({
      status: "unsubscribed",
      consentVersion: "newsletter-consent-v1",
      consentSource: "settings",
      requestedAt: "2026-03-01T00:00:00.000Z",
      confirmedAt: "2026-03-01T01:00:00.000Z",
      unsubscribedAt: "2026-03-02T00:00:00.000Z",
    });
    expect(result!.teaching).toEqual({
      linkedTeachers: [{ linkedAt: "2026-01-05T00:00:00.000Z" }],
      linkedStudentCount: 0,
    });
  });

  it("states essential email as always on and lists what is deliberately left out", async () => {
    const { readModel, useCase } = setup();
    readModel.seed(makePersonalDataRecords(USER_ID));

    const result = await useCase.execute({ userId: USER_ID });

    expect(result!.communication.essentialEmails).toBe("always-on");
    expect(result!.notIncluded).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/password/i),
        expect.stringMatching(/session/i),
      ]),
    );
  });

  it("represents an account with no profile, no newsletter record and no activity", async () => {
    const { readModel, useCase } = setup();
    readModel.seed({
      ...makePersonalDataRecords(USER_ID),
      profile: null,
      newsletter: null,
      lessonProgress: [],
      exerciseAttempts: [],
      pointTransactions: [],
      achievements: [],
      teacherLinks: [],
    });

    const result = await useCase.execute({ userId: USER_ID });

    expect(result!.profile).toBeNull();
    expect(result!.communication.newsletter).toBeNull();
    expect(result!.gamification.totalPoints).toBe(0);
    expect(result!.learning.lessons).toEqual([]);
  });

  it("never carries a secret-looking field, whatever the stored records contain", async () => {
    const { readModel, useCase } = setup();
    readModel.seed(makePersonalDataRecords(USER_ID));

    const serialized = JSON.stringify(await useCase.execute({ userId: USER_ID }));

    for (const forbidden of ["passwordHash", "tokenHash", "unsubscribeKey", "normalizedEmail"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("only ever asks the read model for the requested user", async () => {
    const { readModel, useCase } = setup();
    readModel.seed(makePersonalDataRecords(USER_ID));
    readModel.seed({
      ...makePersonalDataRecords("22222222-2222-4222-8222-222222222222"),
      account: {
        ...makePersonalDataRecords("x").account,
        userId: "22222222-2222-4222-8222-222222222222",
        email: "other@example.com",
      },
    });

    const result = await useCase.execute({ userId: USER_ID });

    expect(readModel.requestedUserIds).toEqual([USER_ID]);
    expect(JSON.stringify(result)).not.toContain("other@example.com");
  });
});

describe("DeleteAccountUseCase", () => {
  async function setup() {
    const clock = new FixedClock(NOW);
    const users = new FakeUserRepository(clock);
    const sessions = new FakeSessionRepository();
    const hasher = new FakePasswordHasher();
    const user = users.seed("STUDENT", { passwordHash: await hasher.hash("right-password") });
    await sessions.create({ userId: user.id, tokenHash: "session-hash", expiresAt: NOW });
    const store = new FakeAccountErasureStore(users, sessions);
    const useCase = new DeleteAccountUseCase(users, hasher, store);
    return { users, sessions, store, useCase, user };
  }

  it("erases the account, its sessions included, when the password matches", async () => {
    const { users, sessions, store, useCase, user } = await setup();

    await expect(useCase.execute({ userId: user.id, password: "right-password" })).resolves.toEqual(
      { deleted: true },
    );

    expect(store.erasedUserIds).toEqual([user.id]);
    expect(await users.findById(user.id)).toBeNull();
    expect(sessions.sessions).toEqual([]);
  });

  it("refuses and erases nothing when the password does not match", async () => {
    const { users, store, useCase, user } = await setup();

    await expect(
      useCase.execute({ userId: user.id, password: "wrong-password" }),
    ).rejects.toBeInstanceOf(AccountDeletionRefusedError);

    expect(store.erasedUserIds).toEqual([]);
    expect(await users.findById(user.id)).not.toBeNull();
  });

  it("is idempotent: an account that is already gone reports deleted: false without erasing", async () => {
    const { store, useCase } = await setup();

    await expect(
      useCase.execute({ userId: "33333333-3333-4333-8333-333333333333", password: "anything" }),
    ).resolves.toEqual({ deleted: false });
    expect(store.erasedUserIds).toEqual([]);
  });

  it("a second request after a successful deletion is a no-op", async () => {
    const { store, useCase, user } = await setup();
    await useCase.execute({ userId: user.id, password: "right-password" });

    await expect(useCase.execute({ userId: user.id, password: "right-password" })).resolves.toEqual(
      { deleted: false },
    );
    expect(store.erasedUserIds).toEqual([user.id]);
  });

  it("propagates a storage failure (the transaction rolled back; nothing is reported as deleted)", async () => {
    const { store, useCase, user } = await setup();
    store.failWith = new Error("database unavailable");

    await expect(useCase.execute({ userId: user.id, password: "right-password" })).rejects.toThrow(
      "database unavailable",
    );
  });

  it("reports deleted: false when the account disappears between the check and the erasure", async () => {
    const { users, store, useCase, user } = await setup();
    store.beforeErase = () => {
      users.users.splice(0, users.users.length);
    };

    await expect(useCase.execute({ userId: user.id, password: "right-password" })).resolves.toEqual(
      { deleted: false },
    );
  });
});

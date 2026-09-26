import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  createGamificationTestDb,
  type GamificationTestDbHandle,
} from "../gamification/db/test-support/create-test-db.js";
import { SqlPersonalDataReadModel } from "./personal-data.read-model.js";
import { seedEveryUserTable } from "./test-support/seed-user-data.js";

let handle: GamificationTestDbHandle;
let readModel: SqlPersonalDataReadModel;

beforeAll(async () => {
  handle = await createGamificationTestDb();
  readModel = new SqlPersonalDataReadModel(handle.identityDb);
});

afterAll(async () => {
  await handle.close();
});

beforeEach(async () => {
  await handle.reset();
});

const at = (iso: string) => new Date(iso);

describe("SqlPersonalDataReadModel", () => {
  it("returns null for an account that does not exist, or a malformed id", async () => {
    expect(await readModel.load("99999999-9999-4999-8999-999999999999")).toBeNull();
    expect(await readModel.load("not-a-uuid")).toBeNull();
  });

  it("reads the user's own rows from every context", async () => {
    const teacher = await handle.seedUser("teacher@example.com", "TEACHER");
    const ana = await handle.seedUser("ana@example.com");
    await seedEveryUserTable(handle, ana, { teacherId: teacher, tag: "ana" });

    const records = await readModel.load(ana);

    expect(records).not.toBeNull();
    expect(records!.account).toMatchObject({
      userId: ana,
      email: "ana@example.com",
      role: "STUDENT",
      emailVerified: false,
    });
    expect(records!.profile).toMatchObject({
      firstName: "First-ana",
      lastName: "Last-ana",
      nickname: "nick-ana",
      avatarId: null,
    });
    expect(records!.lessonProgress).toEqual([
      {
        lessonId: "pl-greetings",
        status: "completed",
        startedAt: at("2026-02-01T00:00:00Z"),
        completedAt: at("2026-02-02T00:00:00Z"),
        updatedAt: at("2026-02-02T00:00:00Z"),
      },
    ]);
    expect(records!.exerciseAttempts).toEqual([
      {
        exerciseId: "pl-greetings-choice",
        submittedAnswer: "answer-ana",
        correct: true,
        answeredAt: at("2026-02-01T01:00:00Z"),
      },
    ]);
    expect(records!.vocabulary).toEqual([
      {
        vocabularyItemId: "pl-vocab-dom",
        status: "learned",
        createdAt: at("2026-02-03T00:00:00Z"),
        updatedAt: at("2026-02-04T00:00:00Z"),
        learnedAt: at("2026-02-04T00:00:00Z"),
      },
    ]);
    expect(records!.phonetics).toEqual([
      {
        phoneticRepresentationId: "pl-ipa-onasal",
        status: "viewed",
        firstViewedAt: at("2026-02-05T00:00:00Z"),
        lastViewedAt: at("2026-02-06T00:00:00Z"),
        practicedAt: null,
        completedAt: null,
      },
    ]);
    expect(records!.pointTransactions).toEqual([
      {
        reason: "exercise-completed",
        sourceId: "pl-greetings-choice",
        amount: 10,
        createdAt: at("2026-02-01T01:00:00Z"),
      },
    ]);
    expect(records!.achievements).toEqual([
      { achievementKey: "first-lesson", unlockedAt: at("2026-02-02T00:00:00Z") },
    ]);
    expect(records!.videoGenerationJobs).toEqual([
      expect.objectContaining({
        videoDefinitionId: "pl-a1-nasal-vowels-demo",
        status: "completed",
        errorCategory: null,
      }),
    ]);
    expect(records!.newsletter).toEqual({
      status: "subscribed",
      consentVersion: "newsletter-consent-v1",
      consentSource: "settings",
      requestedAt: at("2026-03-01T00:00:00Z"),
      confirmedAt: at("2026-03-01T01:00:00Z"),
      unsubscribedAt: null,
    });
    expect(records!.teacherLinks).toEqual([{ linkedAt: at("2026-01-05T00:00:00Z") }]);
    expect(records!.linkedStudentCount).toBe(0);
  });

  it("gives a teacher the number of linked students, never their data", async () => {
    const teacher = await handle.seedUser("teacher@example.com", "TEACHER");
    const ana = await handle.seedUser("ana@example.com");
    const ben = await handle.seedUser("ben@example.com");
    await seedEveryUserTable(handle, ana, { teacherId: teacher, tag: "ana" });
    await seedEveryUserTable(handle, ben, { teacherId: teacher, tag: "ben" });

    const records = await readModel.load(teacher);
    const serialized = JSON.stringify(records);

    expect(records!.linkedStudentCount).toBe(2);
    expect(records!.teacherLinks).toEqual([]);
    for (const leaked of [
      "ana@example.com",
      "ben@example.com",
      "nick-ana",
      "answer-ben",
      ana,
      ben,
    ]) {
      expect(serialized).not.toContain(leaked);
    }
  });

  it("never reads another user's rows", async () => {
    const ana = await handle.seedUser("ana@example.com");
    const ben = await handle.seedUser("ben@example.com");
    await seedEveryUserTable(handle, ana, { tag: "ana" });
    await seedEveryUserTable(handle, ben, { tag: "ben" });

    const serialized = JSON.stringify(await readModel.load(ana));

    for (const leaked of ["ben@example.com", "First-ben", "nick-ben", "answer-ben", ben]) {
      expect(serialized).not.toContain(leaked);
    }
  });

  it("never selects a secret or infrastructure column", async () => {
    const ana = await handle.seedUser("ana@example.com");
    await seedEveryUserTable(handle, ana, { tag: "ana" });

    const serialized = JSON.stringify(await readModel.load(ana));

    for (const secret of [
      "test-only-not-a-real-hash", // users.password_hash
      "session-hash-ana",
      "verify-hash-ana",
      "reset-hash-ana",
      "unsubscribe-key-ana",
      "provider-ref-ana",
      "/srv/media/output-ana.mp4",
      "passwordHash",
      "tokenHash",
      "normalizedEmail",
    ]) {
      expect(serialized).not.toContain(secret);
    }
  });

  it("returns empty collections and null sections for an account with no activity", async () => {
    const ana = await handle.seedUser("ana@example.com");

    const records = await readModel.load(ana);

    expect(records).toMatchObject({
      profile: null,
      newsletter: null,
      lessonProgress: [],
      exerciseAttempts: [],
      vocabulary: [],
      phonetics: [],
      pointTransactions: [],
      achievements: [],
      videoGenerationJobs: [],
      teacherLinks: [],
      linkedStudentCount: 0,
    });
  });
});

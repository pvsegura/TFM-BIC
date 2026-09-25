import { createVideoDefinitionId } from "@tfm-bic/domain";
import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { createVideoTestDb, type VideoTestDbHandle } from "./db/test-support/create-test-db.js";
import { videoGenerationJobs } from "./db/schema.js";
import { DrizzleVideoGenerationJobRepository } from "./video-generation-job.repository.js";

let handle: VideoTestDbHandle;
let repository: DrizzleVideoGenerationJobRepository;

beforeAll(async () => {
  handle = await createVideoTestDb();
  repository = new DrizzleVideoGenerationJobRepository(handle.db);
});

afterEach(async () => {
  await handle.reset();
});

afterAll(async () => {
  await handle.close();
});

const DEFINITION = createVideoDefinitionId("pl-a1-nasal-vowels-demo");
const NIL_UUID = "00000000-0000-0000-0000-000000000000";
const T0 = new Date("2026-01-01T10:00:00.000Z");
const T1 = new Date("2026-01-01T10:05:00.000Z");

function messagesOf(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  while (current instanceof Error) {
    parts.push(current.message);
    current = current.cause;
  }
  return parts.join(" | ");
}

async function expectConstraintViolation(promise: Promise<unknown>, constraint: string) {
  let caught: unknown;
  try {
    await promise;
  } catch (error) {
    caught = error;
  }
  expect(caught, "expected the statement to be rejected").toBeDefined();
  expect(messagesOf(caught)).toContain(constraint);
}

function newJob(userId: string, overrides: Partial<Parameters<typeof repository.create>[0]> = {}) {
  return {
    userId,
    videoDefinitionId: DEFINITION,
    status: "queued" as const,
    providerJobReference: null,
    mediaReference: null,
    errorCategory: null,
    createdAt: T0,
    updatedAt: T0,
    completedAt: null,
    ...overrides,
  };
}

describe("DrizzleVideoGenerationJobRepository", () => {
  describe("create", () => {
    it("inserts a queued job and assigns it an id", async () => {
      const userId = await handle.seedUser();

      const job = await repository.create(newJob(userId));

      expect(job.id).toBeTruthy();
      expect(job.status).toBe("queued");
      expect(job.userId).toBe(userId);
      expect(job.videoDefinitionId).toBe(DEFINITION);
      expect(job.mediaReference).toBeNull();
    });

    it("refuses a job for a video definition id that does not match the domain's slug pattern", async () => {
      const userId = await handle.seedUser();

      await expectConstraintViolation(
        handle.db.insert(videoGenerationJobs).values({
          userId,
          videoDefinitionId: "Not A Valid Id",
          status: "queued",
          createdAt: T0,
          updatedAt: T0,
        }),
        "video_generation_jobs_definition_id_valid",
      );
    });

    it("refuses a completed job with no completedAt, and a non-completed job with one", async () => {
      const userId = await handle.seedUser();

      await expectConstraintViolation(
        handle.db.insert(videoGenerationJobs).values({
          userId,
          videoDefinitionId: DEFINITION,
          status: "completed",
          createdAt: T0,
          updatedAt: T0,
          completedAt: null,
        }),
        "video_generation_jobs_completed_consistent",
      );
      await expectConstraintViolation(
        handle.db.insert(videoGenerationJobs).values({
          userId,
          videoDefinitionId: DEFINITION,
          status: "queued",
          createdAt: T0,
          updatedAt: T0,
          completedAt: T0,
        }),
        "video_generation_jobs_completed_consistent",
      );
    });

    it("refuses a job for a user that does not exist", async () => {
      await expectConstraintViolation(
        repository.create(newJob(NIL_UUID)),
        "video_generation_jobs_user_id_users_id_fk",
      );
    });
  });

  describe("findById", () => {
    it("finds a job by id", async () => {
      const userId = await handle.seedUser();
      const created = await repository.create(newJob(userId));

      const found = await repository.findById(created.id);

      expect(found).toEqual(created);
    });

    it("returns null for a job that does not exist", async () => {
      expect(await repository.findById(NIL_UUID)).toBeNull();
    });
  });

  describe("update", () => {
    it("persists a transition to processing", async () => {
      const userId = await handle.seedUser();
      const created = await repository.create(newJob(userId));

      await repository.update({ ...created, status: "processing", updatedAt: T1 });

      const found = await repository.findById(created.id);
      expect(found?.status).toBe("processing");
      expect(found?.updatedAt).toEqual(T1);
    });

    it("persists a transition to completed, with the provider's result", async () => {
      const userId = await handle.seedUser();
      const created = await repository.create(newJob(userId, { status: "processing" }));

      await repository.update({
        ...created,
        status: "completed",
        providerJobReference: "fake:1",
        mediaReference: "fake:output.mp4",
        updatedAt: T1,
        completedAt: T1,
      });

      const found = await repository.findById(created.id);
      expect(found?.status).toBe("completed");
      expect(found?.providerJobReference).toBe("fake:1");
      expect(found?.mediaReference).toBe("fake:output.mp4");
      expect(found?.completedAt).toEqual(T1);
    });

    it("persists a transition to failed, with a safe error category", async () => {
      const userId = await handle.seedUser();
      const created = await repository.create(newJob(userId, { status: "processing" }));

      await repository.update({
        ...created,
        status: "failed",
        errorCategory: "provider_unavailable",
        updatedAt: T1,
        completedAt: T1,
      });

      const found = await repository.findById(created.id);
      expect(found?.status).toBe("failed");
      expect(found?.errorCategory).toBe("provider_unavailable");
    });
  });

  it("deletes a user's jobs when the user is deleted (ON DELETE CASCADE)", async () => {
    const userId = await handle.seedUser();
    const created = await repository.create(newJob(userId));

    await handle.rawExecute(sql`DELETE FROM "users" WHERE id = ${userId}`);

    expect(await repository.findById(created.id)).toBeNull();
  });
});

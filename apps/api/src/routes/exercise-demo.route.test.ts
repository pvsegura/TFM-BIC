import { loadEnv } from "@verbysia/config";
import { makeContentItem, makeExerciseCatalog } from "@verbysia/application/testing";
import { createContentId, createExerciseId } from "@verbysia/domain";
import { makeTrueFalseExercise } from "@verbysia/domain/testing";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { buildServer } from "../server.js";
import { buildTestDeps } from "../test-support/build-test-deps.js";

const APP_BASE_URL = "https://app.example.com";
const NOW = new Date("2026-01-01T00:00:00.000Z");

let app: FastifyInstance | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
});

function build() {
  const testDeps = buildTestDeps(NOW);
  const catalog = makeExerciseCatalog();
  const paidLesson = makeContentItem("pl-paid", "pl", "a1", { order: 95, access: "course" });
  const paidExercise = makeTrueFalseExercise({
    id: createExerciseId("pl-paid-tf"),
    lessonId: createContentId("pl-paid"),
    order: 10,
  });
  testDeps.contentRepository.catalog = {
    ...catalog,
    content: [...catalog.content, paidLesson],
    exercises: [...catalog.exercises, paidExercise],
  };
  testDeps.exerciseRepository.exercises = [...catalog.exercises, paidExercise];
  app = buildServer(
    loadEnv({ NODE_ENV: "test", APP_BASE_URL, AUTH_SESSION_SECRET: "test-secret-value" }),
    testDeps.appDeps,
  );
  return { app, ...testDeps };
}

describe("free demo exercises (no account)", () => {
  it("lists and opens the exercises of a free lesson without a session", async () => {
    const built = build();
    const list = await built.app.inject({
      method: "GET",
      url: "/public/lessons/pl-first/exercises",
    });
    const one = await built.app.inject({ method: "GET", url: "/public/exercises/pl-first-tf" });

    expect(list.statusCode).toBe(200);
    expect(list.json<{ exercises: { id: string }[] }>().exercises.map((e) => e.id)).toEqual([
      "pl-first-mc",
      "pl-first-text",
      "pl-first-tf",
    ]);
    expect(one.statusCode).toBe(200);
  });

  it("evaluates an answer on the server and stores nothing", async () => {
    const built = build();
    const response = await built.app.inject({
      method: "POST",
      url: "/public/exercises/pl-first-tf/answer",
      headers: { origin: APP_BASE_URL },
      payload: { answer: true },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json<{ correct: boolean }>().correct).toBe(true);
    expect(built.exerciseAttemptRepository.attempts).toEqual([]);
  });

  it("refuses paid lessons and exercises (403) and cross-origin answers", async () => {
    const built = build();
    const list = await built.app.inject({
      method: "GET",
      url: "/public/lessons/pl-paid/exercises",
    });
    const answer = await built.app.inject({
      method: "POST",
      url: "/public/exercises/pl-paid-tf/answer",
      headers: { origin: APP_BASE_URL },
      payload: { answer: true },
    });
    const crossSite = await built.app.inject({
      method: "POST",
      url: "/public/exercises/pl-first-tf/answer",
      headers: { origin: "https://evil.example" },
      payload: { answer: true },
    });

    expect(list.statusCode).toBe(403);
    expect(answer.statusCode).toBe(403);
    expect(crossSite.statusCode).toBe(403);
  });
});

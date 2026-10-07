import { loadEnv } from "@tfm-bic/config";
import type { FastifyInstance } from "fastify";

import { buildServer } from "../server.js";
import { buildTestDeps } from "./build-test-deps.js";

export const TEST_APP_BASE_URL = "http://localhost:5173";

/**
 * The whole API (every route, hook and plugin) over the in-memory test dependencies — for tests
 * that exercise cross-cutting behaviour (headers, errors, limits, route inventory) rather than one
 * route's logic. Environment overrides go through `loadEnv`, so they are validated exactly like
 * real configuration.
 */
export function buildTestServer(
  envOverrides: Record<string, string> = {},
  testDeps = buildTestDeps(),
): { app: FastifyInstance; testDeps: ReturnType<typeof buildTestDeps> } {
  const env = loadEnv({ NODE_ENV: "test", APP_BASE_URL: TEST_APP_BASE_URL, ...envOverrides });
  const app = buildServer(
    env,
    testDeps.deps,
    testDeps.profileDeps,
    testDeps.contentDeps,
    testDeps.lessonDeps,
    testDeps.exerciseDeps,
    testDeps.gamificationDeps,
    testDeps.vocabularyDeps,
    testDeps.phoneticsDeps,
    testDeps.videoDeps,
    testDeps.audioDeps,
    testDeps.teachingDeps,
    testDeps.emailDeps,
    testDeps.privacyDeps,
    testDeps.coachDeps,
  );
  return { app, testDeps };
}

import { loadEnv } from "@tfm-bic/config";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { buildServer } from "../server.js";
import { buildTestDeps } from "../test-support/build-test-deps.js";

const APP_BASE_URL = "https://app.example.com";

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

function build(options: { nodeEnv?: "test" | "development"; inbox?: boolean; issues?: boolean }) {
  const testDeps = buildTestDeps();
  const emailDeps = {
    ...testDeps.emailDeps,
    ...(options.inbox ? { inbox: testDeps.emailProvider } : {}),
    ...(options.issues ? { enableTestSupportRoutes: true } : {}),
  };
  app = buildServer(
    loadEnv({
      NODE_ENV: options.nodeEnv ?? "test",
      APP_BASE_URL,
      AUTH_SESSION_SECRET: "test-secret-value",
      DATABASE_URL: "postgres://unused",
    }),
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
    emailDeps,
    testDeps.privacyDeps,
  );
  return { app, ...testDeps };
}

async function register(built: ReturnType<typeof build>, email: string) {
  await built.app.inject({
    method: "POST",
    url: "/auth/register",
    payload: { email, password: "a-good-password-123" },
  });
}

describe("test-only email routes", () => {
  it("do not exist without an exposed inbox, even under NODE_ENV=test", async () => {
    const built = build({});
    await register(built, "a@example.com");

    const response = await built.app.inject({
      method: "GET",
      url: "/auth/_test/emails?to=a@example.com",
    });

    expect(response.statusCode).toBe(404);
    expect(response.body).not.toContain("token");
  });

  it("do not exist outside NODE_ENV=test, even with an inbox", async () => {
    const built = build({ nodeEnv: "development", inbox: true, issues: true });

    const inbox = await built.app.inject({ method: "GET", url: "/auth/_test/emails?to=a@x.com" });
    const issues = await built.app.inject({
      method: "POST",
      url: "/email-preferences/_test/newsletter-issues",
      payload: { subject: "s", title: "t", paragraphs: ["p"] },
    });

    expect(inbox.statusCode).toBe(404);
    expect(issues.statusCode).toBe(404);
  });

  it("return the latest captured email with its links, keeping M3's `kind`/`url` fields", async () => {
    const built = build({ inbox: true });
    await register(built, "a@example.com");

    const response = await built.app.inject({
      method: "GET",
      url: "/auth/_test/emails?to=a@example.com",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{ kind: string; template: string; url: string; links: string[] }>();
    expect(body.kind).toBe("verification");
    expect(body.template).toBe("email-verification");
    expect(body.url).toMatch(/^https:\/\/app\.example\.com\/verify-email\?token=/);
    expect(body.links[0]).toBe(body.url);
  });

  it("validate the query", async () => {
    const built = build({ inbox: true });

    const missing = await built.app.inject({ method: "GET", url: "/auth/_test/emails" });
    const badTemplate = await built.app.inject({
      method: "GET",
      url: "/auth/_test/emails?to=a@example.com&template=nope",
    });
    const none = await built.app.inject({
      method: "GET",
      url: "/auth/_test/emails?to=nobody@example.com&template=password-reset",
    });

    expect(missing.statusCode).toBe(400);
    expect(badTemplate.statusCode).toBe(400);
    expect(none.statusCode).toBe(404);
  });

  it("send a newsletter issue only when the E2E composition enables it", async () => {
    const withoutFlag = build({ inbox: true });
    const refused = await withoutFlag.app.inject({
      method: "POST",
      url: "/email-preferences/_test/newsletter-issues",
      payload: { subject: "s", title: "t", paragraphs: ["p"] },
    });
    expect(refused.statusCode).toBe(404);
    await app?.close();

    const built = build({ inbox: true, issues: true });
    const invalid = await built.app.inject({
      method: "POST",
      url: "/email-preferences/_test/newsletter-issues",
      payload: { subject: "s", title: "t", paragraphs: [1] },
    });
    const sent = await built.app.inject({
      method: "POST",
      url: "/email-preferences/_test/newsletter-issues",
      payload: { subject: "News", title: "Title", paragraphs: ["Body"] },
    });

    expect(invalid.statusCode).toBe(400);
    expect(sent.statusCode).toBe(200);
    expect(sent.json()).toEqual({ recipients: 0, accepted: 0, failed: 0 });
  });
});

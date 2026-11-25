import type { ResolveShortLinkUseCase } from "@verbysia/application";
import { loadEnv } from "@verbysia/config";
import Fastify from "fastify";
import { describe, expect, it } from "vitest";

import { registerShortLinkRoutes } from "./short-links.route.js";

function build(paths: Record<string, string>) {
  const app = Fastify();
  const resolve = {
    execute: ({ course, unit, target }: { course: string; unit: string; target?: string }) =>
      Promise.resolve(paths[[course, unit, target].filter(Boolean).join("/")] ?? null),
  } as unknown as ResolveShortLinkUseCase;
  registerShortLinkRoutes(app, {
    resolve,
    env: loadEnv({ NODE_ENV: "test", APP_BASE_URL: "http://localhost:5173" }),
  });
  return app;
}

describe("GET /k/... (book short links)", () => {
  it("redirects temporarily to the resolved page, without caching", async () => {
    const app = build({ "es-a1/3": "/learn/lessons/es-unit-3-places" });
    const response = await app.inject({ method: "GET", url: "/k/es-a1/3" });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe("/learn/lessons/es-unit-3-places");
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("handles section and exercise targets", async () => {
    const app = build({ "es-a1/3/14": "/learn/exercises/es-u3-x" });
    const response = await app.inject({ method: "GET", url: "/k/es-a1/3/14" });
    expect(response.headers.location).toBe("/learn/exercises/es-u3-x");
  });

  it("sends a link that does not resolve to the lessons list, never to an error page", async () => {
    const app = build({});
    const response = await app.inject({ method: "GET", url: "/k/es-a1/99" });
    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe("/learn/lessons");
  });
});

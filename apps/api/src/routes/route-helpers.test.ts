import type { User } from "@verbysia/domain";
import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import type { MappedCatalogError } from "./catalog-error.mapper.js";
import { INVALID_REQUEST, privateResponse, sessionUserId } from "./route-helpers.js";

class KnownError extends Error {}

function mapKnown(error: unknown): MappedCatalogError {
  if (error instanceof KnownError) return { statusCode: 404, body: { error: "Not here." } };
  throw error;
}

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

function serve(run: () => Promise<unknown>) {
  app = Fastify();
  app.get("/", (_request, reply) => privateResponse(reply, mapKnown, run));
  return app.inject({ method: "GET", url: "/" });
}

describe("privateResponse", () => {
  it("returns the result, marked so that no shared cache keeps it", async () => {
    const response = await serve(() => Promise.resolve({ ok: true }));

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
    expect(response.headers["cache-control"]).toBe("private, no-store");
  });

  it("answers a known error with the route's mapped status and fixed body", async () => {
    const response = await serve(() => Promise.reject(new KnownError("secret detail")));

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "Not here." });
  });

  it("leaves an unknown error to Fastify's central handler", async () => {
    const response = await serve(() => Promise.reject(new Error("boom")));

    expect(response.statusCode).toBe(500);
  });
});

describe("sessionUserId", () => {
  it("is the authenticated user's id", () => {
    const request = { currentUser: { id: "user-1" } as User } as FastifyRequest;

    expect(sessionUserId(request)).toBe("user-1");
  });

  it("fails loudly when a handler runs without one", () => {
    const request = { method: "GET", url: "/lessons" } as FastifyRequest;

    expect(() => sessionUserId(request)).toThrow("GET /lessons ran without an authenticated user.");
  });
});

describe("INVALID_REQUEST", () => {
  it("is the one fixed body for a request that does not match its schema", () => {
    expect(INVALID_REQUEST).toEqual({ error: "Invalid request." });
  });
});

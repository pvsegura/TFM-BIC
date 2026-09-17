import type { User } from "@tfm-bic/domain";
import type { FastifyReply, FastifyRequest } from "fastify";
import { describe, expect, it } from "vitest";

import { createRequireRoleHook } from "./require-role.js";

function fakeUser(role: "STUDENT" | "TEACHER"): User {
  return {
    id: "user-1",
    email: "user@example.com",
    normalizedEmail: "user@example.com",
    passwordHash: "hashed",
    role,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function fakeReply() {
  const state: { statusCode?: number; body?: unknown } = {};
  const reply = {
    code(statusCode: number) {
      state.statusCode = statusCode;
      return reply;
    },
    send(body: unknown) {
      state.body = body;
      return reply;
    },
  } as unknown as FastifyReply;
  return { reply, state };
}

describe("createRequireRoleHook", () => {
  it("allows a request whose user has an allowed role", async () => {
    const hook = createRequireRoleHook(["TEACHER"]);
    const request = { currentUser: fakeUser("TEACHER") } as FastifyRequest;
    const { reply, state } = fakeReply();

    await hook(request, reply);

    expect(state.statusCode).toBeUndefined();
  });

  it("replies 403 for an authenticated user with the wrong role", async () => {
    const hook = createRequireRoleHook(["TEACHER"]);
    const request = { currentUser: fakeUser("STUDENT") } as FastifyRequest;
    const { reply, state } = fakeReply();

    await hook(request, reply);

    expect(state.statusCode).toBe(403);
  });

  it("replies 401 when there is no authenticated user at all", async () => {
    const hook = createRequireRoleHook(["TEACHER"]);
    const request = {} as FastifyRequest;
    const { reply, state } = fakeReply();

    await hook(request, reply);

    expect(state.statusCode).toBe(401);
  });

  it("a self-reported role on the request body cannot substitute for currentUser.role", async () => {
    // `currentUser` only ever comes from `authenticate` resolving a real
    // session server-side — this test documents that the hook has no code
    // path that reads anything else (e.g. request.body.role).
    const hook = createRequireRoleHook(["TEACHER"]);
    const request = {
      currentUser: fakeUser("STUDENT"),
      body: { role: "TEACHER" },
    } as unknown as FastifyRequest;
    const { reply, state } = fakeReply();

    await hook(request, reply);

    expect(state.statusCode).toBe(403);
  });
});

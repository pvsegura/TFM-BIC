import type { User } from "@tfm-bic/domain";
import type { FastifyReply, FastifyRequest } from "fastify";
import { describe, expect, it } from "vitest";

import { SESSION_COOKIE_NAME } from "../constants/session-cookie.js";
import { createAuthenticateHook } from "./authenticate.js";

const fakeUser: User = {
  id: "user-1",
  email: "user@example.com",
  normalizedEmail: "user@example.com",
  passwordHash: "hashed",
  role: "STUDENT",
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

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

function fakeRequest(options: {
  rawCookie?: string;
  unsign?: (value: string) => { valid: boolean; value: string | null };
}): FastifyRequest {
  return {
    cookies: options.rawCookie ? { [SESSION_COOKIE_NAME]: options.rawCookie } : {},
    unsignCookie: options.unsign ?? ((value: string) => ({ valid: true, renew: false, value })),
  } as unknown as FastifyRequest;
}

describe("createAuthenticateHook", () => {
  it("sets request.currentUser for a valid session cookie", async () => {
    const resolveSession = { execute: () => Promise.resolve(fakeUser) };
    const hook = createAuthenticateHook(resolveSession as never);
    const request = fakeRequest({ rawCookie: "signed-value" });
    const { reply, state } = fakeReply();

    await hook(request, reply);

    expect(request.currentUser).toBe(fakeUser);
    expect(state.statusCode).toBeUndefined();
  });

  it("replies 401 when there is no session cookie", async () => {
    const resolveSession = { execute: () => Promise.resolve(fakeUser) };
    const hook = createAuthenticateHook(resolveSession as never);
    const request = fakeRequest({});
    const { reply, state } = fakeReply();

    await hook(request, reply);

    expect(state.statusCode).toBe(401);
    expect(request.currentUser).toBeUndefined();
  });

  it("replies 401 for a cookie that fails signature verification", async () => {
    const resolveSession = { execute: () => Promise.resolve(fakeUser) };
    const hook = createAuthenticateHook(resolveSession as never);
    const request = fakeRequest({
      rawCookie: "tampered-value",
      unsign: () => ({ valid: false, value: null }),
    });
    const { reply, state } = fakeReply();

    await hook(request, reply);

    expect(state.statusCode).toBe(401);
  });

  it("replies 401 when the session is valid-signed but not found/expired (resolveSession returns null)", async () => {
    const resolveSession = { execute: () => Promise.resolve(null) };
    const hook = createAuthenticateHook(resolveSession as never);
    const request = fakeRequest({ rawCookie: "signed-value" });
    const { reply, state } = fakeReply();

    await hook(request, reply);

    expect(state.statusCode).toBe(401);
  });
});

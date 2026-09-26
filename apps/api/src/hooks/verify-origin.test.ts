import type { FastifyReply, FastifyRequest } from "fastify";
import { describe, expect, it } from "vitest";

import { createVerifyOriginHook } from "./verify-origin.js";

const APP_BASE_URL = "https://app.example.com";

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

async function run(headers: Record<string, string>) {
  const hook = createVerifyOriginHook(APP_BASE_URL);
  const { reply, state } = fakeReply();
  await hook({ headers } as unknown as FastifyRequest, reply);
  return state.statusCode;
}

describe("createVerifyOriginHook", () => {
  it("allows a request from the application's own origin", async () => {
    expect(await run({ origin: APP_BASE_URL })).toBeUndefined();
  });

  it("refuses a request from another origin with 403", async () => {
    expect(await run({ origin: "https://evil.example" })).toBe(403);
  });

  it("refuses a look-alike origin (prefix/suffix tricks)", async () => {
    expect(await run({ origin: "https://app.example.com.evil.example" })).toBe(403);
    expect(await run({ origin: "http://app.example.com" })).toBe(403);
    expect(await run({ origin: "null" })).toBe(403);
  });

  it("allows a request without Origin or Fetch Metadata (a non-browser client carries no ambient cookie)", async () => {
    expect(await run({})).toBeUndefined();
  });

  describe("Fetch Metadata fallback when Origin is absent (M16, S-13)", () => {
    it.each(["cross-site", "same-site"])("refuses Sec-Fetch-Site: %s", async (site) => {
      expect(await run({ "sec-fetch-site": site })).toBe(403);
    });

    it.each(["same-origin", "none"])("allows Sec-Fetch-Site: %s", async (site) => {
      expect(await run({ "sec-fetch-site": site })).toBeUndefined();
    });

    it("still refuses a foreign Origin even when Sec-Fetch-Site claims same-origin", async () => {
      expect(await run({ origin: "https://evil.example", "sec-fetch-site": "same-origin" })).toBe(
        403,
      );
    });
  });
});

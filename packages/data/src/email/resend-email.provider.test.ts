import { EmailDeliveryError, type OutgoingEmail } from "@tfm-bic/application";
import { describe, expect, it, vi } from "vitest";

import { ResendEmailProvider } from "./resend-email.provider.js";

const API_KEY = "re_test_key_never_real";

function message(overrides: Partial<OutgoingEmail> = {}): OutgoingEmail {
  return {
    to: "ada@example.com",
    from: "Verbysia <no-reply@verbysia.com>",
    replyTo: null,
    subject: "Verify your email address",
    html: "<p>Hi</p>",
    text: "Hi",
    category: "transactional",
    template: "email-verification",
    listUnsubscribeUrl: null,
    ...overrides,
  };
}

function respond(status: number, body: unknown = { id: "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794" }) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function build(responses: (Response | Error)[], options: { timeoutMs?: number } = {}) {
  const queue = [...responses];
  const fetchFn = vi.fn((_url: string | URL | Request, _init?: RequestInit) => {
    const next = queue.shift();
    if (next === undefined) {
      throw new Error("unexpected extra request");
    }
    return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
  });
  const provider = new ResendEmailProvider({
    apiKey: API_KEY,
    userAgent: "verbysia-api/test",
    fetch: fetchFn,
    retryDelaysMs: [0, 0],
    ...options,
  });
  return { provider, fetchFn };
}

function requestOf(fetchFn: ReturnType<typeof build>["fetchFn"], index = 0) {
  const [url, init] = fetchFn.mock.calls[index]!;
  const headers = new Headers(init?.headers);
  return {
    url: url as string,
    init: init!,
    headers,
    body: JSON.parse(init!.body as string) as Record<string, unknown>,
  };
}

describe("ResendEmailProvider", () => {
  it("POSTs to the documented endpoint with Bearer auth, a User-Agent and an idempotency key", async () => {
    const { provider, fetchFn } = build([respond(200)]);

    await provider.send(message());

    const { url, init, headers } = requestOf(fetchFn);
    expect(provider.name).toBe("resend");
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect(headers.get("authorization")).toBe(`Bearer ${API_KEY}`);
    expect(headers.get("user-agent")).toBe("verbysia-api/test");
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("idempotency-key")).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("maps the message onto Resend's fields, with category/template tags", async () => {
    const { provider, fetchFn } = build([respond(200)]);

    await provider.send(message({ replyTo: "help@verbysia.com" }));

    expect(requestOf(fetchFn).body).toEqual({
      from: "Verbysia <no-reply@verbysia.com>",
      to: ["ada@example.com"],
      subject: "Verify your email address",
      html: "<p>Hi</p>",
      text: "Hi",
      reply_to: "help@verbysia.com",
      tags: [
        { name: "category", value: "transactional" },
        { name: "template", value: "email-verification" },
      ],
    });
  });

  it("adds the RFC 8058 one-click unsubscribe headers to marketing email only", async () => {
    const { provider, fetchFn } = build([respond(200), respond(200)]);
    const url = "https://www.verbysia.com/email-preferences/newsletter/unsubscribe?token=k.sig";

    await provider.send(
      message({ category: "marketing", template: "newsletter-issue", listUnsubscribeUrl: url }),
    );
    await provider.send(message());

    expect(requestOf(fetchFn, 0).body.headers).toEqual({
      "List-Unsubscribe": `<${url}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
    expect(requestOf(fetchFn, 1).body).not.toHaveProperty("headers");
  });

  it.each([
    [403, "validation_error"],
    [401, "missing_api_key"],
    [422, "invalid_parameter"],
    [429, "daily_quota_exceeded"],
  ])("does not retry a %i %s and reports a log-safe reason", async (status, name) => {
    const { provider, fetchFn } = build([
      respond(status, {
        statusCode: status,
        name,
        message: "The ada@example.com domain is not verified",
      }),
    ]);

    const error = await provider.send(message()).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(EmailDeliveryError);
    expect((error as EmailDeliveryError).reason).toBe(`http_${String(status)}:${name}`);
    expect(String((error as EmailDeliveryError).reason)).not.toContain("ada@");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it.each([
    [429, "rate_limit_exceeded"],
    [500, "application_error"],
    [503, "service_unavailable"],
  ])("retries a transient %i %s with the same idempotency key", async (status, name) => {
    const { provider, fetchFn } = build([respond(status, { name }), respond(200)]);

    await provider.send(message());

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(requestOf(fetchFn, 1).headers.get("idempotency-key")).toBe(
      requestOf(fetchFn, 0).headers.get("idempotency-key"),
    );
  });

  it("retries a network failure, at most twice, then gives up", async () => {
    const { provider, fetchFn } = build([
      new TypeError("fetch failed"),
      new TypeError("fetch failed"),
      new TypeError("fetch failed"),
    ]);

    const error = await provider.send(message()).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(EmailDeliveryError);
    expect((error as EmailDeliveryError).reason).toBe("network");
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it("reports a timeout as its own reason", async () => {
    const timeout = new DOMException("The operation was aborted due to timeout", "TimeoutError");
    const { provider } = build([timeout, timeout, timeout]);

    const error = await provider.send(message()).catch((e: unknown) => e);

    expect((error as EmailDeliveryError).reason).toBe("timeout");
  });

  it("uses a bare status when the error body is not the expected shape", async () => {
    const { provider } = build([new Response("<html>bad gateway</html>", { status: 403 })]);

    const error = await provider.send(message()).catch((e: unknown) => e);

    expect((error as EmailDeliveryError).reason).toBe("http_403");
  });

  it("never puts the API key in an error", async () => {
    const { provider } = build([respond(401, { name: "missing_api_key" })]);

    const error = await provider.send(message()).catch((e: unknown) => e);

    expect(JSON.stringify(error)).not.toContain(API_KEY);
    expect(String(error)).not.toContain(API_KEY);
  });

  it("refuses to be built without an API key", () => {
    expect(() => new ResendEmailProvider({ apiKey: "", userAgent: "x" })).toThrow(/API key/);
  });
});

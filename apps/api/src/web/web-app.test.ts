import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { brotliDecompressSync, gunzipSync } from "node:zlib";

import { CONTENT_SECURITY_POLICY } from "@tfm-bic/contracts";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { buildTestServer } from "../test-support/build-test-server.js";

/**
 * M17 (ADR-028): in staging/production the API also serves the built SPA, from the same origin —
 * with the SPA's own security headers, immutable caching for hashed assets, the page-vs-API split
 * for /profile, and nothing outside the build directory ever reachable.
 */

const INDEX_HTML =
  '<!doctype html><html><head><script type="module" src="/assets/index-AbC123.js"></script></head><body><div id="root"></div></body></html>';
const APP_JS = `console.log(${JSON.stringify("x".repeat(4096))});`;

let root: string;
let distDir: string;
let app: FastifyInstance | undefined;

beforeAll(() => {
  root = mkdtempSync(path.join(tmpdir(), "tfm-web-"));
  distDir = path.join(root, "dist");
  mkdirSync(path.join(distDir, "assets"), { recursive: true });
  writeFileSync(path.join(distDir, "index.html"), INDEX_HTML);
  writeFileSync(path.join(distDir, "assets", "index-AbC123.js"), APP_JS);
  writeFileSync(path.join(distDir, "assets", "index-DeF456.css"), "body{margin:0}");
  writeFileSync(path.join(distDir, "favicon.svg"), "<svg xmlns='http://www.w3.org/2000/svg'/>");
  writeFileSync(path.join(distDir, "assets", "index-AbC123.js.map"), "{}");
  writeFileSync(path.join(distDir, ".env"), "SECRET=never-served");
  writeFileSync(path.join(root, "outside.txt"), "outside the build directory");
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

afterEach(async () => {
  await app?.close();
  app = undefined;
});

function server(envOverrides: Record<string, string> = {}): FastifyInstance {
  app = buildTestServer({ WEB_DIST_DIR: distDir, ...envOverrides }).app;
  return app;
}

const NAVIGATION = { accept: "text/html,application/xhtml+xml", "sec-fetch-dest": "document" };

describe("the SPA shell", () => {
  it("serves index.html at / with the SPA's security headers and no long-lived cache", async () => {
    const response = await server().inject({ method: "GET", url: "/", headers: NAVIGATION });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("text/html; charset=utf-8");
    expect(response.body).toBe(INDEX_HTML);
    expect(response.headers["content-security-policy"]).toBe(CONTENT_SECURITY_POLICY);
    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["referrer-policy"]).toBe("no-referrer");
    expect(response.headers["permissions-policy"]).toContain("camera=()");
    expect(response.headers["cross-origin-opener-policy"]).toBe("same-origin");
    expect(response.headers["cache-control"]).toBe("no-cache");
    expect(response.headers["x-request-id"]).toBeDefined();
  });

  it.each(["/learn/lessons/pl-a1-01", "/dashboard", "/privacy", "/newsletter/confirm"])(
    "answers a browser navigation to the client-side route %s with the shell",
    async (url) => {
      const response = await server().inject({ method: "GET", url, headers: NAVIGATION });

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe(INDEX_HTML);
      expect(response.headers["content-security-policy"]).toBe(CONTENT_SECURITY_POLICY);
    },
  );

  it("keeps JSON 404s for anything that is not a page navigation", async () => {
    const fetchLike = await server().inject({
      method: "GET",
      url: "/does-not-exist",
      headers: { accept: "application/json" },
    });
    const post = await server().inject({ method: "POST", url: "/nope", headers: NAVIGATION });

    for (const response of [fetchLike, post]) {
      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({ error: "Not found." });
    }
  });

  it("answers HEAD like GET, without a body", async () => {
    const response = await server().inject({ method: "HEAD", url: "/" });

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe("");
  });
});

describe("/profile — one path, a page and an API (like the Vite dev proxy)", () => {
  it("serves the shell to a browser navigation", async () => {
    const response = await server().inject({ method: "GET", url: "/profile", headers: NAVIGATION });

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe(INDEX_HTML);
  });

  it("routes the app's own JSON request to the API (401 without a session)", async () => {
    const response = await server().inject({
      method: "GET",
      url: "/profile",
      headers: { accept: "application/json" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.headers["content-security-policy"]).toBe(
      "default-src 'none'; frame-ancestors 'none'",
    );
  });
});

describe("static assets", () => {
  it("serves hashed assets with their type and an immutable one-year cache", async () => {
    const response = await server().inject({ method: "GET", url: "/assets/index-AbC123.js" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("text/javascript; charset=utf-8");
    expect(response.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
    expect(response.body).toBe(APP_JS);
  });

  it("serves other root files with a short cache", async () => {
    const response = await server().inject({ method: "GET", url: "/favicon.svg" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("image/svg+xml");
    expect(response.headers["cache-control"]).toBe("public, max-age=3600");
  });

  it.each([
    ["br", (body: Buffer) => brotliDecompressSync(body)],
    ["gzip", (body: Buffer) => gunzipSync(body)],
  ] as const)(
    "sends a precompressed %s variant when the client accepts it",
    async (encoding, decode) => {
      const response = await server().inject({
        method: "GET",
        url: "/assets/index-AbC123.js",
        headers: { "accept-encoding": `${encoding}, identity` },
      });

      expect(response.headers["content-encoding"]).toBe(encoding);
      expect(response.headers.vary).toContain("Accept-Encoding");
      expect(decode(response.rawPayload).toString()).toBe(APP_JS);
    },
  );

  it("sends the identity encoding when the client refuses compression", async () => {
    const response = await server().inject({
      method: "GET",
      url: "/assets/index-AbC123.js",
      headers: { "accept-encoding": "br;q=0, gzip;q=0" },
    });

    expect(response.headers["content-encoding"]).toBeUndefined();
    expect(response.body).toBe(APP_JS);
  });
});

describe("nothing outside the build is reachable", () => {
  it.each([
    "/.env",
    "/assets/index-AbC123.js.map",
    "/../outside.txt",
    "/%2e%2e/outside.txt",
    "/assets/..%2f..%2foutside.txt",
  ])("GET %s is a 404 that leaks nothing", async (url) => {
    const response = await server().inject({
      method: "GET",
      url,
      headers: { accept: "application/json" },
    });

    expect(response.statusCode).toBe(404);
    expect(response.body).not.toContain("never-served");
    expect(response.body).not.toContain("outside the build directory");
  });
});

describe("API routes are unaffected", () => {
  it("keeps the API's own headers on /health", async () => {
    const response = await server().inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-security-policy"]).toBe(
      "default-src 'none'; frame-ancestors 'none'",
    );
  });
});

describe("configuration", () => {
  it("serves nothing when WEB_DIST_DIR is unset (development/test: Vite serves the SPA)", async () => {
    app = buildTestServer().app;

    const response = await app.inject({ method: "GET", url: "/", headers: NAVIGATION });

    expect(response.statusCode).toBe(404);
  });

  it("refuses to start when WEB_DIST_DIR has no index.html", () => {
    expect(() => buildTestServer({ WEB_DIST_DIR: path.join(root, "missing") })).toThrow(
      /WEB_DIST_DIR/,
    );
  });

  it("adds HSTS to the SPA's responses in staging", async () => {
    const response = await server({
      NODE_ENV: "staging",
      DATABASE_URL: "postgres://app:pass@db.internal:5432/tfm",
      AUTH_SESSION_SECRET: "s".repeat(32),
      EMAIL_LINK_SECRET: "e".repeat(32),
      APP_BASE_URL: "https://staging.example.com",
    }).inject({ method: "GET", url: "/" });

    expect(response.headers["strict-transport-security"]).toBe(
      "max-age=31536000; includeSubDomains",
    );
  });
});

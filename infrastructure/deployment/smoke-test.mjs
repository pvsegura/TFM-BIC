#!/usr/bin/env node
// Post-deployment smoke test (M17) for a running TFM-BIC instance — staging or production.
// Plain Node 24 (built-in fetch), no dependencies, so Jenkins or an operator can run it anywhere:
//
//   SMOKE_BASE_URL=https://app.example.com node infrastructure/deployment/smoke-test.mjs
//
// Environment:
//   SMOKE_BASE_URL          (required) where to send requests, e.g. https://app.example.com or
//                           http://127.0.0.1:18080 for a local container.
//   SMOKE_ORIGIN            the public origin (APP_BASE_URL) — sent as Origin on writes. Defaults
//                           to SMOKE_BASE_URL's origin; set it when testing through a local port.
//   SMOKE_EXPECTED_VERSION  when set, GET /health must report exactly this APP_VERSION.
//   SMOKE_EMAIL / SMOKE_PASSWORD
//                           a DEDICATED smoke-test account, injected from the secret store — never
//                           a person's account. Without them only the anonymous checks run.
//   SMOKE_REGISTER=true     staging only: register a disposable account first. Never in production.
//   SMOKE_ALLOW_WRITES=true also start a lesson and answer one exercise (writes progress rows for the
//                           smoke account only). Default: read-only — safe against production.
//
// Never prints a password, cookie or token. Exit code 0 = every check passed, 1 = a check failed.

const baseUrl = process.env.SMOKE_BASE_URL?.replace(/\/+$/, "");
if (!baseUrl) {
  console.error("SMOKE_BASE_URL is required.");
  process.exit(2);
}
const origin = process.env.SMOKE_ORIGIN ?? new URL(baseUrl).origin;
const expectedVersion = process.env.SMOKE_EXPECTED_VERSION;
const allowWrites = process.env.SMOKE_ALLOW_WRITES === "true";
let email = process.env.SMOKE_EMAIL;
let password = process.env.SMOKE_PASSWORD;

const results = [];
let cookie;

async function request(path, { method = "GET", headers = {}, body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
    headers: {
      accept: "application/json",
      ...(cookie ? { cookie } : {}),
      ...(body !== undefined ? { "content-type": "application/json", origin } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }
  return { status: response.status, headers: response.headers, text, json };
}

async function check(name, fn) {
  const startedAt = performance.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Math.round(performance.now() - startedAt) });
  } catch (error) {
    results.push({
      name,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/** 403 on a write almost always means the server's APP_BASE_URL is not this origin. */
function statusMessage(res) {
  return res.status === 403
    ? `status 403 — the server refused Origin ${origin}: set APP_BASE_URL on the server to exactly that origin`
    : `status ${res.status}`;
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

// --- Anonymous checks: safe everywhere -----------------------------------------------------------

await check("GET /health is ok (liveness)", async () => {
  const res = await request("/health");
  expect(res.status === 200 && res.json?.status === "ok", `status ${res.status}`);
  if (expectedVersion) {
    expect(
      res.json.version === expectedVersion,
      `version ${res.json.version} ≠ ${expectedVersion}`,
    );
  }
});

await check("GET /ready is ready (database reachable)", async () => {
  const res = await request("/ready");
  expect(res.status === 200 && res.json?.ready === true, `status ${res.status}`);
});

let assetPath;
await check("GET / serves the SPA with its security headers", async () => {
  const res = await request("/", { headers: { accept: "text/html" } });
  expect(res.status === 200, `status ${res.status}`);
  expect(res.text.includes('id="root"'), "no SPA root element");
  const csp = res.headers.get("content-security-policy") ?? "";
  expect(
    csp.includes("script-src 'self'") && csp.includes("frame-ancestors 'none'"),
    "SPA CSP missing",
  );
  expect(res.headers.get("x-frame-options") === "DENY", "X-Frame-Options missing");
  expect(res.headers.get("x-content-type-options") === "nosniff", "nosniff missing");
  expect((res.headers.get("strict-transport-security") ?? "").includes("max-age="), "HSTS missing");
  assetPath = /src="(\/assets\/[^"]+\.js)"/.exec(res.text)?.[1];
});

await check("the SPA's JavaScript bundle loads with an immutable cache", async () => {
  expect(assetPath, "index.html references no /assets/*.js");
  const res = await request(assetPath, { headers: { accept: "*/*" } });
  expect(res.status === 200, `status ${res.status}`);
  expect((res.headers.get("cache-control") ?? "").includes("immutable"), "not immutable");
});

await check("a client-side route (deep link) gets the SPA", async () => {
  const res = await request("/learn", { headers: { accept: "text/html" } });
  expect(res.status === 200 && res.text.includes('id="root"'), `status ${res.status}`);
});

await check("GET /languages (public catalog, read from the content bundle)", async () => {
  const res = await request("/languages");
  expect(res.status === 200 && Array.isArray(res.json?.languages), `status ${res.status}`);
  expect(res.json.languages.length > 0, "no languages");
});

await check("no CORS grant to a foreign origin", async () => {
  const res = await request("/languages", { headers: { origin: "https://evil.example" } });
  expect(
    res.headers.get("access-control-allow-origin") === null,
    "Access-Control-Allow-Origin sent",
  );
});

await check("a state-changing request from a foreign origin is refused", async () => {
  const res = await request("/auth/login", {
    method: "POST",
    body: { email: "nobody@example.invalid", password: "x".repeat(12) },
    headers: { origin: "https://evil.example" },
  });
  expect(res.status === 403, `status ${res.status}`);
});

// --- Authenticated checks: only with a dedicated smoke account ------------------------------------

if (process.env.SMOKE_REGISTER === "true" && !email) {
  email = `smoke-${Date.now()}@example.invalid`;
  password = `smoke-${crypto.randomUUID()}`;
  await check("register a disposable smoke account (staging)", async () => {
    const res = await request("/auth/register", { method: "POST", body: { email, password } });
    expect(res.status === 200, statusMessage(res));
  });
}

if (email && password) {
  await check("login", async () => {
    const res = await request("/auth/login", { method: "POST", body: { email, password } });
    expect(res.status === 200, statusMessage(res));
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(
      /HttpOnly/i.test(setCookie) && /Secure/i.test(setCookie),
      "session cookie not HttpOnly+Secure",
    );
    expect(/SameSite=Strict/i.test(setCookie), "session cookie not SameSite=Strict");
    cookie = setCookie.split(";", 1)[0];
  });

  await check("GET /auth/me (authenticated)", async () => {
    const res = await request("/auth/me");
    expect(res.status === 200 && typeof res.json?.id === "string", `status ${res.status}`);
  });

  await check("GET /profile (API, not the page)", async () => {
    const res = await request("/profile");
    expect(res.status === 200 && typeof res.json?.userId === "string", `status ${res.status}`);
  });

  let lessonId;
  await check("GET /lessons (database read)", async () => {
    const res = await request("/lessons?language=pl&level=a1");
    expect(res.status === 200 && Array.isArray(res.json?.lessons), `status ${res.status}`);
    lessonId = res.json.lessons[0]?.id;
    expect(lessonId, "no lessons");
  });

  let exercise;
  await check("GET /lessons/:id/exercises", async () => {
    expect(lessonId, "skipped: no lesson id (an earlier check failed)");
    const res = await request(`/lessons/${lessonId}/exercises`);
    expect(res.status === 200 && Array.isArray(res.json?.exercises), `status ${res.status}`);
    exercise = res.json.exercises.find((e) => e.type === "true-false") ?? res.json.exercises[0];
    expect(exercise, "no exercises");
  });

  await check("GET /gamification/summary", async () => {
    const res = await request("/gamification/summary");
    expect(res.status === 200 && typeof res.json?.totalPoints === "number", `status ${res.status}`);
  });

  if (allowWrites) {
    await check("POST /lessons/:id/start (write)", async () => {
      expect(lessonId, "skipped: no lesson id (an earlier check failed)");
      const res = await request(`/lessons/${lessonId}/start`, { method: "POST", body: {} });
      expect(res.status === 200, `status ${res.status}`);
    });

    await check("POST /exercises/:id/answer (write, evaluated by the server)", async () => {
      expect(exercise, "skipped: no exercise (an earlier check failed)");
      const answer = exercise.type === "true-false" ? true : "smoke";
      const res = await request(`/exercises/${exercise.id}/answer`, {
        method: "POST",
        body: { answer },
      });
      expect(res.status === 200 && typeof res.json?.correct === "boolean", `status ${res.status}`);
    });
  }

  await check("logout, and the session is gone", async () => {
    const res = await request("/auth/logout", { method: "POST", headers: { origin } });
    expect(res.status === 204, `logout status ${res.status}`);
    const after = await request("/auth/me");
    expect(after.status === 401, `after logout: status ${after.status}`);
  });
}

// --- Report ----------------------------------------------------------------------------------------

for (const r of results) {
  console.log(r.ok ? `PASS  ${r.name} (${r.ms} ms)` : `FAIL  ${r.name}: ${r.error}`);
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed against ${origin}.`);
process.exit(failed === 0 ? 0 : 1);

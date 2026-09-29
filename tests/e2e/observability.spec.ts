import { expect, test } from "@playwright/test";

/** The API the E2E web server proxies to (playwright.config.ts). */
const API = "http://localhost:3000";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test("probes answer, and every response carries its own request id for log correlation (M18)", async ({
  request,
}) => {
  const health = await request.get(`${API}/health`);
  const ready = await request.get(`${API}/ready`);

  expect(health.status()).toBe(200);
  expect(await health.json()).toMatchObject({
    status: "ok",
    version: expect.any(String),
  });
  expect(ready.status()).toBe(200);
  expect(await ready.json()).toEqual({ ready: true });

  const ids = [health.headers()["x-request-id"], ready.headers()["x-request-id"]];
  for (const id of ids) {
    expect(id).toMatch(UUID);
  }
  expect(ids[0]).not.toBe(ids[1]);

  // A client-chosen id is never adopted (it could forge correlation).
  const forged = await request.get(`${API}/health`, { headers: { "x-request-id": "forged-id" } });
  expect(forged.headers()["x-request-id"]).toMatch(UUID);
});

test("an unhandled error in the SPA is reported to the API with no message or stack (M18)", async ({
  page,
}) => {
  await page.goto("/");
  const reported = page.waitForResponse(
    (response) =>
      response.url().endsWith("/client-errors") && response.request().method() === "POST",
  );

  await page.evaluate(() => {
    void Promise.reject(new RangeError("e2e secret detail"));
  });

  const response = await reported;
  expect(response.status()).toBe(204);
  const body = response.request().postData() ?? "";
  expect(JSON.parse(body)).toEqual({ kind: "unhandled_rejection", name: "RangeError", path: "/" });
  expect(body).not.toContain("secret detail");
});

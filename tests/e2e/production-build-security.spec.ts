import { expect, test, type Page } from "@playwright/test";

import { registerAndVerifyUser, uniqueEmail } from "./helpers/register-and-verify.js";

/**
 * M16 (ADR-027, audit S-06) — the production build (`vite build` + `vite preview`, project
 * `production-build`) runs under the Content-Security-Policy and headers of
 * apps/web/src/security/security-headers.ts without a single violation.
 *
 * The E2E API only accepts writes whose Origin is the dev server (localhost:5173) — correctly — so
 * this project signs in through the API itself (cookies are not port-scoped) and exercises the
 * pages' reads. Write flows under CSP (e.g. blob: audio playback) are covered by the policy's unit
 * test and the dev-server specs; see docs/security/M16-SECURITY-TESTS.md.
 */

const PASSWORD = "a-good-password-123";
const API = "http://localhost:3000";

async function collectViolations(page: Page): Promise<() => Promise<string[]>> {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /content security policy|refused to/i.test(message.text())) {
      consoleErrors.push(message.text());
    }
  });
  await page.addInitScript(() => {
    const store: string[] = [];
    Object.defineProperty(window, "__cspViolations", { value: store });
    document.addEventListener("securitypolicyviolation", (event) => {
      store.push(`${event.effectiveDirective} blocked ${event.blockedURI}`);
    });
  });
  return async () => [
    ...consoleErrors,
    ...(await page.evaluate(
      () => (window as unknown as { __cspViolations: string[] }).__cspViolations,
    )),
  ];
}

test.describe("production build under its Content-Security-Policy", () => {
  test("serves the app with the security headers", async ({ page }) => {
    const response = await page.goto("/");

    const headers = response?.headers() ?? {};
    expect(headers["content-security-policy"]).toContain("script-src 'self'");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["content-security-policy"]).not.toContain("unsafe-inline");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("no-referrer");
  });

  test("public pages render with no CSP violation", async ({ page }) => {
    const violations = await collectViolations(page);

    for (const path of ["/", "/login", "/register", "/forgot-password", "/privacy", "/learn"]) {
      await page.goto(path);
      await expect(page.locator("#root")).not.toBeEmpty();
    }
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();

    expect(await violations()).toEqual([]);
  });

  test("a signed-in student's pages render with no CSP violation", async ({ page }) => {
    const email = uniqueEmail("csp");
    await registerAndVerifyUser(page.context().request, email, PASSWORD);
    const login = await page.context().request.post(`${API}/auth/login`, {
      data: { email, password: PASSWORD },
    });
    expect(login.ok()).toBe(true);
    const violations = await collectViolations(page);

    const pages: [string, RegExp][] = [
      ["/dashboard", /dashboard/i],
      ["/learn/lessons", /lessons/i],
      ["/learn/lessons/pl-greetings", /./],
      ["/learn/exercises/pl-greetings-polite-hello", /./],
      ["/learn/vocabulary", /vocabulary/i],
      ["/learn/vocabulary/pl-dom", /dom/],
      ["/learn/phonetics", /./],
      ["/achievements", /achievements/i],
      ["/profile", /profile/i],
    ];
    for (const [path, heading] of pages) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    }

    expect(await violations()).toEqual([]);
  });
});

test.describe("production build — framing", () => {
  // The production-build project turns off Chrome's Local Network Access check (see
  // playwright.config.ts), so the app's own frame-ancestors / X-Frame-Options is what is tested —
  // mutation-checked: without them the frame loads the app.
  test("another site cannot frame the app (clickjacking)", async ({ page, baseURL }) => {
    const loginUrl = `${baseURL ?? ""}/login`;
    // A page on another origin (127.0.0.1 is not localhost), with no CSP of its own — only the
    // framed response can refuse.
    await page.route("http://127.0.0.1:4173/framing-probe", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<!doctype html><iframe src="${loginUrl}" onload="window.frameSettled = true"></iframe>`,
      }),
    );

    await page.goto("http://127.0.0.1:4173/framing-probe");
    await page.waitForFunction(
      () => (window as unknown as { frameSettled?: boolean }).frameSettled,
    );

    const child = page.frames().find((frame) => frame.parentFrame() === page.mainFrame());
    expect(child).toBeDefined();
    // Refused by frame-ancestors / X-Frame-Options: the browser shows its own error document.
    expect(child?.url()).not.toBe(loginUrl);
  });
});

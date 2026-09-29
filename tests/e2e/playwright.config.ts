import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, devices } from "@playwright/test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const baseURL = "http://localhost:5173";
/** The production build (`vite build` + `vite preview`), served with its security headers (M16). */
const productionBuildURL = "http://localhost:4173";
const PRODUCTION_BUILD_SPEC = /production-build-security\.spec\.ts/;
/** M20A: screenshot baselines depend on the OS and its font rendering (the committed ones are
 * Windows), so visual regression is opt-in — `PW_VISUAL=1` — and never part of the default run. */
const VISUAL_SPEC = /homepage-visual\.spec\.ts/;
const visualProjects = process.env.PW_VISUAL
  ? [
      {
        name: "homepage-visual",
        use: { ...devices["Desktop Chrome"], reducedMotion: "reduce" as const },
        testMatch: VISUAL_SPEC,
      },
    ]
  : [];

const API_PORT = 3000;

/**
 * ~20% of the suite by design (see docs/testing/testing-strategy.md) —
 * cross-layer golden paths only. M3 adds the auth golden paths (register,
 * login, logout, password reset, route protection) — see
 * .claude/skills/playwright and docs/adr/adr-006-authentication.md.
 */
export default defineConfig({
  testDir: ".",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // CI-only JUnit output for Jenkins' native `junit` step; HTML report always generated.
  // outputFile is resolved relative to this config file's directory (tests/e2e/), not the
  // process cwd, so it's anchored to repoRoot explicitly — otherwise it lands at
  // tests/e2e/test-results/e2e-junit.xml, which the Jenkinsfile's `junit` step (looking at
  // $WORKSPACE/test-results/e2e-junit.xml) never finds.
  reporter: process.env.CI
    ? [
        ["html", { open: "never" }],
        ["junit", { outputFile: path.join(repoRoot, "test-results/e2e-junit.xml") }],
      ]
    : [["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: [PRODUCTION_BUILD_SPEC, VISUAL_SPEC],
    },
    {
      // M16 (ADR-027): the built app under its Content-Security-Policy — the dev server cannot be
      // checked under that policy (its hot-reload client needs inline scripts).
      name: "production-build",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: productionBuildURL,
        // Chrome's Local Network Access check stops a Playwright-served page from framing
        // localhost at all, which would make the clickjacking test pass whatever the app's own
        // headers say. Off for this test browser only.
        launchOptions: { args: ["--disable-features=LocalNetworkAccessChecks"] },
      },
      testMatch: PRODUCTION_BUILD_SPEC,
    },
    ...visualProjects,
  ],
  webServer: [
    {
      // NODE_ENV=test: apps/api runs against an in-process PGlite instance
      // instead of a live Postgres connection (see
      // docs/adr/adr-005-database.md and
      // apps/api/src/composition/auth-dependencies.ts) — real server, real
      // HTTP, real (WASM) Postgres, no Docker/network database needed for
      // E2E. AUTH_SESSION_SECRET is a throwaway value, fine to commit —
      // it only signs ephemeral E2E session cookies, never a real secret.
      // NODE_ENV=test runs the TypeScript sources through tsx (in-process PGlite database); the
      // compiled `start` bundle deliberately excludes that test composition (M17).
      command: "pnpm --filter @tfm-bic/api start:test",
      cwd: repoRoot,
      url: `http://localhost:${API_PORT}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        NODE_ENV: "test",
        PORT: String(API_PORT),
        APP_BASE_URL: baseURL,
        AUTH_SESSION_SECRET: "e2e-test-secret-never-used-outside-local-e2e-runs",
        // A full E2E run legitimately registers/logs in many times against
        // one shared server — see packages/config's load-env.ts for why
        // this is a distinct signal from NODE_ENV=test, not a weakening of
        // the real limits (still exercised by their own fixed-config unit
        // test regardless of this flag).
        E2E_RELAXED_RATE_LIMITS: "true",
      },
    },
    {
      command: "pnpm --filter @tfm-bic/web dev",
      cwd: repoRoot,
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      // Builds apps/web and serves dist/ with the security headers of
      // apps/web/src/security/security-headers.ts; API paths are proxied like the dev server.
      command:
        "pnpm --filter @tfm-bic/web build && pnpm --filter @tfm-bic/web preview --port 4173 --strictPort",
      cwd: repoRoot,
      url: productionBuildURL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});

import { defineConfig } from "vitest/config";

// CI-only JUnit output for Jenkins' native `junit` step (Jenkins test result trend/reporting) —
// left off locally so `pnpm test` doesn't litter the workspace with test-results/junit.xml.
const isCI = !!process.env.CI;

export default defineConfig({
  test: {
    reporters: isCI ? ["default", "junit"] : ["default"],
    outputFile: isCI ? { junit: "./test-results/junit.xml" } : undefined,
    projects: [
      "packages/shared/vitest.config.ts",
      "packages/domain/vitest.config.ts",
      "packages/application/vitest.config.ts",
      "packages/data/vitest.config.ts",
      "packages/contracts/vitest.config.ts",
      "packages/config/vitest.config.ts",
      "packages/ui/vitest.config.ts",
      "apps/web/vitest.config.ts",
      "apps/api/vitest.config.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["packages/*/src/**/*.{ts,tsx}", "apps/*/src/**/*.{ts,tsx}"],
      exclude: [
        "**/*.d.ts",
        "**/*.config.{ts,js,mjs}",
        "**/dist/**",
        "packages/testing/**",
        "packages/*/src/**/*.test.{ts,tsx}",
        "apps/*/src/**/*.test.{ts,tsx}",
        // Bootstrap/composition-root files: wiring with no branching logic
        // of their own (the logic they wire — use cases, stores, routes as
        // data — is tested where it's defined). Covered functionally by the
        // Playwright smoke test and by manually running dev/build.
        "apps/web/src/main.tsx",
        "apps/web/src/app.tsx",
        "apps/web/src/router.tsx",
        "apps/api/src/index.ts",
        // Constructs the real Drizzle/Argon2/Crypto adapters from a live
        // DATABASE_URL — exercised by actually running the server, not by
        // apps/api's own tests (which inject fakes via buildTestDeps, see
        // auth-use-cases.ts, which those tests do exercise for real).
        "apps/api/src/composition/auth-dependencies.ts",
        "apps/api/src/composition/profile-dependencies.ts",
        "apps/api/src/composition/lesson-dependencies.ts",
        "apps/api/src/composition/exercise-dependencies.ts",
        "apps/api/src/composition/test-dependencies.ts",
        // Real `pg.Pool`/Drizzle connection factory — repository tests use
        // the PGlite test-support factory instead (see
        // db/test-support/create-test-db.ts), never this one.
        "packages/data/src/identity/db/client.ts",
        "packages/data/src/profile/db/client.ts",
        "packages/data/src/lessons/db/client.ts",
        "packages/data/src/exercises/db/client.ts",
        // `pnpm content:validate` entry point: argv in, exit code out. The loader and the
        // report formatter it calls are unit-tested; only the bootstrap is left uncovered.
        "packages/data/src/content/validate-content.cli.ts",
      ],
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 75,
      },
    },
  },
});

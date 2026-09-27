// Production build of apps/api (M17, ADR-028): bundles the API and the migration runner into plain
// JavaScript under dist/, so the runtime image runs `node` on compiled output — never tsx, and
// without the workspace's TypeScript sources.
//
// - Every workspace package and third-party dependency is bundled, except `argon2` (a native
//   addon; the image copies it from the lockfile-installed node_modules) and `pg-native` (an
//   optional binding `pg` never loads unless asked to).
// - The NODE_ENV=test composition (an in-process PGlite database, a devDependency) is replaced by
//   a stub that refuses to start, and the output is checked for test tooling afterwards.
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const apiRoot = path.dirname(fileURLToPath(import.meta.url));
const outdir = path.join(apiRoot, "dist");

/** @type {import("esbuild").Plugin} */
const excludeTestComposition = {
  name: "exclude-test-composition",
  setup(builder) {
    builder.onResolve({ filter: /composition\/test-dependencies\.js$/ }, () => ({
      path: "test-dependencies",
      namespace: "production-stub",
    }));
    builder.onLoad({ filter: /.*/, namespace: "production-stub" }, () => ({
      loader: "js",
      contents: `export function createTestDependencies() {
  throw new Error("NODE_ENV=test needs the in-process test database, which the production build does not include.");
}`,
    }));
  },
};

rmSync(outdir, { recursive: true, force: true });

const result = await build({
  entryPoints: {
    index: path.join(apiRoot, "src/index.ts"),
    migrate: path.join(apiRoot, "../../packages/data/src/migrations/migrate.cli.ts"),
  },
  outdir,
  bundle: true,
  platform: "node",
  target: "node24",
  format: "esm",
  sourcemap: true,
  // Bundled CommonJS dependencies still call require() for Node built-ins.
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);",
  },
  external: ["argon2", "pg-native"],
  plugins: [excludeTestComposition],
  logLevel: "warning",
  metafile: true,
});

// Fail the build if anything test-only reached the production bundle — checked against esbuild's
// list of every bundled input file, not the output text.
const FORBIDDEN_INPUTS = ["@electric-sql/pglite", "drizzle-orm/pglite", "drizzle-kit", "vitest"];
const leaked = Object.keys(result.metafile.inputs).filter((input) =>
  FORBIDDEN_INPUTS.some((name) => input.includes(`node_modules/${name}/`)),
);
if (leaked.length > 0) {
  throw new Error(`The production bundle contains test-only code:\n${leaked.join("\n")}`);
}

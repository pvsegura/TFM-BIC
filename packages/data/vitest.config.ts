import { defineProjectConfig } from "../../vitest.shared.js";

// PGlite (an in-process WASM Postgres, see docs/adr/adr-005-database.md)
// boots per identity repository test file. Several concurrent instances
// crashed Vitest's worker-fork pool on this stack (Windows) — run this
// project's files sequentially rather than in parallel forks, and give
// each PGlite boot a generous timeout.
export default defineProjectConfig({
  name: "data",
  hookTimeout: 30000,
  testTimeout: 30000,
  fileParallelism: false,
});

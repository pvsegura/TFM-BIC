import { defineProjectConfig } from "../../vitest.shared.js";

// The first test of every route file pays for loading the whole server module graph (Fastify, the
// data package with drizzle/pg/argon2, every use case). Alone that is well under a second, but the
// root run executes nine projects in parallel — and with coverage instrumentation on top, on a
// small CI agent or a memory-starved workstation — the cold start of one file can exceed Vitest's
// 5 s default (six unrelated first-tests timed out in one such run). A generous timeout removes
// that noise without weakening any assertion; a genuinely hung test still fails.
export default defineProjectConfig({
  name: "api",
  hookTimeout: 30000,
  testTimeout: 30000,
});

import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { realCliRunner } from "./hyperframes-cli-runner.js";

/**
 * Exercises `realCliRunner`'s actual `child_process` wiring for real — spawn failure, a clean
 * exit, a non-zero exit and a timeout — using `node` itself (guaranteed present in this test
 * environment) instead of the real `hyperframes` CLI, so these tests need no FFmpeg, no headless
 * Chrome and no network access, and still prove the runner's own logic genuinely works.
 */
describe("realCliRunner", () => {
  it("reports a clean exit with its stdout", async () => {
    const result = await realCliRunner(process.execPath, ["-e", "console.log('ok')"], {
      cwd: tmpdir(),
      timeoutMs: 10_000,
    });

    expect(result).toEqual({
      exitCode: 0,
      stdout: "ok\n",
      stderr: "",
      timedOut: false,
      spawnError: null,
    });
  });

  it("reports a non-zero exit code", async () => {
    const result = await realCliRunner(process.execPath, ["-e", "process.exit(3)"], {
      cwd: tmpdir(),
      timeoutMs: 10_000,
    });

    expect(result.exitCode).toBe(3);
    expect(result.timedOut).toBe(false);
    expect(result.spawnError).toBeNull();
  });

  it("reports spawnError when the command does not exist", async () => {
    const result = await realCliRunner("definitely-not-a-real-command-xyz", [], {
      cwd: tmpdir(),
      timeoutMs: 10_000,
    });

    expect(result.spawnError).toBeTruthy();
    expect(result.timedOut).toBe(false);
  });

  it("reports timedOut when the process outlives the timeout", async () => {
    const result = await realCliRunner(process.execPath, ["-e", "setTimeout(() => {}, 5000)"], {
      cwd: tmpdir(),
      timeoutMs: 300,
    });

    expect(result.timedOut).toBe(true);
    expect(result.exitCode).toBeNull();
  }, 10_000);
});

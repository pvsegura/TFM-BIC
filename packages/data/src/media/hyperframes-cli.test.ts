import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import type { CliRunResult, CliRunner } from "./cli-runner.js";
import { HyperframesCli, HyperframesRenderError } from "./hyperframes-cli.js";

const PROJECT = path.join("C:", "media-build", "lesson-pl-greetings");

function stubRunner(result: Partial<CliRunResult> = {}): CliRunner {
  return vi.fn<CliRunner>().mockResolvedValue({
    exitCode: 0,
    stdout: "",
    stderr: "",
    timedOut: false,
    spawnError: null,
    ...result,
  });
}

async function failureOf(cli: HyperframesCli): Promise<HyperframesRenderError> {
  const error = await cli.render(PROJECT).catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(HyperframesRenderError);
  return error as HyperframesRenderError;
}

describe("HyperframesCli", () => {
  it("renders inside the project folder, never through a shell, and returns the MP4's path", async () => {
    const runner = stubRunner();
    const cli = new HyperframesCli({ runner, renderArgs: ["--fps", "30"] });

    const output = await cli.render(PROJECT);

    expect(output).toBe(path.join(PROJECT, "output.mp4"));
    expect(runner).toHaveBeenCalledWith(
      "npx",
      ["hyperframes", "render", "--fps", "30", "--output", path.join(PROJECT, "output.mp4")],
      { cwd: PROJECT, timeoutMs: expect.any(Number) as number },
    );
  });

  it("starts the CLI with the configured command and timeout", async () => {
    const runner = stubRunner();
    const cli = new HyperframesCli({
      runner,
      command: { file: "node", args: ["hyperframes.mjs"] },
      timeoutMs: 42,
    });

    await cli.render(PROJECT);

    expect(runner).toHaveBeenCalledWith(
      "node",
      ["hyperframes.mjs", "render", "--output", path.join(PROJECT, "output.mp4")],
      { cwd: PROJECT, timeoutMs: 42 },
    );
  });

  it("reports a CLI that could not start", async () => {
    const error = await failureOf(
      new HyperframesCli({
        runner: stubRunner({ exitCode: null, spawnError: "spawn npx ENOENT" }),
      }),
    );

    expect(error.reason).toBe("unavailable");
  });

  it("reports a render that ran out of time", async () => {
    const error = await failureOf(
      new HyperframesCli({ runner: stubRunner({ exitCode: null, timedOut: true }) }),
    );

    expect(error.reason).toBe("timeout");
  });

  it("reports a failed render with a bounded message", async () => {
    const error = await failureOf(
      new HyperframesCli({ runner: stubRunner({ exitCode: 1, stderr: "a".repeat(1000) }) }),
    );

    expect(error.reason).toBe("rejected");
    expect(error.message.length).toBeLessThan(600);
  });
});

import path from "node:path";

import {
  VideoGenerationTimeoutError,
  VideoProviderRejectedError,
  VideoProviderUnavailableError,
} from "@tfm-bic/application";
import { describe, expect, it, vi } from "vitest";

import type { CliRunResult, CliRunner } from "./hyperframes-cli-runner.js";
import { HyperframesCliProvider } from "./hyperframes-cli.provider.js";

const REQUEST = {
  videoDefinitionId: "pl-a1-nasal-vowels-demo",
  scriptPath: "pl-a1-nasal-vowels-demo",
  title: "Nasal vowels",
};
const VIDEO_SCRIPTS_ROOT = path.join("C:", "content", "video-scripts");

function stubRunner(result: CliRunResult): CliRunner {
  return vi.fn<CliRunner>().mockResolvedValue(result);
}

describe("HyperframesCliProvider", () => {
  it("invokes the CLI in the definition's own project directory, never a shell", async () => {
    const runner = stubRunner({
      exitCode: 0,
      stdout: "",
      stderr: "",
      timedOut: false,
      spawnError: null,
    });
    const provider = new HyperframesCliProvider({ videoScriptsRoot: VIDEO_SCRIPTS_ROOT, runner });

    await provider.generate(REQUEST);

    expect(runner).toHaveBeenCalledWith(
      "npx",
      [
        "hyperframes",
        "render",
        "--output",
        path.join(VIDEO_SCRIPTS_ROOT, "pl-a1-nasal-vowels-demo", "output.mp4"),
      ],
      {
        cwd: path.join(VIDEO_SCRIPTS_ROOT, "pl-a1-nasal-vowels-demo"),
        timeoutMs: expect.any(Number) as number,
      },
    );
  });

  it("resolves with an opaque provider reference and the rendered file's path on a clean exit", async () => {
    const runner = stubRunner({
      exitCode: 0,
      stdout: "",
      stderr: "",
      timedOut: false,
      spawnError: null,
    });
    const provider = new HyperframesCliProvider({ videoScriptsRoot: VIDEO_SCRIPTS_ROOT, runner });

    const result = await provider.generate(REQUEST);

    expect(result.providerJobReference).toBe("hyperframes-cli:pl-a1-nasal-vowels-demo");
    expect(result.mediaReference).toBe(
      path.join(VIDEO_SCRIPTS_ROOT, "pl-a1-nasal-vowels-demo", "output.mp4"),
    );
  });

  it("translates a spawn failure into VideoProviderUnavailableError", async () => {
    const runner = stubRunner({
      exitCode: null,
      stdout: "",
      stderr: "",
      timedOut: false,
      spawnError: "spawn npx ENOENT",
    });
    const provider = new HyperframesCliProvider({ videoScriptsRoot: VIDEO_SCRIPTS_ROOT, runner });

    await expect(provider.generate(REQUEST)).rejects.toThrow(VideoProviderUnavailableError);
  });

  it("translates a timeout into VideoGenerationTimeoutError", async () => {
    const runner = stubRunner({
      exitCode: null,
      stdout: "",
      stderr: "",
      timedOut: true,
      spawnError: null,
    });
    const provider = new HyperframesCliProvider({ videoScriptsRoot: VIDEO_SCRIPTS_ROOT, runner });

    await expect(provider.generate(REQUEST)).rejects.toThrow(VideoGenerationTimeoutError);
  });

  it("translates a non-zero exit into VideoProviderRejectedError, with a bounded, safe message", async () => {
    const runner = stubRunner({
      exitCode: 1,
      stdout: "",
      stderr: "a".repeat(1000),
      timedOut: false,
      spawnError: null,
    });
    const provider = new HyperframesCliProvider({ videoScriptsRoot: VIDEO_SCRIPTS_ROOT, runner });

    const error = await provider.generate(REQUEST).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(VideoProviderRejectedError);
    expect((error as Error).message.length).toBeLessThan(600);
  });

  it("passes a caller-configured timeout through to the runner", async () => {
    const runner = stubRunner({
      exitCode: 0,
      stdout: "",
      stderr: "",
      timedOut: false,
      spawnError: null,
    });
    const provider = new HyperframesCliProvider({
      videoScriptsRoot: VIDEO_SCRIPTS_ROOT,
      runner,
      timeoutMs: 42,
    });

    await provider.generate(REQUEST);

    expect(runner).toHaveBeenCalledWith(expect.any(String), expect.any(Array), {
      cwd: expect.any(String) as string,
      timeoutMs: 42,
    });
  });
});

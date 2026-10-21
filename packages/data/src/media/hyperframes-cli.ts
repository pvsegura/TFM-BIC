import path from "node:path";

import { realCliRunner, type CliRunner } from "./cli-runner.js";

/** Headless-browser frame-by-frame rendering is CPU-bound and not instant (see the `hyperframes` skill) — generous, but still bounded so a stuck render cannot hang the pipeline forever. */
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
const OUTPUT_FILE_NAME = "output.mp4";
const MAX_LOGGED_CHARACTERS = 500;

export interface HyperframesCliOptions {
  timeoutMs?: number;
  runner?: CliRunner;
  /**
   * How to start the Hyperframes CLI. Defaults to `npx hyperframes`. `execFile` cannot start `npx`
   * on Windows (it is a `.cmd` shim, and Node refuses to spawn `.cmd` files without a shell), so
   * the media pipeline passes `process.execPath` and the pinned package's `bin/hyperframes.mjs`
   * instead — no shell either way.
   */
  command?: { file: string; args: readonly string[] };
  /** Extra `render` flags, e.g. `["--fps", "30", "--quality", "standard"]` (verified CLI flags). */
  renderArgs?: readonly string[];
}

/** Why a render did not produce a video. */
export type HyperframesFailure = "unavailable" | "timeout" | "rejected";

export class HyperframesRenderError extends Error {
  constructor(
    readonly reason: HyperframesFailure,
    message: string,
  ) {
    super(message);
    this.name = "HyperframesRenderError";
  }
}

/** Bounds an unpredictable CLI message before it can reach a log or an error message. */
function summarize(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > MAX_LOGGED_CHARACTERS
    ? `${trimmed.slice(0, MAX_LOGGED_CHARACTERS)}…`
    : trimmed;
}

/**
 * Hyperframes' public CLI (`hyperframes render --output <file>`, no authentication for local
 * rendering), run by the offline media pipeline (M21, ADR-031) over a render project the pipeline
 * wrote. Never reads the project; only runs the CLI with it as the working directory, through
 * `execFile` (never a shell). Never surfaces raw CLI output in full — only a bounded summary.
 */
export class HyperframesCli {
  private readonly timeoutMs: number;
  private readonly runner: CliRunner;
  private readonly command: { file: string; args: readonly string[] };
  private readonly renderArgs: readonly string[];

  constructor(options: HyperframesCliOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.runner = options.runner ?? realCliRunner;
    this.command = options.command ?? { file: "npx", args: ["hyperframes"] };
    this.renderArgs = options.renderArgs ?? [];
  }

  /** Renders the project in `projectDir` and returns the rendered MP4's path. */
  async render(projectDir: string): Promise<string> {
    const outputPath = path.join(projectDir, OUTPUT_FILE_NAME);
    const result = await this.runner(
      this.command.file,
      [...this.command.args, "render", ...this.renderArgs, "--output", outputPath],
      { cwd: projectDir, timeoutMs: this.timeoutMs },
    );

    if (result.spawnError) {
      throw new HyperframesRenderError(
        "unavailable",
        `hyperframes could not start: ${summarize(result.spawnError)}`,
      );
    }
    if (result.timedOut) {
      throw new HyperframesRenderError(
        "timeout",
        `hyperframes render did not finish within ${String(this.timeoutMs)} ms.`,
      );
    }
    if (result.exitCode !== 0) {
      throw new HyperframesRenderError(
        "rejected",
        `hyperframes render exited with code ${String(result.exitCode)}: ${summarize(result.stderr)}`,
      );
    }
    return outputPath;
  }
}

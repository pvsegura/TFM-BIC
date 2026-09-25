import path from "node:path";

import {
  VideoGenerationTimeoutError,
  VideoProviderRejectedError,
  VideoProviderUnavailableError,
  type VideoGenerationRequest,
  type VideoGenerationResult,
  type VideoGenerationService,
} from "@tfm-bic/application";

import { realCliRunner, type CliRunner } from "./hyperframes-cli-runner.js";

/** Headless-browser frame-by-frame rendering is CPU-bound and not instant (see the `hyperframes` skill) — generous, but still bounded so a stuck render cannot hang a request forever. */
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
const OUTPUT_FILE_NAME = "output.mp4";
const MAX_LOGGED_CHARACTERS = 500;

export interface HyperframesCliProviderOptions {
  /** Absolute path to the folder that holds each video's render project (`content/video-scripts/`, or wherever a deployment keeps it — see `CONTENT_DIR`). */
  videoScriptsRoot: string;
  timeoutMs?: number;
  runner?: CliRunner;
}

/** Bounds an unpredictable provider message before it can reach a log or an error message. */
function summarize(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > MAX_LOGGED_CHARACTERS
    ? `${trimmed.slice(0, MAX_LOGGED_CHARACTERS)}…`
    : trimmed;
}

/**
 * **BLOCKED/PENDING real verification** (see `content/video-scripts/README.md` and ADR-012):
 * implemented against Hyperframes' verified public CLI surface — `npx hyperframes render --output
 * <file>`, no authentication for local/self-hosted rendering
 * (hyperframes.heygen.com/introduction, github.com/heygen-com/hyperframes, re-checked 2026-09-23)
 * — but never executed against the real renderer in this environment. Hyperframes itself requires
 * Node 22+, FFmpeg and headless Chrome; none were confirmed available here, and ADR-015 (hosting)
 * is still PENDING, so whether the real deployment target can run this at all is unverified.
 * Selected only via `VIDEO_GENERATION_PROVIDER=hyperframes` — never the default, and never used by
 * automated tests or CI (see `FakeVideoGenerationService`, the provider CI and `NODE_ENV=test`
 * always get).
 *
 * Never reads or parses `scriptPath`'s contents; only shells out with it as a working directory.
 * `scriptPath` is already restricted to a safe slug by `videoFileSchema` (no shell metacharacter
 * is possible), and `execFile` (via `realCliRunner`) never spawns a shell regardless. Never logs
 * raw provider stdout/stderr in full — only a bounded summary, so an unexpectedly large or
 * unusual provider message can never flood or poison the logs.
 */
export class HyperframesCliProvider implements VideoGenerationService {
  private readonly videoScriptsRoot: string;
  private readonly timeoutMs: number;
  private readonly runner: CliRunner;

  constructor(options: HyperframesCliProviderOptions) {
    this.videoScriptsRoot = options.videoScriptsRoot;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.runner = options.runner ?? realCliRunner;
  }

  async generate(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    const projectDir = path.join(this.videoScriptsRoot, request.scriptPath);
    const outputPath = path.join(projectDir, OUTPUT_FILE_NAME);

    const result = await this.runner("npx", ["hyperframes", "render", "--output", outputPath], {
      cwd: projectDir,
      timeoutMs: this.timeoutMs,
    });

    if (result.spawnError) {
      throw new VideoProviderUnavailableError(summarize(result.spawnError));
    }
    if (result.timedOut) {
      throw new VideoGenerationTimeoutError(this.timeoutMs);
    }
    if (result.exitCode !== 0) {
      throw new VideoProviderRejectedError(
        `hyperframes render exited with code ${String(result.exitCode)}: ${summarize(result.stderr)}`,
      );
    }

    return {
      providerJobReference: `hyperframes-cli:${request.videoDefinitionId}`,
      mediaReference: outputPath,
    };
  }
}

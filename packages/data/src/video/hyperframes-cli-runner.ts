import { execFile } from "node:child_process";

export interface CliRunResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  /** Set when the command itself could not be started at all (e.g. `npx` is not on PATH). */
  spawnError: string | null;
}

/** Runs one command to completion and reports what happened — never throws. */
export type CliRunner = (
  command: string,
  args: readonly string[],
  options: { cwd: string; timeoutMs: number },
) => Promise<CliRunResult>;

/**
 * The real process runner, used only by `HyperframesCliProvider` in production. Wraps
 * `child_process.execFile` (never a shell — no shell-injection surface from `scriptPath`, which is
 * already restricted to a safe slug by `videoFileSchema`) with a hard timeout. Never throws: every
 * outcome (clean exit, non-zero exit, timeout, or the command failing to start at all) is reported
 * in the returned `CliRunResult` for the caller to translate into a typed application error.
 */
export const realCliRunner: CliRunner = (command, args, { cwd, timeoutMs }) =>
  new Promise((resolve) => {
    execFile(
      command,
      [...args],
      { cwd, timeout: timeoutMs, windowsHide: true, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (!error) {
          resolve({ exitCode: 0, stdout, stderr, timedOut: false, spawnError: null });
          return;
        }
        // node reports a timeout kill the same way it reports any SIGTERM: `killed: true`,
        // `code: null`, `signal: "SIGTERM"`. Nothing else in this adapter sends a signal, so in
        // practice this is our own timeout — but the ambiguity is inherent to node's API.
        const timedOut = Boolean(error.killed) && error.signal === "SIGTERM";
        resolve({
          exitCode: typeof error.code === "number" ? error.code : null,
          stdout,
          stderr,
          timedOut,
          spawnError: error.code === "ENOENT" ? error.message : null,
        });
      },
    );
  });

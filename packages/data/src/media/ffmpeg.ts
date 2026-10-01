import { realCliRunner, type CliRunner } from "../video/hyperframes-cli-runner.js";

/**
 * FFmpeg/FFprobe for the offline media pipeline (M21): transcoding narration to AAC, measuring
 * clip durations, extracting a poster frame and moving the MP4 index to the front for streaming.
 * Operator-machine only — nothing in the API or the deployed image calls FFmpeg. Arguments are
 * passed as an array to `execFile` (no shell); every path is produced by the pipeline itself.
 */
export interface FfmpegTools {
  ffmpeg: string;
  ffprobe: string;
  runner?: CliRunner;
}

const TIMEOUT_MS = 120_000;

async function run(tools: FfmpegTools, file: string, args: string[]): Promise<string> {
  const result = await (tools.runner ?? realCliRunner)(file, args, {
    cwd: process.cwd(),
    timeoutMs: TIMEOUT_MS,
  });
  if (result.spawnError) throw new Error(`${file} could not start: ${result.spawnError}`);
  if (result.timedOut) throw new Error(`${file} timed out`);
  if (result.exitCode !== 0) {
    throw new Error(`${file} exited with ${String(result.exitCode)}: ${result.stderr.slice(-400)}`);
  }
  return result.stdout;
}

/** WAV (or anything FFmpeg reads) → mono AAC in an MP4 container, small enough to commit. */
export async function transcodeToAac(tools: FfmpegTools, input: string, output: string) {
  await run(tools, tools.ffmpeg, [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    input,
    "-ac",
    "1",
    "-c:a",
    "aac",
    "-b:a",
    "64k",
    "-movflags",
    "+faststart",
    output,
  ]);
}

export async function durationSeconds(tools: FfmpegTools, file: string): Promise<number> {
  const out = await run(tools, tools.ffprobe, [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    file,
  ]);
  const seconds = Number(out.trim());
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error(`No duration for ${file}`);
  return Math.round(seconds * 1000) / 1000;
}

export async function extractPoster(
  tools: FfmpegTools,
  video: string,
  atSeconds: number,
  output: string,
) {
  await run(tools, tools.ffmpeg, [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-ss",
    atSeconds.toFixed(2),
    "-i",
    video,
    "-frames:v",
    "1",
    "-q:v",
    "4",
    output,
  ]);
}

/** Re-muxes without re-encoding so browsers can start playing before the whole file arrives. */
export async function fastStart(tools: FfmpegTools, input: string, output: string) {
  await run(tools, tools.ffmpeg, [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    input,
    "-c",
    "copy",
    "-movflags",
    "+faststart",
    output,
  ]);
}

/** Generates `seconds` of silence as 24 kHz mono WAV — the draft-mode stand-in for narration. */
export async function silenceWav(tools: FfmpegTools, seconds: number, output: string) {
  await run(tools, tools.ffmpeg, [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-f",
    "lavfi",
    "-i",
    "anullsrc=r=24000:cl=mono",
    "-t",
    seconds.toFixed(2),
    output,
  ]);
}

/**
 * Median fundamental frequency of a clip in Hz (autocorrelation over 40 ms frames, voiced frames
 * only). Used by the audition to describe each voice profile's pitch range objectively, because the
 * provider documents a descriptor per voice but not its pitch (M22). Not a speaker-identity measure.
 */
export async function medianPitchHz(tools: FfmpegTools, file: string): Promise<number | undefined> {
  const { execFile } = await import("node:child_process");
  const pcm: Buffer = await new Promise((resolve, reject) => {
    execFile(
      tools.ffmpeg,
      ["-v", "error", "-i", file, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"],
      { encoding: "buffer", maxBuffer: 1 << 26 },
      (error, stdout) => {
        if (error) reject(new Error(`ffmpeg could not decode ${file}: ${error.message}`));
        else resolve(stdout);
      },
    );
  });
  const x = new Float32Array(pcm.length / 2);
  for (let i = 0; i < x.length; i += 1) x[i] = pcm.readInt16LE(i * 2) / 32768;
  const sr = 16000,
    N = 640,
    f0s: number[] = [];
  for (let s = 0; s + N < x.length; s += 320) {
    let e = 0;
    for (let i = 0; i < N; i += 1) e += (x[s + i] ?? 0) ** 2;
    if (e / N < 1e-3) continue;
    let best = 0,
      lag = 0;
    for (let L = Math.floor(sr / 400); L <= Math.floor(sr / 70); L += 1) {
      let c = 0,
        n1 = 0,
        n2 = 0;
      for (let i = 0; i < N - L; i += 1) {
        const a = x[s + i] ?? 0,
          b = x[s + i + L] ?? 0;
        c += a * b;
        n1 += a * a;
        n2 += b * b;
      }
      const r = c / Math.sqrt(n1 * n2 + 1e-9);
      if (r > best) {
        best = r;
        lag = L;
      }
    }
    if (best > 0.6 && lag > 0) f0s.push(sr / lag);
  }
  if (f0s.length < 5) return undefined;
  f0s.sort((a, b) => a - b);
  return Math.round(f0s[Math.floor(f0s.length / 2)] ?? 0);
}

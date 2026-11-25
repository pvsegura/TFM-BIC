/**
 * Generates the listening-test recordings offline with Piper in WSL Ubuntu — always the same
 * narrator (es_ES "mls_10246") — and encodes them to MP3 with ffmpeg.
 *
 *   wsl -d Ubuntu -- bash infrastructure/tts/setup-piper.sh        (once)
 *   packages/data/node_modules/.bin/tsx infrastructure/tts/generate-listening-audio.mts
 *
 * Each line is synthesised on its own; ffmpeg shortens the long pauses this audiobook-trained
 * voice makes inside sentences, speeds it up slightly, and joins the lines with a 0.8 s gap.
 * Output: apps/web/public/audio/listening/<situation>.mp3 (served as static files by the web app).
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { LISTENING_TEST } from "../../apps/web/src/listening-test/listening-test-data.js";

/** Always the same narrator: see infrastructure/tts/setup-piper.sh. */
const NARRATOR_MODEL = "es_ES-mls_10246-low.onnx";
const LINE_GAP_SECONDS = 0.8;
const CLEANUP =
  "silenceremove=start_periods=1:start_threshold=-40dB:stop_periods=-1:stop_duration=0.2:stop_threshold=-40dB:stop_silence=0.2,atempo=1.1";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = path.join(repoRoot, "apps/web/public/audio/listening");
mkdirSync(outDir, { recursive: true });
const work = mkdtempSync(path.join(tmpdir(), "verbysia-tts-"));

/** C:\x\y → /mnt/c/x/y, so WSL can write where Windows reads. */
function toWsl(windowsPath: string): string {
  const [drive, ...rest] = windowsPath.split(":");
  return `/mnt/${(drive ?? "c").toLowerCase()}${rest.join(":").replace(/\\/g, "/")}`;
}

function synthesise(text: string, wavFile: string): void {
  const textFile = `${wavFile}.txt`;
  writeFileSync(textFile, `${text}\n`, "utf8");
  execFileSync(
    "wsl",
    [
      "-d",
      "Ubuntu",
      "--",
      "bash",
      "-c",
      `~/piper/piper/piper --model ~/piper/${NARRATOR_MODEL} --length_scale 0.85 --output_file '${toWsl(wavFile)}' < '${toWsl(textFile)}'`,
    ],
    { stdio: ["ignore", "ignore", "ignore"] },
  );
}

try {
  for (const situation of LISTENING_TEST) {
    const cleaned: string[] = [];
    situation.lines.forEach((line, index) => {
      const raw = path.join(work, `${situation.id}-${String(index)}.wav`);
      const clean = path.join(work, `${situation.id}-${String(index)}-clean.wav`);
      synthesise(line.text, raw);
      execFileSync("ffmpeg", [
        "-y",
        "-loglevel",
        "error",
        "-i",
        raw,
        "-af",
        CLEANUP,
        "-ar",
        "22050",
        "-ac",
        "1",
        clean,
      ]);
      cleaned.push(clean);
    });

    // line, gap, line, gap, … joined in one pass.
    const inputs = cleaned.flatMap((file) => ["-i", file]);
    const gapInputs = [
      "-f",
      "lavfi",
      "-t",
      String(LINE_GAP_SECONDS),
      "-i",
      "anullsrc=r=22050:cl=mono",
    ];
    const gapIndex = cleaned.length;
    const chain = cleaned.map((_, i) => `[${String(i)}:a][${String(gapIndex)}:a]`).join("");
    const filter = `${chain}concat=n=${String(cleaned.length * 2)}:v=0:a=1[out]`;
    const mp3 = path.join(outDir, `${situation.id}.mp3`);
    execFileSync("ffmpeg", [
      "-y",
      "-loglevel",
      "error",
      ...inputs,
      ...gapInputs,
      "-filter_complex",
      filter,
      "-map",
      "[out]",
      "-ac",
      "1",
      "-b:a",
      "64k",
      mp3,
    ]);
    console.log(`wrote ${path.relative(repoRoot, mp3)}`);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}

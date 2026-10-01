import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

import {
  GenerateContentMediaUseCase,
  planVideoTimeline,
  type AudioGenerationService,
  type MediaRunStatus,
} from "@tfm-bic/application";
import { narrationOf, voiceOf, type LanguageId } from "@tfm-bic/domain";

import { SystemClock } from "../clock/system-clock.js";
import { GeminiAudioProvider } from "../audio/gemini-audio.provider.js";
import { DEFAULT_CONTENT_ROOT } from "../content/content-root.js";
import { loadContentRepositories } from "../content/load-content-repositories.js";
import { FileMediaManifestRepository } from "./file-media-manifest.repository.js";
import { medianPitchHz, type FfmpegTools } from "./ffmpeg.js";
import { HYPERFRAMES_VERSION, HyperframesVideoRenderer } from "./hyperframes-video-renderer.js";
import { loadMediaPlan } from "./media-plan.js";
import { planMediaTargets } from "./media-targets.js";
import { StoredNarrationSynthesizer, type NarrationMode } from "./stored-narration-synthesizer.js";

/**
 * `pnpm --filter @tfm-bic/data media <command>` — the offline educational-media pipeline (M21,
 * ADR-031, docs/m21-content-generation.md). Operator-only: nothing in the API or the web app runs
 * it, and no page visit can trigger it.
 *
 *   doctor     check FFmpeg, Hyperframes, the media plan and whether GEMINI_API_KEY is configured
 *   plan       list targets and what generating them would cost in provider calls
 *   audition   one short English and target-language clip per narrator (not published)
 *   generate   synthesize, render and publish; skips up-to-date targets
 *
 * The Gemini key is read from the environment, or from the git-ignored `.env.media.local` at the
 * repository root. It is never printed, logged or written anywhere.
 */

const REPO_ROOT = path.resolve(DEFAULT_CONTENT_ROOT, "..");
const ENV_FILE = path.join(REPO_ROOT, ".env.media.local");
const BUILD_ROOT = path.join(REPO_ROOT, ".media-build");
const DEFAULT_MODEL = "gemini-3.8-flash-tts";
/** Hard ceilings a flag cannot exceed: a typo must not become hundreds of paid calls. */
const MAX_LIMIT = 40;
const MAX_CALLS_CEILING = 400;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    language: { type: "string", default: "pl" },
    only: { type: "string" },
    lessons: { type: "boolean", default: false },
    vocabulary: { type: "boolean", default: false },
    category: { type: "string" },
    priority: { type: "string", default: "1" },
    limit: { type: "string", default: "3" },
    "max-calls": { type: "string", default: "60" },
    force: { type: "boolean", default: false },
    draft: { type: "boolean", default: false },
    yes: { type: "boolean", default: false },
  },
});

const command = positionals[0] ?? "help";
const out = (line = "") => process.stdout.write(`${line}\n`);

function ffmpegTools(): FfmpegTools {
  const ffmpeg = process.env.FFMPEG_PATH ?? "ffmpeg";
  const ffprobe = process.env.FFPROBE_PATH ?? "ffprobe";
  // Hyperframes finds FFmpeg on PATH, so make an explicit location visible to it too.
  if (process.env.FFMPEG_PATH) {
    process.env.PATH = `${path.dirname(process.env.FFMPEG_PATH)}${path.delimiter}${process.env.PATH ?? ""}`;
  }
  return { ffmpeg, ffprobe };
}

function loadKey(): string | undefined {
  if (!process.env.GEMINI_API_KEY && existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return undefined;
  return key;
}

function intFlag(name: string, raw: string | undefined, max: number): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > max) {
    throw new Error(`--${name} must be an integer from 1 to ${String(max)}.`);
  }
  return value;
}

async function main() {
  const languageId = values.language ?? "pl";
  const repos = await loadContentRepositories(DEFAULT_CONTENT_ROOT);
  const plan = await loadMediaPlan(DEFAULT_CONTENT_ROOT, languageId);
  const language = await repos.contentRepository.findLanguage(languageId as never);
  const localeOf = (lang: string) => (lang === language?.code ? language.locale : lang);
  const tools = ffmpegTools();
  const model = process.env.GEMINI_TTS_MODEL ?? DEFAULT_MODEL;

  const filter = {
    only: values.only
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    kinds: {
      lessons: values.lessons || (!values.lessons && !values.vocabulary),
      vocabulary: values.vocabulary || (!values.lessons && !values.vocabulary),
    },
    maxPriority: intFlag("priority", values.priority, 3),
    category: values.category,
  };

  const draft = values.draft === true;
  const mediaRoot = draft
    ? path.join(BUILD_ROOT, "draft-media")
    : path.join(DEFAULT_CONTENT_ROOT, "media");
  const manifest = new FileMediaManifestRepository(mediaRoot);

  const providers = new Map<string, AudioGenerationService>();
  /**
   * Paces provider calls for a batch (M21): the project's Gemini quota answered 429 after ~13 calls
   * in 30 s (limits are per account tier and only shown in AI Studio), and the adapter's own
   * retries cap their wait at 8 s. So: at most one request per MEDIA_TTS_MIN_INTERVAL_MS (default
   * 6.5 s ≈ 9/min); on a 429 wait the full Retry-After and try again, at most 4 times; a wait over
   * 2 minutes (e.g. a daily quota) is not waited out — the 429 goes back to the adapter, which
   * fails the target. Logs status codes only — never the key, the request or the body.
   */
  const minIntervalMs = Number(process.env.MEDIA_TTS_MIN_INTERVAL_MS ?? 6500);
  const MAX_RATE_LIMIT_WAITS = 4;
  const MAX_RETRY_AFTER_S = 120;
  const ATTEMPT_TIMEOUT_MS = 45_000;
  let nextSlot = 0;
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const loggingFetch: typeof fetch = async (input, init) => {
    for (let attempt = 0; ; attempt += 1) {
      const now = Date.now();
      if (nextSlot > now) await wait(nextSlot - now);
      nextSlot = Date.now() + minIntervalMs;
      // Each network attempt gets its own timeout; the adapter's overall one covers the waits.
      const signal = init?.signal
        ? AbortSignal.any([init.signal, AbortSignal.timeout(ATTEMPT_TIMEOUT_MS)])
        : AbortSignal.timeout(ATTEMPT_TIMEOUT_MS);
      const response = await fetch(input, { ...init, signal });
      if (response.status === 200) return response;
      const retryAfter = Number(response.headers.get("retry-after") ?? "");
      out(
        `  provider answered HTTP ${String(response.status)}${Number.isFinite(retryAfter) && retryAfter > 0 ? ` (retry-after ${String(retryAfter)}s)` : ""}`,
      );
      const waitable =
        response.status === 429 &&
        Number.isFinite(retryAfter) &&
        retryAfter > 0 &&
        retryAfter <= MAX_RETRY_AFTER_S;
      if (!waitable || attempt >= MAX_RATE_LIMIT_WAITS) return response;
      await response.body?.cancel();
      out(`  waiting ${String(retryAfter)} s as the provider asked`);
      nextSlot = Date.now() + (retryAfter + 1) * 1000;
    }
  };
  const modeFor = (key: string | undefined): NarrationMode =>
    draft
      ? { kind: "draft" }
      : {
          kind: "provider",
          model,
          providerFor: (narratorId) => {
            if (!key)
              throw new Error(
                "GEMINI_API_KEY is not configured (see docs/m21-content-generation.md).",
              );
            let provider = providers.get(narratorId);
            if (!provider) {
              const narrator = plan.narrators.get(narratorId);
              if (!narrator) throw new Error(`Unknown narrator ${narratorId}`);
              provider = new GeminiAudioProvider({
                apiKey: key,
                model,
                voiceName: narrator.tts.voice,
                narratorStyle: narrator.tts.style,
                // Bounds one clip including the paced, Retry-After waits above (4 × ≤ 2 min).
                timeoutMs: 12 * 60_000,
                // The adapter's default backoff timer is unref'd (right inside the API server). In
                // this standalone command nothing else keeps Node alive, so a retry wait would end
                // the process silently with exit code 0 — wait on a normal timer instead.
                sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
                fetch: loggingFetch,
              });
              providers.set(narratorId, provider);
            }
            return provider;
          },
        };
  const synthesizer = (key: string | undefined, root = mediaRoot) =>
    new StoredNarrationSynthesizer({
      mediaRoot: root,
      plan,
      ffmpeg: tools,
      localeOf,
      workDir: path.join(BUILD_ROOT, "work"),
      mode: modeFor(key),
    });

  switch (command) {
    case "doctor": {
      const key = loadKey();
      out(`Hyperframes        ${HYPERFRAMES_VERSION} (pinned devDependency)`);
      out(`FFmpeg             ${tools.ffmpeg}`);
      out(
        `Media plan         ${String(plan.narrators.size)} narrators, ${String(plan.plan.lessons.length)} lessons, ${String(plan.plan.vocabularyCategories.length)} vocabulary categories`,
      );
      out(`TTS model          ${model}`);
      out(`GEMINI_API_KEY     ${key ? "configured" : "NOT configured"}`);
      out(
        `Key file ignored   ${existsSync(ENV_FILE) ? "present (git-ignored by .env.*)" : "absent"}`,
      );
      return;
    }
    case "plan": {
      const { targets, blocked } = await planMediaTargets(repos, plan, filter);
      const synth = synthesizer(undefined);
      const clipIndex = path.join(mediaRoot, languageId, "audio", "clips.json");
      const clips = existsSync(clipIndex)
        ? (JSON.parse(await readFile(clipIndex, "utf8")) as Record<string, unknown>)
        : {};
      const useCase = useCaseFor(
        synth,
        manifest,
        mediaRoot,
        tools,
        localeOf,
        draft ? "draft-silence" : `gemini:${model}`,
      );
      const seen = new Set<string>();
      let newLines = 0;
      for (const t of targets) {
        const entry = await manifest.get(t.key);
        const upToDate =
          entry?.published?.video && entry.sourceHash === useCase.sourceHashOf(t.script);
        let fresh = 0;
        for (const line of narrationOf(t.script)) {
          const k = createHash("sha256")
            .update(
              JSON.stringify([
                synth.fingerprint(voiceOf(t.script, line)),
                line.language,
                line.text.replace(/\s+/g, " ").trim(),
              ]),
            )
            .digest("hex")
            .slice(0, 16);
          if (!(k in clips) && !seen.has(k)) {
            seen.add(k);
            fresh += 1;
          }
        }
        if (!upToDate) newLines += fresh;
        out(
          `${t.key.padEnd(34)} p${String(t.priority)}  ${(upToDate ? "up to date" : entry?.published?.video ? "outdated" : entry?.lastRun.status === "failed" ? "failed" : "missing").padEnd(10)}  ${String(fresh).padStart(3)} new clips  ${t.label}`,
        );
      }
      for (const b of blocked) out(`${b.key.padEnd(34)} BLOCKED     ${b.label} — ${b.reason}`);
      out();
      out(
        `${String(targets.length)} targets, ${String(blocked.length)} blocked; generating the missing/outdated ones needs about ${String(newLines)} provider calls.`,
      );
      return;
    }
    case "audition": {
      const key = loadKey();
      const synth = synthesizer(key, path.join(BUILD_ROOT, "audition"));
      const sample = await firstExamplePhrase(repos, languageId);
      const only = values.only?.split(",").map((v) => v.trim());
      for (const narratorId of plan.narrators.keys()) {
        if (only && !only.includes(narratorId)) continue;
        for (const line of [
          { text: "Hello. In this lesson you will learn how to greet people.", language: "en" },
          { text: sample, language: languageId },
        ]) {
          const clip = await synth.synthesize({
            narratorId,
            text: line.text,
            language: line.language as LanguageId,
          });
          const f0 = await medianPitchHz(tools, path.join(BUILD_ROOT, "audition", clip.path));
          out(
            `${narratorId.padEnd(8)} ${line.language}  ${clip.durationSeconds.toFixed(2)} s  median pitch ${f0 ? `${String(f0)} Hz` : "n/a"}  .media-build/audition/${clip.path}`,
          );
        }
      }
      out(`Provider calls: ${String(synth.providerCalls)}`);
      return;
    }
    case "compose": {
      // Review aid: build scripts, synthesize (draft silence unless real audio already exists),
      // and write the Hyperframes projects without rendering — frames can then be inspected fast.
      const { targets, blocked } = await planMediaTargets(repos, plan, filter);
      for (const b of blocked) out(`${b.key.padEnd(34)} BLOCKED — ${b.reason}`);
      const synth = synthesizer(draft ? undefined : loadKey());
      const renderer = new HyperframesVideoRenderer({
        mediaRoot,
        buildRoot: path.join(BUILD_ROOT, "projects"),
        ffmpeg: tools,
        localeOf,
      });
      for (const t of targets) {
        const clips = [];
        for (const line of narrationOf(t.script)) {
          clips.push(
            await synth.synthesize({
              narratorId: voiceOf(t.script, line),
              text: line.text,
              language: line.language,
            }),
          );
        }
        const timeline = planVideoTimeline(t.script, clips);
        const dir = await renderer.writeProject(t.script, timeline);
        out(
          `${t.key.padEnd(34)} ${timeline.durationSeconds.toFixed(1)} s  ${path.relative(REPO_ROOT, dir)}`,
        );
        for (const scene of timeline.scenes)
          out(
            `    scene ${String(scene.index)} ${t.script.scenes[scene.index]?.kind ?? ""} ${scene.start.toFixed(1)}–${(scene.start + scene.duration).toFixed(1)}`,
          );
      }
      out(`Provider calls: ${String(synth.providerCalls)}`);
      return;
    }
    case "generate": {
      const key = draft ? undefined : loadKey();
      if (!draft && !key) {
        throw new Error(
          "GEMINI_API_KEY is not configured. Use --draft to check layout without any provider call.",
        );
      }
      const limit = intFlag("limit", values.limit, MAX_LIMIT);
      const maxCalls = intFlag("max-calls", values["max-calls"], MAX_CALLS_CEILING);
      const { targets, blocked } = await planMediaTargets(repos, plan, filter);
      for (const b of blocked) out(`${b.key.padEnd(34)} BLOCKED — ${b.reason}`);
      if (targets.length > limit && !values.yes) {
        out(
          `${String(targets.length)} targets match; at most ${String(limit)} will be generated this run (--limit).`,
        );
      }
      await mkdir(BUILD_ROOT, { recursive: true });
      const synth = synthesizer(key);
      const useCase = useCaseFor(
        synth,
        manifest,
        mediaRoot,
        tools,
        localeOf,
        draft ? "draft-silence" : `gemini:${model}`,
        (k, status, detail) => {
          out(
            `${new Date().toISOString().slice(11, 19)}  ${k.padEnd(34)} ${status}${detail ? ` — ${detail}` : ""}`,
          );
        },
      );
      const outcomes = await useCase.execute({
        targets,
        force: values.force === true,
        maxItems: limit,
        maxProviderCalls: maxCalls,
      });
      out();
      for (const o of outcomes) {
        out(
          `${o.key.padEnd(34)} ${o.status.padEnd(8)} calls=${String(o.providerCalls)}${o.durationSeconds ? ` ${o.durationSeconds.toFixed(1)} s` : ""}${o.reason ? ` (${o.reason})` : ""}`,
        );
      }
      out(
        `Provider calls this run: ${String(synth.providerCalls)}${draft ? " (draft: none are real)" : ""}`,
      );
      if (outcomes.some((o) => o.status === "failed")) process.exitCode = 1;
      return;
    }
    default:
      out(
        "Usage: media <doctor|plan|audition|generate> [--lessons|--vocabulary|--only type:id,...] [--category id] [--priority 1-3] [--limit n] [--max-calls n] [--force] [--draft]",
      );
      process.exitCode = command === "help" ? 0 : 2;
  }
}

function useCaseFor(
  synth: StoredNarrationSynthesizer,
  manifest: FileMediaManifestRepository,
  mediaRoot: string,
  tools: FfmpegTools,
  localeOf: (language: string) => string,
  audioGenerator: string,
  onProgress?: (key: string, status: MediaRunStatus, detail?: string) => void,
) {
  const renderer = new HyperframesVideoRenderer({
    mediaRoot,
    buildRoot: path.join(BUILD_ROOT, "projects"),
    ffmpeg: tools,
    localeOf,
  });
  return new GenerateContentMediaUseCase({
    manifest,
    narration: synth,
    renderer,
    clock: new SystemClock(),
    hash: (s) => createHash("sha256").update(s).digest("hex"),
    generatorNames: { audio: audioGenerator, video: renderer.version },
    ...(onProgress ? { onProgress } : {}),
  });
}

async function firstExamplePhrase(
  repos: Awaited<ReturnType<typeof loadContentRepositories>>,
  languageId: string,
) {
  const levels = await repos.contentRepository.listLanguageLevels(languageId as never);
  for (const level of levels) {
    for (const item of await repos.contentRepository.listContent(
      languageId as never,
      level.levelId,
    )) {
      const block = item.blocks.find((b) => b.type === "example");
      if (block?.type === "example") return block.text;
    }
  }
  throw new Error("No example phrase in the content to audition with.");
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});

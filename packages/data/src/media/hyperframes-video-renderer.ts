import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

import {
  captionCues,
  type EducationalVideoRenderer,
  type RenderedVideo,
  type VideoTimeline,
} from "@tfm-bic/application";
import type { VideoScript } from "@tfm-bic/domain";

import { HyperframesCliProvider } from "../video/hyperframes-cli.provider.js";
import { extractPoster, fastStart, type FfmpegTools } from "./ffmpeg.js";
import {
  HEIGHT,
  TEMPLATE_VERSION,
  WIDTH,
  buildComposition,
  buildWebVtt,
} from "./hyperframes-composition.js";

const require = createRequire(import.meta.url);

export const HYPERFRAMES_VERSION: string = (
  require("hyperframes/package.json") as { version: string }
).version;

export interface HyperframesVideoRendererOptions {
  /** The committed media root (content/media). Clips are read from it; outputs are written to it. */
  mediaRoot: string;
  /** Scratch folder for render projects (git-ignored). */
  buildRoot: string;
  ffmpeg: FfmpegTools;
  localeOf: (language: string) => string;
  /** Verified `render` flags; defaults suit short flat-graphics lesson videos. */
  renderArgs?: readonly string[];
  timeoutMs?: number;
}

/** Keeps a render and its encoder quiet about telemetry (documented opt-out, see ADR-031). */
export function disableHyperframesTelemetry(env: NodeJS.ProcessEnv = process.env) {
  env.HYPERFRAMES_NO_TELEMETRY = "1";
  env.DO_NOT_TRACK = "1";
}

const DEFAULT_RENDER_ARGS = ["--fps", "30", "--quality", "standard", "--workers", "2", "--quiet"];

/**
 * Renders a video script with Hyperframes (M21, ADR-031): writes a self-contained render project
 * (composition, self-hosted font, GSAP, the narration clips), renders it through the existing
 * `HyperframesCliProvider` (M11's adapter, started via the pinned package's bin so it also works
 * on Windows), then moves the MP4 index to the front for streaming, extracts a poster frame and
 * writes WebVTT captions from the timeline. Output names carry a content hash, so a published
 * file never changes under the same URL and can be cached forever.
 */
export class HyperframesVideoRenderer implements EducationalVideoRenderer {
  readonly version = `hyperframes@${HYPERFRAMES_VERSION}/template-${String(TEMPLATE_VERSION)}`;
  private readonly provider: HyperframesCliProvider;

  constructor(private readonly options: HyperframesVideoRendererOptions) {
    disableHyperframesTelemetry();
    this.provider = new HyperframesCliProvider({
      videoScriptsRoot: options.buildRoot,
      command: {
        file: process.execPath,
        args: [require.resolve("hyperframes/bin/hyperframes.mjs")],
      },
      renderArgs: options.renderArgs ?? DEFAULT_RENDER_ARGS,
      timeoutMs: options.timeoutMs ?? 20 * 60 * 1000,
    });
  }

  async render(input: {
    script: VideoScript;
    timeline: VideoTimeline;
    outputDir: string;
  }): Promise<RenderedVideo> {
    const { script, timeline } = input;
    const slug = `${script.content.type}-${script.content.id}`;
    const project = path.join(this.options.buildRoot, slug);
    await rm(project, { recursive: true, force: true });
    await mkdir(path.join(project, "fonts"), { recursive: true });
    await mkdir(path.join(project, "audio"), { recursive: true });

    const fontDir = path.dirname(
      require.resolve("@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2"),
    );
    await copyFile(
      path.join(fontDir, "bricolage-grotesque-latin-wght-normal.woff2"),
      path.join(project, "fonts", "latin.woff2"),
    );
    await copyFile(
      path.join(fontDir, "bricolage-grotesque-latin-ext-wght-normal.woff2"),
      path.join(project, "fonts", "latin-ext.woff2"),
    );
    await copyFile(require.resolve("gsap/dist/gsap.min.js"), path.join(project, "gsap.min.js"));

    const clipFiles = new Map<string, string>();
    for (const line of timeline.lines) {
      if (clipFiles.has(line.clipPath)) continue;
      const name = `audio/${path.basename(line.clipPath)}`;
      await copyFile(path.join(this.options.mediaRoot, line.clipPath), path.join(project, name));
      clipFiles.set(line.clipPath, name);
    }

    const html = buildComposition(script, timeline, {
      locale: this.options.localeOf(script.targetLanguage),
      clipSrc: (clipPath) => clipFiles.get(clipPath) ?? clipPath,
    });
    await writeFile(path.join(project, "index.html"), html, "utf8");

    const result = await this.provider.generate({
      videoDefinitionId: slug,
      scriptPath: slug,
      title: script.title,
    });

    const bytes = await readFile(result.mediaReference);
    const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
    const outDir = path.join(this.options.mediaRoot, input.outputDir);
    await mkdir(outDir, { recursive: true });
    // Replace the previous render of this content: old hashed files are removed, not orphaned.
    for (const old of await readdir(outDir).catch(() => [] as string[])) {
      if (/^(video|poster|captions)-[0-9a-f]{12}\./.test(old)) await rm(path.join(outDir, old));
    }

    const videoName = `video-${hash}.mp4`;
    const posterName = `poster-${hash}.jpg`;
    const captionsName = `captions-${hash}.vtt`;
    await fastStart(this.options.ffmpeg, result.mediaReference, path.join(outDir, videoName));

    // Poster: the first moment the main subject is fully on screen (second scene), else 1.5 s in.
    const second = timeline.scenes[1];
    const posterAt = second ? second.start + Math.min(2.5, second.duration / 2) : 1.5;
    await extractPoster(
      this.options.ffmpeg,
      path.join(outDir, videoName),
      posterAt,
      path.join(outDir, posterName),
    );
    await writeFile(path.join(outDir, captionsName), buildWebVtt(captionCues(timeline)), "utf8");

    const rel = (name: string) => `${input.outputDir}/${name}`.replaceAll("\\", "/");
    return {
      videoPath: rel(videoName),
      posterPath: rel(posterName),
      captionsPath: rel(captionsName),
      durationSeconds: timeline.durationSeconds,
      width: WIDTH,
      height: HEIGHT,
    };
  }
}

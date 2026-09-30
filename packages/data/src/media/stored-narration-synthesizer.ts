import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  AudioGenerationService,
  NarrationClip,
  NarrationRequest,
  NarrationSynthesizer,
} from "@tfm-bic/application";
import type { LanguageId } from "@tfm-bic/domain";

import { durationSeconds, silenceWav, transcodeToAac, type FfmpegTools } from "./ffmpeg.js";
import type { MediaPlan } from "./media-plan.js";

interface ClipRecord {
  path: string;
  durationSeconds: number;
  text: string;
  language: LanguageId;
  narratorId: string;
  fingerprint: string;
  createdAt: string;
}

export type NarrationMode =
  /** Real speech from the configured provider (one provider instance per narrator). */
  | { kind: "provider"; model: string; providerFor: (narratorId: string) => AudioGenerationService }
  /** Silence of a plausible length — to check layout and timing without any provider call. */
  | { kind: "draft" };

export interface StoredNarrationSynthesizerOptions {
  /** Where clips and their index are written (the media root, or a draft root). */
  mediaRoot: string;
  plan: MediaPlan;
  mode: NarrationMode;
  ffmpeg: FfmpegTools;
  /** Locale per language for the provider's style hint (from the catalog); falls back to the id. */
  localeOf: (language: LanguageId) => string;
  /** Scratch folder for intermediate WAV files (outside the committed tree). */
  workDir: string;
  now?: () => Date;
}

const sha = (value: string) => createHash("sha256").update(value).digest("hex");

/** Rough reading time for draft silence: ~2.6 words per second, never under a second. */
function draftSeconds(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, words / 2.6 + 0.3);
}

/**
 * Speaks narration lines with a narrator's configured voice and keeps every clip (M21, ADR-031).
 * A clip's identity is a hash of the narrator's full provider configuration, the language and the
 * exact text, so the same line said by the same narrator is generated once and reused by every
 * video and page that needs it — a word's pronunciation clip on its page is the very clip its
 * video plays. Clips are AAC (`.m4a`), indexed in `<lang>/audio/clips.json` under the media root.
 */
export class StoredNarrationSynthesizer implements NarrationSynthesizer {
  private calls = 0;
  private index: Record<string, ClipRecord> | null = null;
  private readonly indexFile: string;

  constructor(private readonly options: StoredNarrationSynthesizerOptions) {
    this.indexFile = path.join(options.mediaRoot, options.plan.languageId, "audio", "clips.json");
  }

  get providerCalls(): number {
    return this.calls;
  }

  displayName(narratorId: string): string {
    return this.narrator(narratorId).displayName;
  }

  fingerprint(narratorId: string): string {
    if (this.options.mode.kind === "draft") return "draft";
    const { tts } = this.narrator(narratorId);
    return sha(JSON.stringify({ ...tts, model: this.options.mode.model })).slice(0, 16);
  }

  private narrator(narratorId: string) {
    const narrator = this.options.plan.narrators.get(narratorId);
    if (!narrator) throw new Error(`Unknown narrator ${narratorId}`);
    return narrator;
  }

  private async loadIndex(): Promise<Record<string, ClipRecord>> {
    if (this.index) return this.index;
    try {
      this.index = JSON.parse(await readFile(this.indexFile, "utf8")) as Record<string, ClipRecord>;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      this.index = {};
    }
    return this.index;
  }

  private async saveIndex(index: Record<string, ClipRecord>) {
    const sorted = Object.fromEntries(Object.entries(index).sort(([a], [b]) => a.localeCompare(b)));
    await mkdir(path.dirname(this.indexFile), { recursive: true });
    await writeFile(`${this.indexFile}.tmp`, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
    await rename(`${this.indexFile}.tmp`, this.indexFile);
  }

  async synthesize(request: NarrationRequest): Promise<NarrationClip> {
    const text = request.text.replace(/\s+/g, " ").trim();
    if (text.length === 0) throw new Error("Empty narration line.");
    const fingerprint = this.fingerprint(request.narratorId);
    const key = sha(JSON.stringify([fingerprint, request.language, text])).slice(0, 16);
    const index = await this.loadIndex();

    const existing = index[key];
    if (existing) {
      return {
        path: existing.path,
        durationSeconds: existing.durationSeconds,
        text,
        language: request.language,
        narratorId: request.narratorId,
        reused: true,
      };
    }

    const relative = `${this.options.plan.languageId}/audio/${request.narratorId}/${key}.m4a`;
    const output = path.join(this.options.mediaRoot, relative);
    await mkdir(path.dirname(output), { recursive: true });
    await mkdir(this.options.workDir, { recursive: true });
    const wav = path.join(this.options.workDir, `${key}.wav`);

    if (this.options.mode.kind === "draft") {
      await silenceWav(this.options.ffmpeg, draftSeconds(text), wav);
    } else {
      const provider = this.options.mode.providerFor(request.narratorId);
      this.calls += 1;
      const audio = await provider.generate({
        text,
        languageId: request.language,
        locale: this.options.localeOf(request.language),
        voice: "standard",
      });
      await writeFile(wav, audio.data);
    }

    await transcodeToAac(this.options.ffmpeg, wav, output);
    await rm(wav, { force: true });
    const seconds = await durationSeconds(this.options.ffmpeg, output);

    index[key] = {
      path: relative,
      durationSeconds: seconds,
      text,
      language: request.language,
      narratorId: request.narratorId,
      fingerprint,
      createdAt: (this.options.now?.() ?? new Date()).toISOString(),
    };
    await this.saveIndex(index);
    return {
      path: relative,
      durationSeconds: seconds,
      text,
      language: request.language,
      narratorId: request.narratorId,
      reused: false,
    };
  }
}

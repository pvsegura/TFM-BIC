import {
  mediaContentKey,
  narrationOf,
  type AudioAsset,
  type AudioPurpose,
  type LanguageId,
  type TranscriptLine,
  type VideoAsset,
  type VideoScript,
} from "@tfm-bic/domain";

import type { Clock } from "../ports/clock.js";
import { planVideoTimeline } from "./plan-video-timeline.js";
import type {
  EducationalVideoRenderer,
  MediaManifestEntry,
  MediaManifestRepository,
  MediaRunStatus,
  NarrationClip,
  NarrationSynthesizer,
} from "./ports/media-generation-ports.js";

/** A standalone clip published next to the video (e.g. a word's pronunciation). */
export interface PronunciationRequest {
  purpose: AudioPurpose;
  text: string;
  language: LanguageId;
}

export interface MediaTarget {
  script: VideoScript;
  pronunciations: PronunciationRequest[];
  /** Where the target's files go, relative to the media root. */
  outputDir: string;
}

export interface GenerateContentMediaInput {
  targets: MediaTarget[];
  /** Regenerate even when an up-to-date asset exists. Never the default. */
  force: boolean;
  /** At most this many targets are *generated* in one run (skips do not count). */
  maxItems: number;
  /** Stop before a target when the run has made this many provider calls. */
  maxProviderCalls: number;
}

export interface TargetOutcome {
  key: string;
  status: Extract<MediaRunStatus, "ready" | "failed" | "skipped">;
  reason?: string;
  providerCalls: number;
  durationSeconds?: number;
}

export interface GenerateContentMediaDependencies {
  manifest: MediaManifestRepository;
  narration: NarrationSynthesizer;
  renderer: EducationalVideoRenderer;
  clock: Clock;
  /** A stable content hash (e.g. SHA-256 hex) — injected so this layer stays platform-free. */
  hash: (input: string) => string;
  generatorNames: { audio: string; video: string };
  onProgress?: (key: string, status: MediaRunStatus, detail?: string) => void;
}

const MAX_ERROR_LENGTH = 300;

/**
 * The offline generation pipeline (M21, ADR-031): for each target, decide whether its published
 * media is up to date (idempotency by source hash), and if not synthesize the narration (reusing
 * identical clips), plan the timeline from the real clip durations, render, and publish the result
 * in the manifest. States per target: requested → generating-audio → rendering → ready | failed.
 *
 * Cost controls live here, not in a UI: nothing runs unless an operator asks; up-to-date targets
 * are skipped without any provider call; `maxItems` bounds a batch; `maxProviderCalls` stops the
 * run before it can exceed its budget; a failure is recorded and the run moves on — it is never
 * retried in a loop (the audio adapter's own retries are bounded).
 */
export class GenerateContentMediaUseCase {
  constructor(private readonly deps: GenerateContentMediaDependencies) {}

  sourceHashOf(script: VideoScript): string {
    return this.deps.hash(
      JSON.stringify({
        script,
        narrator: this.deps.narration.fingerprint(script.narratorId),
        renderer: this.deps.renderer.version,
      }),
    );
  }

  async execute(input: GenerateContentMediaInput): Promise<TargetOutcome[]> {
    const outcomes: TargetOutcome[] = [];
    let generated = 0;

    for (const target of input.targets) {
      const key = mediaContentKey(target.script.content);
      const existing = await this.deps.manifest.get(key);
      const sourceHash = this.sourceHashOf(target.script);

      if (!input.force && existing?.published?.video && existing.sourceHash === sourceHash) {
        this.deps.onProgress?.(key, "skipped", "up to date");
        outcomes.push({ key, status: "skipped", reason: "up to date", providerCalls: 0 });
        continue;
      }
      if (generated >= input.maxItems) {
        outcomes.push({ key, status: "skipped", reason: "batch limit reached", providerCalls: 0 });
        continue;
      }
      if (this.deps.narration.providerCalls >= input.maxProviderCalls) {
        outcomes.push({
          key,
          status: "skipped",
          reason: "provider-call budget reached",
          providerCalls: 0,
        });
        continue;
      }

      generated += 1;
      outcomes.push(await this.generateOne(target, existing, sourceHash));
    }
    return outcomes;
  }

  private async generateOne(
    target: MediaTarget,
    existing: MediaManifestEntry | undefined,
    sourceHash: string,
  ): Promise<TargetOutcome> {
    const { script } = target;
    const key = mediaContentKey(script.content);
    const callsBefore = this.deps.narration.providerCalls;
    const now = () => this.deps.clock.now().toISOString();
    this.deps.onProgress?.(key, "requested");

    try {
      this.deps.onProgress?.(key, "generating-audio");
      const clips: NarrationClip[] = [];
      for (const line of narrationOf(script)) {
        clips.push(
          await this.deps.narration.synthesize({
            narratorId: script.narratorId,
            text: line.text,
            language: line.language,
          }),
        );
      }
      const pronunciationClips: { request: PronunciationRequest; clip: NarrationClip }[] = [];
      for (const request of target.pronunciations) {
        const clip = await this.deps.narration.synthesize({
          narratorId: script.narratorId,
          text: request.text,
          language: request.language,
        });
        pronunciationClips.push({ request, clip });
      }

      this.deps.onProgress?.(key, "rendering");
      const timeline = planVideoTimeline(script, clips);
      const rendered = await this.deps.renderer.render({
        script,
        timeline,
        outputDir: target.outputDir,
      });

      const narrator = this.deps.narration.displayName(script.narratorId);
      const video: VideoAsset = {
        purpose: script.purpose,
        url: rendered.videoPath,
        posterUrl: rendered.posterPath,
        captionsUrl: rendered.captionsPath,
        captionsLanguage: script.instructionLanguage,
        durationSeconds: rendered.durationSeconds,
        width: rendered.width,
        height: rendered.height,
        narrator,
        transcript: transcriptOf(script),
      };
      const audio: AudioAsset[] = pronunciationClips.map(({ request, clip }) => ({
        purpose: request.purpose,
        url: clip.path,
        durationSeconds: clip.durationSeconds,
        text: clip.text,
        language: clip.language,
        narrator,
      }));

      const providerCalls = this.deps.narration.providerCalls - callsBefore;
      await this.deps.manifest.put({
        key,
        content: script.content,
        published: { video, audio },
        sourceHash,
        narratorId: script.narratorId,
        lastRun: { status: "ready", at: now(), providerCalls },
        generator: this.deps.generatorNames,
        createdAt: existing?.createdAt ?? now(),
        updatedAt: now(),
      });
      this.deps.onProgress?.(key, "ready");
      return { key, status: "ready", providerCalls, durationSeconds: rendered.durationSeconds };
    } catch (error) {
      const message = (error instanceof Error ? error.message : String(error)).slice(
        0,
        MAX_ERROR_LENGTH,
      );
      const providerCalls = this.deps.narration.providerCalls - callsBefore;
      await this.deps.manifest.put({
        key,
        content: script.content,
        // A failed regeneration never takes down what learners can already watch.
        published: existing?.published ?? null,
        sourceHash: existing?.sourceHash ?? null,
        narratorId: script.narratorId,
        lastRun: { status: "failed", at: now(), error: message, providerCalls },
        generator: this.deps.generatorNames,
        createdAt: existing?.createdAt ?? now(),
        updatedAt: now(),
      });
      this.deps.onProgress?.(key, "failed", message);
      return { key, status: "failed", reason: message, providerCalls };
    }
  }
}

/** What the video says and shows, as text, for the transcript next to the player. */
export function transcriptOf(script: VideoScript): TranscriptLine[] {
  const lines: TranscriptLine[] = [];
  for (const scene of script.scenes) {
    if (scene.kind === "phrase") {
      lines.push({
        text: scene.phrase.text,
        language: script.targetLanguage,
        translation: scene.phrase.translation,
      });
      if (scene.phrase.note)
        lines.push({ text: scene.phrase.note, language: script.instructionLanguage });
      continue;
    }
    if (scene.kind === "dialogue") {
      for (const line of scene.lines) {
        lines.push({
          text: `${line.speaker}: ${line.text}`,
          language: script.targetLanguage,
          translation: line.translation,
        });
      }
      continue;
    }
    if (scene.kind === "word") {
      lines.push({ text: scene.word, language: script.targetLanguage, translation: scene.meaning });
      for (const fact of scene.facts) {
        lines.push({ text: `${fact.label}: ${fact.value}`, language: script.instructionLanguage });
      }
      continue;
    }
    if (scene.kind === "recap") {
      continue;
    }
    for (const line of scene.narration) {
      lines.push({ text: line.text, language: line.language });
    }
  }
  return lines;
}

import {
  mediaContentKey,
  narrationOf,
  voiceOf,
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
  /** The cast member whose voice says it (default: the narrator) — the same clip the video uses. */
  speaker?: string | undefined;
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
        // Every voice the video uses: changing any character's voice makes the video stale.
        voices: [...new Set(narrationOf(script).map((line) => voiceOf(script, line)))]
          .sort()
          .map((voice) => this.deps.narration.fingerprint(voice)),
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
            // Each line in its speaker's voice profile: the same profile for a character (or the
            // narrator) everywhere in this video — configuration consistency, see ADR-031/032.
            narratorId: voiceOf(script, line),
            text: line.text,
            language: line.language,
          }),
        );
      }
      const pronunciationClips: { request: PronunciationRequest; clip: NarrationClip }[] = [];
      for (const request of target.pronunciations) {
        const clip = await this.deps.narration.synthesize({
          narratorId: voiceOf(script, {
            text: request.text,
            language: request.language,
            speaker: request.speaker,
          }),
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
        transcript: transcriptOf(script, (voice) => this.deps.narration.displayName(voice)),
        objective: script.objective,
        targetVocabularyIds: script.targetVocabularyIds,
      };
      const audio: AudioAsset[] = pronunciationClips.map(({ request, clip }) => ({
        purpose: request.purpose,
        url: clip.path,
        durationSeconds: clip.durationSeconds,
        text: clip.text,
        language: clip.language,
        narrator: this.deps.narration.displayName(clip.narratorId),
      }));

      const providerCalls = this.deps.narration.providerCalls - callsBefore;
      await this.deps.manifest.put({
        key,
        content: script.content,
        published: { video, audio },
        sourceHash,
        narratorId: script.narratorId,
        version: (existing?.version ?? (existing?.published ? 1 : 0)) + 1,
        scriptVersion: script.scriptVersion,
        pedagogy: {
          objective: script.objective,
          level: script.level,
          targetVocabularyIds: script.targetVocabularyIds,
          targetPhrases: script.targetPhrases,
          segments: [...new Set(script.scenes.map((scene) => scene.segment))],
          retrievalMoments: script.scenes.filter((scene) => scene.kind === "retrieval").length,
          voices: script.cast.map((member) => ({ character: member.name, voice: member.voice })),
        },
        previous: existing?.published
          ? [
              {
                version: existing.version ?? 1,
                sourceHash: existing.sourceHash,
                scriptVersion: existing.scriptVersion ?? 1,
                generatedAt: existing.updatedAt,
              },
              ...(existing.previous ?? []),
            ].slice(0, 5)
          : existing?.previous,
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
        version: existing?.version,
        scriptVersion: existing?.scriptVersion,
        pedagogy: existing?.pedagogy,
        previous: existing?.previous,
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

/**
 * What the video says, in order, for the transcript next to the player: each line with its speaker
 * and, for target-language lines, the meaning shown on screen. A retrieval moment's prompt is followed
 * by "(pause)" so the transcript reflects the moment to recall; its repeated answer appears once.
 */
export function transcriptOf(
  script: VideoScript,
  displayName: (voiceProfileId: string) => string,
): TranscriptLine[] {
  const lines: TranscriptLine[] = [];
  const nameOf = (speaker: string | undefined) =>
    speaker && speaker !== "narrator"
      ? (script.cast.find((c) => c.id === speaker)?.name ?? speaker)
      : `Narrator (${displayName(script.narratorId)})`;
  for (const scene of script.scenes) {
    const meaningFor = (text: string): string | undefined => {
      if (scene.kind === "situation") {
        return scene.beats.find((b) => b.card?.text === text)?.card?.meaning;
      }
      if (scene.kind === "focus" && scene.phrase === text) return scene.meaning;
      if (scene.kind === "retrieval" && scene.answer.text === text) return scene.answer.meaning;
      if (scene.kind === "contrast") return scene.items.find((i) => i.word === text)?.meaning;
      return undefined;
    };
    scene.narration.forEach((line, index) => {
      if (scene.kind === "retrieval" && index === 3) return;
      const translation =
        line.language === script.targetLanguage ? meaningFor(line.text) : undefined;
      lines.push({
        text: scene.kind === "retrieval" && index === 0 ? `${line.text} (pause)` : line.text,
        language: line.language,
        speaker: nameOf(line.speaker),
        ...(translation ? { translation } : {}),
      });
    });
  }
  return lines;
}

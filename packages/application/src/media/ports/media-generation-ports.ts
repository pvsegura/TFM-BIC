import type {
  AudioAsset,
  ContentMedia,
  LanguageId,
  MediaContentRef,
  VideoAsset,
  VideoScript,
} from "@tfm-bic/domain";

import type { VideoTimeline } from "../plan-video-timeline.js";

/**
 * Ports of the offline media pipeline (M21, ADR-031). The pipeline runs as an operator command —
 * never from an HTTP request — so none of these are reachable from a page visit.
 */

/** One synthesized, stored narration clip. `path` is relative to the media root. */
export interface NarrationClip {
  path: string;
  durationSeconds: number;
  text: string;
  language: LanguageId;
  narratorId: string;
  /** True when an identical clip already existed and no provider call was made. */
  reused: boolean;
}

export interface NarrationRequest {
  narratorId: string;
  text: string;
  language: LanguageId;
}

/**
 * Speaks a line with a narrator's voice and stores the clip. Implementations must reuse an
 * identical clip (same narrator configuration, language and text) instead of calling the
 * provider again — that is the pipeline's main cost control.
 */
export interface NarrationSynthesizer {
  synthesize(request: NarrationRequest): Promise<NarrationClip>;
  /** Provider calls made so far by this instance (reuses excluded). */
  readonly providerCalls: number;
  /** A fingerprint of the narrator's provider configuration, part of every video's source hash. */
  fingerprint(narratorId: string): string;
  displayName(narratorId: string): string;
}

export interface RenderedVideo {
  /** Paths relative to the media root. */
  videoPath: string;
  posterPath: string;
  captionsPath: string;
  durationSeconds: number;
  width: number;
  height: number;
}

/** Turns a script and its timed narration into a stored video, poster and captions file. */
export interface EducationalVideoRenderer {
  /** Identifies the renderer and its template version; part of every video's source hash. */
  readonly version: string;
  render(input: {
    script: VideoScript;
    timeline: VideoTimeline;
    /** Where the output files go, relative to the media root (e.g. "pl/lesson/pl-greetings"). */
    outputDir: string;
  }): Promise<RenderedVideo>;
}

export type MediaRunStatus =
  "requested" | "generating-audio" | "rendering" | "ready" | "failed" | "skipped";

export interface MediaManifestEntry {
  key: string;
  content: MediaContentRef;
  /** What is published for learners. Kept when a later regeneration fails. */
  published: { video?: VideoAsset | undefined; audio: AudioAsset[] } | null;
  /** Hash of everything the published video was made from (script, narrator, renderer). */
  sourceHash: string | null;
  narratorId: string;
  /** Increments with every successful generation of this content's video (M22). */
  version?: number | undefined;
  scriptVersion?: number | undefined;
  /** What the published video teaches and how (M22) — for operators, future review, teachers. */
  pedagogy?:
    | {
        objective: string;
        level?: string | undefined;
        targetVocabularyIds: string[];
        targetPhrases: string[];
        segments: string[];
        retrievalMoments: number;
        voices: { character: string; voice: string }[];
      }
    | undefined;
  /** Earlier published versions (newest first, at most five). */
  previous?:
    | { version: number; sourceHash: string | null; scriptVersion: number; generatedAt: string }[]
    | undefined;
  lastRun: {
    status: Exclude<MediaRunStatus, "requested" | "generating-audio" | "rendering" | "skipped">;
    at: string;
    error?: string | undefined;
    providerCalls: number;
  };
  /** Recorded for operators; never sent to the browser. */
  generator: { audio: string; video: string };
  createdAt: string;
  updatedAt: string;
}

export interface MediaManifestRepository {
  get(key: string): Promise<MediaManifestEntry | undefined>;
  put(entry: MediaManifestEntry): Promise<void>;
  list(): Promise<MediaManifestEntry[]>;
}

/** The read side used by the API: published media only. */
export interface ContentMediaCatalog {
  find(ref: Pick<MediaContentRef, "type" | "id">): ContentMedia | undefined;
  list(): ContentMedia[];
}

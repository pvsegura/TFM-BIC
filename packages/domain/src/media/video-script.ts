import type { LanguageId } from "../language/language-id.js";
import type { MediaContentRef } from "./media-asset.js";

/**
 * A structured storyboard for one educational video (M21, ADR-031), derived from content by the
 * application layer and rendered by whichever renderer the pipeline is given. Deliberately small:
 * scenes of a few known layouts, each with the lines that are spoken in it. It never contains
 * markup, provider options or timing in seconds — timing comes from the real narration clips.
 */

/** One thing said aloud. `language` decides which clip is generated; the voice is the narrator's. */
export interface NarrationLine {
  text: string;
  language: LanguageId;
  /** Silence after the line, in seconds (a beat to repeat the word, for example). */
  pauseAfter?: number | undefined;
}

/** Text shown with a phrase in the language being learned. */
export interface PhraseCard {
  text: string;
  translation: string;
  note?: string | undefined;
}

export type VideoScene =
  | {
      kind: "title";
      eyebrow: string;
      title: string;
      subtitle?: string | undefined;
      narration: NarrationLine[];
    }
  | {
      /** A paragraph of explanation, revealed sentence by sentence as it is read. */
      kind: "explanation";
      heading: string;
      sentences: string[];
      narration: NarrationLine[];
    }
  | {
      /** One phrase: shown, spoken in the target language (usually twice), then its meaning. */
      kind: "phrase";
      heading: string;
      phrase: PhraseCard;
      /** Source label when the phrase is quoted from another content item. */
      source?: string | undefined;
      /** A word inside `phrase.text` to highlight. */
      highlight?: string | undefined;
      narration: NarrationLine[];
    }
  | {
      kind: "dialogue";
      heading: string;
      lines: { speaker: string; text: string; translation: string }[];
      narration: NarrationLine[];
    }
  | {
      /** The word itself, large, with a pictogram when the content maps one. */
      kind: "word";
      word: string;
      meaning: string;
      pictogram?: string | undefined;
      facts: { label: string; value: string; spokenValue?: boolean | undefined }[];
      narration: NarrationLine[];
    }
  | {
      kind: "recap";
      heading: string;
      items: PhraseCard[];
      narration: NarrationLine[];
    }
  | {
      /** The hand-off to what the learner should do next. */
      kind: "next-step";
      heading: string;
      body: string;
      narration: NarrationLine[];
    };

export type VideoSceneKind = VideoScene["kind"];

export interface VideoScript {
  /** Bumped when the script *shape or wording rules* change, so old renders are regenerated. */
  scriptVersion: number;
  content: MediaContentRef;
  purpose: "lesson-explanation" | "vocabulary-explanation";
  /** The language on-screen explanations and narration use (the content's instruction language). */
  instructionLanguage: LanguageId;
  /** The language being learned. */
  targetLanguage: LanguageId;
  level?: string | undefined;
  title: string;
  narratorId: string;
  scenes: VideoScene[];
}

/** Every spoken line in playback order — what the audio step must synthesize. */
export function narrationOf(script: VideoScript): NarrationLine[] {
  return script.scenes.flatMap((scene) => scene.narration);
}

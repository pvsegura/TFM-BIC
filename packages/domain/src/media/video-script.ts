import type { LanguageId } from "../language/language-id.js";
import type { MediaContentRef } from "./media-asset.js";

/**
 * A pedagogical video script (M22, ADR-032; framework in docs/m22-pedagogical-framework.md): an
 * animated mini-lesson made of learning segments — situations in real places where characters act
 * and speak, focus moments on a form or a sound, pronunciation contrasts, and retrieval moments
 * (cue → silent pause → answer → self-check). Provider-free: voices are referenced by id, places,
 * looks and props by keys the renderer knows. Timing comes from the real narration clips.
 */

/** Who says a line: "narrator" (off-screen) or a cast member's id. */
export type SpeakerId = string;

export interface NarrationLine {
  text: string;
  language: LanguageId;
  /** Defaults to the narrator. */
  speaker?: SpeakerId | undefined;
  /** Silence before the line (a character walks in, an object appears, a retrieval cue). */
  leadIn?: number | undefined;
  /** Silence after the line (a beat to repeat, or the retrieval pause). */
  pauseAfter?: number | undefined;
}

/** Learning segments (framework §2); a scene belongs to exactly one. */
export type LearningSegment =
  | "situation"
  | "target"
  | "form"
  | "pronunciation"
  | "conversation"
  | "notice"
  | "retrieval"
  | "reuse"
  | "recap";

export type Environment =
  | "street"
  | "suburb"
  | "cafe"
  | "home"
  | "kitchen"
  | "bedroom"
  | "shop"
  | "station"
  | "office"
  | "school"
  | "park"
  | "airport";

export type TimeOfDay = "day" | "evening" | "night";

/** A character in the cast. `look` is a renderer preset key; `voice` a voice-profile id. */
export interface CastMember {
  id: string;
  name: string;
  look: string;
  voice: string;
}

export interface ActorPlacement {
  id: string;
  /** Horizontal position on a 1280-wide stage (feet centre). */
  x: number;
  facing: "left" | "right";
  /** Starts outside the stage (enters with an action). */
  offstage?: boolean | undefined;
  /** Seated on a chair at this position. */
  seated?: boolean | undefined;
}

export interface PropPlacement {
  id: string;
  /** Renderer prop key (e.g. "cup", "house", "apple"). */
  type: string;
  x: number;
  y: number;
  scale?: number | undefined;
  hidden?: boolean | undefined;
  /** For counted props (numbers): how many. */
  count?: number | undefined;
}

/** When an action starts, relative to the beat's line. */
export type ActionTiming = "lead" | "with" | "after";

export type StageAction =
  | { do: "enter"; actor: string; to: number }
  | { do: "exit"; actor: string; side: "left" | "right" }
  | { do: "walk"; actor: string; to: number }
  | { do: "turn"; actor: string; facing: "left" | "right" }
  | { do: "point"; actor: string; at: string }
  | { do: "raise-hand"; actor: string }
  | { do: "wave"; actor: string }
  | { do: "nod"; actor: string }
  | { do: "shake-head"; actor: string }
  | { do: "handshake"; actor: string; with: string }
  | { do: "give"; actor: string; prop: string; to: string }
  | { do: "pick-up"; actor: string; prop: string }
  | { do: "show"; prop: string }
  | { do: "hide"; prop: string }
  | { do: "highlight"; target: string }
  | { do: "sleep"; actor: string };

export interface Beat {
  /** Index into the scene's `narration`. */
  line: number;
  actions?: { when: ActionTiming; action: StageAction }[] | undefined;
  /** The spoken target-language phrase shown near its speaker, with its meaning (signaling). */
  card?: { text: string; meaning?: string | undefined } | undefined;
}

export interface Stage {
  environment: Environment;
  time?: TimeOfDay | undefined;
  actors: ActorPlacement[];
  props: PropPlacement[];
  /** Short visible sign text in the scene (e.g. a shop or school sign) — target language, validated. */
  sign?: string | undefined;
}

export type VideoScene =
  | {
      /** A place where characters act and speak; the core scene type. */
      kind: "situation";
      segment: LearningSegment;
      /** Shown briefly at the top left over the first beat (the lesson title on the opening scene). */
      overlayTitle?: string | undefined;
      stage: Stage;
      narration: NarrationLine[];
      beats: Beat[];
    }
  | {
      /** A form or a word in focus: the phrase, its meaning, an optional highlighted part and respelling. */
      kind: "focus";
      segment: LearningSegment;
      heading: string;
      phrase: string;
      meaning?: string | undefined;
      /** A substring of `phrase` to emphasise (an ending, a letter pair). */
      highlight?: string | undefined;
      /** The content's own approximate respelling, verbatim (e.g. "SHKO-wa"). */
      respelling?: string | undefined;
      /** Up to three small panels recalling earlier moments (e.g. the three uses of a word). */
      panels?: { caption: string; text: string }[] | undefined;
      narration: NarrationLine[];
    }
  | {
      /** Two sounds side by side with a simplified articulation diagram each (pronunciation). */
      kind: "contrast";
      segment: LearningSegment;
      heading: string;
      items: {
        spelling: string;
        ipa: string;
        word: string;
        meaning: string;
        articulation:
          "retroflex" | "alveolo-palatal" | "close-front" | "near-close-front" | "plain";
      }[];
      /** Narration line index at which each item is shown/heard, and the line that asks the question. */
      itemLines: number[];
      narration: NarrationLine[];
    }
  | {
      /**
       * A retrieval moment: the cue (a frozen stage, the target highlighted), a prompt, a silent pause
       * (the prompt's pauseAfter), the answer, and a self-check line.
       */
      kind: "retrieval";
      segment: LearningSegment;
      stage: Stage;
      /** Applied instantly before the scene starts (the frozen pose of the cue). */
      setup: StageAction[];
      /** Who would say the answer in the scene (for the answer card placement). */
      answerBy?: string | undefined;
      answer: { text: string; meaning?: string | undefined };
      /** narration = [prompt, answer, feedback, ...optional repeat] */
      narration: NarrationLine[];
    }
  | {
      kind: "next-step";
      segment: LearningSegment;
      heading: string;
      body: string;
      narration: NarrationLine[];
    };

export type VideoSceneKind = VideoScene["kind"];

/** Level-dependent pacing (framework §5). */
export interface PedagogyParameters {
  retrievalPauseSeconds: number;
  /** How many times a new target phrase is heard when introduced. */
  introRepetitions: number;
}

export interface VideoScript {
  /** Bumped when the script *shape or wording rules* change, so old renders are regenerated. */
  scriptVersion: number;
  content: MediaContentRef;
  purpose: "lesson-explanation" | "vocabulary-explanation";
  /** One clear primary objective, shown in the transcript and the manifest. */
  objective: string;
  instructionLanguage: LanguageId;
  targetLanguage: LanguageId;
  level?: string | undefined;
  title: string;
  /** The narrator's voice profile id. */
  narratorId: string;
  cast: CastMember[];
  /** Vocabulary item ids this video teaches (future spaced review). */
  targetVocabularyIds: string[];
  /** Target-language phrases this video teaches. */
  targetPhrases: string[];
  pedagogy: PedagogyParameters;
  /** On-screen framing texts in the instruction language (absent = the renderer's English defaults). */
  labels?: VideoLabels | undefined;
  scenes: VideoScene[];
}

export interface VideoLabels {
  yourTurn: string;
  diagramNote: string;
  roughly: string;
  palate: string;
}

/** Every spoken line in playback order — what the audio step must synthesize. */
export function narrationOf(script: VideoScript): NarrationLine[] {
  return script.scenes.flatMap((scene) => scene.narration);
}

/** The voice profile a line is spoken with: the speaker's, or the narrator's. */
export function voiceOf(script: VideoScript, line: NarrationLine): string {
  const speaker = line.speaker ?? "narrator";
  if (speaker === "narrator") return script.narratorId;
  const member = script.cast.find((c) => c.id === speaker);
  if (!member) throw new Error(`Line spoken by unknown cast member "${speaker}".`);
  return member.voice;
}

export function pedagogyFor(level: string | undefined): PedagogyParameters {
  switch (level) {
    case "a1":
      return { retrievalPauseSeconds: 3.5, introRepetitions: 2 };
    case "a2":
      return { retrievalPauseSeconds: 3, introRepetitions: 2 };
    case "b1":
      return { retrievalPauseSeconds: 2.5, introRepetitions: 1 };
    default:
      return { retrievalPauseSeconds: 2.5, introRepetitions: 1 };
  }
}

import type {
  CastMember,
  LearningSegment,
  Stage,
  StageAction,
  ActionTiming,
} from "@tfm-bic/domain";

/**
 * Authored video plans (M22, ADR-032): content-side JSON that decides *where* a lesson happens, who
 * acts and what they do — never *what the language is*. Every target-language line must be a phrase
 * of the course content (validated by the builder), and meanings are looked up in the content, so a
 * plan cannot introduce a translation or an example. Narrator lines are instruction-language framing.
 *
 *   content/languages/<lang>/media/lessons/<contentId>.json
 */

/** One spoken line: `target` (language being learned) or `say` (instruction language). */
export interface PlanLine {
  by?: string | undefined;
  target?: string | undefined;
  say?: string | undefined;
  leadIn?: number | undefined;
  pauseAfter?: number | undefined;
}

export interface PlanBeat {
  line: PlanLine;
  actions?: (StageAction & { when?: ActionTiming | undefined })[] | undefined;
  /**
   * Show the target phrase card near the speaker. The meaning comes from the content; `{ meaning }`
   * selects the part of the content's translation that this situation shows (validated).
   */
  card?: boolean | { meaning: string } | undefined;
}

export type PlanScene =
  | {
      kind: "situation";
      segment: LearningSegment;
      overlayTitle?: boolean | undefined;
      stage: Stage;
      beats: PlanBeat[];
    }
  | {
      kind: "focus";
      segment: LearningSegment;
      heading: string;
      phrase: string;
      highlight?: string | undefined;
      /** true = use the content's own respelling for this phrase ("Roughly: …" in its note). */
      respelling?: boolean | undefined;
      panels?: { caption: string; text: string }[] | undefined;
      lines: PlanLine[];
    }
  | {
      kind: "contrast";
      segment: LearningSegment;
      heading: string;
      /** Phonetic representation ids and which of their example words to use. */
      items: { phoneticId: string; word: string }[];
      lines: PlanLine[];
      /** For each item, the index of the line that presents it. */
      itemLines: number[];
    }
  | {
      kind: "retrieval";
      segment: LearningSegment;
      stage: Stage;
      setup: StageAction[];
      prompt: string;
      answer: string;
      answerBy?: string | undefined;
    }
  | { kind: "next-step"; segment: LearningSegment; heading: string; body: string; say: string };

export interface LessonVideoPlan {
  schemaVersion: 2;
  contentId: string;
  objective: string;
  narrator: string;
  cast: CastMember[];
  targetVocabularyIds: string[];
  scenes: PlanScene[];
}

/** Per-word visual context for vocabulary videos (in plan.json). */
export interface VocabularyVisual {
  /** The object/action that shows the meaning, placed in the first stage. */
  stage: Stage;
  /** The actor who meets the object and says the word. */
  actor: string;
  /** What the actor does to connect word and meaning (point, pick up, wave...). */
  action: StageAction;
  /** A second, different context for the same word (optional). */
  stage2?: Stage | undefined;
  actor2?: string | undefined;
  action2?: StageAction | undefined;
  /** What the retrieval prompt asks (default: "What is this in <language>?"). */
  prompt?: string | undefined;
}

export interface VocabularyCategoryVideoPlan {
  categoryId: string;
  narrator: string;
  cast: CastMember[];
}

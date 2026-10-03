import {
  pedagogyFor,
  type Beat,
  type ContentItem,
  type NarrationLine,
  type PhoneticRepresentation,
  type Stage,
  type VideoScene,
  type VideoScript,
  type VocabularyItem,
} from "@tfm-bic/domain";

import type { LessonVideoPlan, PlanLine } from "./video-plan.js";

/** Bump when the script shape or wording rules change: every video is then out of date. */
export const LESSON_SCRIPT_VERSION = 2;

/** Fixed framing sentences (instruction language) — the only words a script adds. */
export const FRAMING = {
  selfCheck: "Did you say it? Say it once more, out loud.",
  sameWordsNewPlace: "Same words, a different place.",
} as const;

/**
 * The language a script may speak in the target language: everything the course content itself
 * contains for that language — lesson examples and dialogue lines, vocabulary lemmas, plurals and
 * examples, phonetic example words — each with its meaning from the content.
 */
export class ContentLanguage {
  private readonly meanings = new Map<string, string>();
  private readonly respellings = new Map<string, string>();

  constructor(
    readonly locale: string,
    sources: {
      lessons: readonly ContentItem[];
      vocabulary: readonly VocabularyItem[];
      phonetics: readonly PhoneticRepresentation[];
    },
  ) {
    for (const lesson of sources.lessons) {
      for (const block of lesson.blocks) {
        if (block.type === "example") {
          this.add(block.text, block.translation);
          const rough = block.note ? /Roughly:\s*([^.]+)\.?\s*$/.exec(block.note) : null;
          if (rough?.[1]) this.respellings.set(this.key(block.text), rough[1].trim());
        } else if (block.type === "dialogue") {
          for (const line of block.lines) this.add(line.text, line.translation);
        }
      }
    }
    for (const item of sources.vocabulary) {
      this.add(item.lemma, item.translation);
      if (item.plural) this.add(item.plural, `${item.translation} (plural)`);
      if (item.example) this.add(item.example.text, item.example.translation);
    }
    for (const rep of sources.phonetics) {
      for (const word of rep.exampleWords ?? []) this.add(word.word, word.translation);
    }
  }

  private key(text: string): string {
    return text.trim().toLocaleLowerCase(this.locale);
  }

  private add(text: string, meaning: string) {
    if (!this.meanings.has(this.key(text))) this.meanings.set(this.key(text), meaning);
  }

  has(text: string): boolean {
    return this.meanings.has(this.key(text));
  }

  meaningOf(text: string): string | undefined {
    return this.meanings.get(this.key(text));
  }

  respellingOf(text: string): string | undefined {
    return this.respellings.get(this.key(text));
  }
}

export class InvalidVideoPlanError extends Error {
  constructor(
    readonly contentId: string,
    readonly problems: string[],
  ) {
    super(`Video plan for ${contentId} is invalid:\n- ${problems.join("\n- ")}`);
    this.name = "InvalidVideoPlanError";
  }
}

export interface LessonFraming {
  selfCheck: string;
  yourTurn: string;
  diagramNote: string;
  roughly: string;
  palate: string;
}

export interface LessonScriptInput {
  /** Framing texts in the instruction language; absent = the English defaults (and no labels). */
  framing?: LessonFraming | undefined;
  lesson: ContentItem;
  plan: LessonVideoPlan;
  language: ContentLanguage;
  phonetics: readonly PhoneticRepresentation[];
}

function articulationOf(
  ipa: string,
): "retroflex" | "alveolo-palatal" | "close-front" | "near-close-front" | "plain" {
  if (ipa.includes("ʂ")) return "retroflex";
  if (ipa.includes("ɕ")) return "alveolo-palatal";
  if (ipa === "iː") return "close-front";
  if (ipa === "ɪ") return "near-close-front";
  return "plain";
}

/**
 * Turns an authored lesson video plan into a pedagogical script (M22): situations, focus, contrasts,
 * retrieval moments and a hand-off. Enforces the content rule — every target-language line, card and
 * sign must be course content — and applies the level's pacing (retrieval pause, repetitions).
 * Retrieval moments expand to prompt → silent pause → answer → self-check → answer again; the
 * self-check is honest about what a video cannot know.
 */
export function buildLessonVideoScript(input: LessonScriptInput): VideoScript {
  const { lesson, plan, language } = input;
  const target = lesson.languageId;
  const en = lesson.instructionLanguage;
  const pedagogy = pedagogyFor(lesson.levelId);
  const problems: string[] = [];
  const castIds = new Set(plan.cast.map((c) => c.id));
  const targetPhrases = new Set<string>();

  const toLine = (line: PlanLine, where: string): NarrationLine => {
    if ((line.target === undefined) === (line.say === undefined)) {
      problems.push(`${where}: a line needs exactly one of "target" or "say".`);
    }
    if (line.by && line.by !== "narrator" && !castIds.has(line.by)) {
      problems.push(`${where}: unknown speaker "${line.by}".`);
    }
    if (line.target !== undefined) {
      if (!language.has(line.target)) {
        problems.push(`${where}: "${line.target}" is not in the course content.`);
      }
      targetPhrases.add(line.target);
    }
    return {
      text: line.target ?? line.say ?? "",
      language: line.target !== undefined ? target : en,
      ...(line.by && line.by !== "narrator" ? { speaker: line.by } : {}),
      ...(line.leadIn !== undefined ? { leadIn: line.leadIn } : {}),
      ...(line.pauseAfter !== undefined ? { pauseAfter: line.pauseAfter } : {}),
    };
  };

  const checkStage = (stage: Stage, where: string) => {
    for (const actor of stage.actors) {
      if (!castIds.has(actor.id))
        problems.push(`${where}: actor "${actor.id}" is not in the cast.`);
    }
    if (stage.sign !== undefined && !language.has(stage.sign)) {
      problems.push(`${where}: sign "${stage.sign}" is not in the course content.`);
    }
  };

  const scenes: VideoScene[] = plan.scenes.map((scene, s): VideoScene => {
    const where = `scene ${String(s + 1)} (${scene.kind})`;
    switch (scene.kind) {
      case "situation": {
        checkStage(scene.stage, where);
        const narration: NarrationLine[] = [];
        const beats: Beat[] = scene.beats.map((beat, b) => {
          narration.push(toLine(beat.line, `${where} beat ${String(b + 1)}`));
          const result: Beat = {
            line: b,
            ...(beat.actions
              ? {
                  actions: beat.actions.map(({ when, ...action }) => ({
                    when: when ?? "with",
                    action,
                  })),
                }
              : {}),
          };
          if (beat.card && beat.line.target) {
            const full = language.meaningOf(beat.line.target);
            let meaning = full;
            if (typeof beat.card === "object") {
              if (!full?.includes(beat.card.meaning)) {
                problems.push(
                  `${where} beat ${String(b + 1)}: "${beat.card.meaning}" is not part of the content's meaning of "${beat.line.target}".`,
                );
              }
              meaning = beat.card.meaning;
            }
            result.card = { text: beat.line.target, ...(meaning ? { meaning } : {}) };
          }
          return result;
        });
        return {
          kind: "situation",
          segment: scene.segment,
          ...(scene.overlayTitle ? { overlayTitle: lesson.title } : {}),
          stage: scene.stage,
          narration,
          beats,
        };
      }
      case "focus": {
        if (!language.has(scene.phrase))
          problems.push(`${where}: "${scene.phrase}" is not in the course content.`);
        if (
          scene.highlight &&
          !scene.phrase
            .toLocaleLowerCase(language.locale)
            .includes(scene.highlight.toLocaleLowerCase(language.locale))
        ) {
          problems.push(
            `${where}: highlight "${scene.highlight}" is not part of "${scene.phrase}".`,
          );
        }
        for (const panel of scene.panels ?? []) {
          if (!language.has(panel.text))
            problems.push(`${where}: panel "${panel.text}" is not in the course content.`);
        }
        const respelling = scene.respelling ? language.respellingOf(scene.phrase) : undefined;
        if (scene.respelling && !respelling)
          problems.push(`${where}: the content has no respelling for "${scene.phrase}".`);
        const meaning = language.meaningOf(scene.phrase);
        return {
          kind: "focus",
          segment: scene.segment,
          heading: scene.heading,
          phrase: scene.phrase,
          ...(meaning ? { meaning } : {}),
          ...(scene.highlight ? { highlight: scene.highlight } : {}),
          ...(respelling ? { respelling } : {}),
          ...(scene.panels ? { panels: scene.panels } : {}),
          narration: scene.lines.map((l, i) => toLine(l, `${where} line ${String(i + 1)}`)),
        };
      }
      case "contrast": {
        const items = scene.items.map((item) => {
          const rep = input.phonetics.find((p) => p.id === item.phoneticId);
          const word = rep?.exampleWords?.find((w) => w.word === item.word);
          if (!rep || !word) {
            problems.push(`${where}: no phonetic example "${item.word}" in ${item.phoneticId}.`);
            return {
              spelling: "?",
              ipa: "?",
              word: item.word,
              meaning: "",
              articulation: "plain" as const,
            };
          }
          const spelling =
            /(?:spelled|escrita(?: a menudo)?) ([^\s,.(]+)/.exec(rep.description)?.[1] ?? rep.ipa;
          return {
            spelling,
            ipa: rep.ipa,
            word: word.word,
            meaning: word.translation,
            articulation: articulationOf(rep.ipa),
          };
        });
        if (scene.itemLines.length !== items.length)
          problems.push(`${where}: one itemLine per item is required.`);
        return {
          kind: "contrast",
          segment: scene.segment,
          heading: scene.heading,
          items,
          itemLines: scene.itemLines,
          narration: scene.lines.map((l, i) => toLine(l, `${where} line ${String(i + 1)}`)),
        };
      }
      case "retrieval": {
        checkStage(scene.stage, where);
        const by = scene.answerBy && scene.answerBy !== "narrator" ? scene.answerBy : undefined;
        const answer = toLine({ target: scene.answer, ...(by ? { by } : {}) }, `${where} answer`);
        const fullMeaning = language.meaningOf(scene.answer);
        if (scene.answerMeaning && !fullMeaning?.includes(scene.answerMeaning)) {
          problems.push(
            `${where}: "${scene.answerMeaning}" is not part of the content's meaning of "${scene.answer}".`,
          );
        }
        const meaning = scene.answerMeaning ?? fullMeaning;
        return {
          kind: "retrieval",
          segment: scene.segment,
          stage: scene.stage,
          setup: scene.setup,
          ...(by ? { answerBy: by } : {}),
          answer: { text: scene.answer, ...(meaning ? { meaning } : {}) },
          narration: [
            { text: scene.prompt, language: en, pauseAfter: pedagogy.retrievalPauseSeconds },
            { ...answer, pauseAfter: 0.8 },
            { text: input.framing?.selfCheck ?? FRAMING.selfCheck, language: en, pauseAfter: 1.8 },
            { ...answer, pauseAfter: 0.6 },
          ],
        };
      }
      case "next-step":
        return {
          kind: "next-step",
          segment: scene.segment,
          heading: scene.heading,
          body: scene.body,
          narration: [{ text: scene.say, language: en }],
        };
    }
  });

  if (plan.contentId !== lesson.id)
    problems.push(`plan is for "${plan.contentId}", not "${lesson.id}".`);
  if (!scenes.some((s) => s.kind === "retrieval"))
    problems.push("a lesson video needs at least one retrieval moment.");
  // One language per spoken line: an instruction-language line must not contain a word of the
  // lesson's target phrases (the TTS would read it with the wrong language's sounds).
  const targetWords = new Set(
    [...targetPhrases]
      .flatMap((phrase) => phrase.toLocaleLowerCase(language.locale).split(/[^\p{L}]+/u))
      .filter((word) => word.length >= 4),
  );
  // Character names (Anna, Piotr) are fine in either language.
  for (const member of plan.cast)
    targetWords.delete(member.name.toLocaleLowerCase(language.locale));
  for (const scene of scenes) {
    for (const line of scene.narration) {
      if (line.language === target) continue;
      const words = line.text.toLocaleLowerCase(language.locale).split(/[^\p{L}]+/u);
      const mixed = words.filter((word) => targetWords.has(word));
      if (mixed.length > 0) {
        problems.push(`"${line.text}" mixes in target-language words (${mixed.join(", ")}).`);
      }
    }
  }
  if (problems.length > 0) throw new InvalidVideoPlanError(lesson.id, problems);

  return {
    scriptVersion: LESSON_SCRIPT_VERSION,
    content: { type: "lesson", id: lesson.id, languageId: lesson.languageId },
    purpose: "lesson-explanation",
    objective: plan.objective,
    instructionLanguage: en,
    targetLanguage: target,
    level: lesson.levelId,
    title: lesson.title,
    narratorId: plan.narrator,
    cast: plan.cast,
    targetVocabularyIds: plan.targetVocabularyIds,
    targetPhrases: [...targetPhrases],
    pedagogy,
    ...(input.framing
      ? {
          labels: {
            yourTurn: input.framing.yourTurn,
            diagramNote: input.framing.diagramNote,
            roughly: input.framing.roughly,
            palate: input.framing.palate,
          },
        }
      : {}),
    scenes,
  };
}

/** "Hi! Bye!" stays; "Good day; hello." → "Good day, or hello." — read naturally aloud. */
export function speakableTranslation(translation: string): string {
  return translation.replace(/\s*;\s*/g, ", or ");
}

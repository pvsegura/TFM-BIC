import type {
  ContentItem,
  NarrationLine,
  PhraseCard,
  VideoScene,
  VideoScript,
} from "@tfm-bic/domain";

/** Bump when the wording rules below change: every lesson video is then out of date. */
export const LESSON_SCRIPT_VERSION = 1;

/** A beat after a phrase in the language being learned, so the learner can repeat it. */
const REPEAT_PAUSE_SECONDS = 1.2;
/** Explanations are shown sentence by sentence; longer paragraphs would not fit one frame. */
const MAX_SENTENCES_PER_SCENE = 3;

export interface LessonScriptInput {
  lesson: ContentItem;
  /** The language being learned (the lesson's `languageId`). */
  narratorId: string;
  /** Title of the level, e.g. "A1", shown in the opening card. */
  levelLabel: string;
  /** Number of practice exercises attached to the lesson; decides the closing hand-off. */
  exerciseCount: number;
}

/** Splits a paragraph into sentences without breaking abbreviations like "e.g." too eagerly. */
export function splitSentences(paragraph: string): string[] {
  return paragraph
    .split(/(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-Þ0-9"“])/u)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/** "Hi! Bye!" → "Hi! Bye!"; "Good day; hello." → "Good day, or hello." — read naturally aloud. */
export function speakableTranslation(translation: string): string {
  return translation.replace(/\s*;\s*/g, ", or ");
}

/**
 * The storyboard of a lesson's explanation video (M21): hook → the lesson's own explanation →
 * each example phrase spoken in the language being learned → the dialogue → recap → hand-off to
 * practice. Every piece of language content is taken verbatim from the lesson; the only words
 * added are fixed framing sentences ("It means…", "Now practise…"), so nothing linguistic is
 * invented. Narration of explanations and meanings is in the lesson's instruction language; each
 * target-language phrase is its own line, so the speech provider never has to guess the language
 * of a mixed sentence.
 */
export function buildLessonVideoScript(input: LessonScriptInput): VideoScript {
  const { lesson } = input;
  const en = lesson.instructionLanguage;
  const target = lesson.languageId;
  const scenes: VideoScene[] = [];
  const phrases: PhraseCard[] = [];

  scenes.push({
    kind: "title",
    eyebrow: `${input.levelLabel} · ${lesson.type === "explanation" ? "Explanation" : "Lesson"}`,
    title: lesson.title,
    subtitle: lesson.description,
    narration: [{ text: `${lesson.title}. ${lesson.description}`, language: en }],
  });

  for (const block of lesson.blocks) {
    if (block.type === "explanation") {
      const sentences = splitSentences(block.text);
      for (const group of chunk(sentences, MAX_SENTENCES_PER_SCENE)) {
        scenes.push({
          kind: "explanation",
          heading: "How it works",
          sentences: group,
          narration: group.map((text) => ({ text, language: en })),
        });
      }
    } else if (block.type === "example") {
      const card: PhraseCard = {
        text: block.text,
        translation: block.translation,
        ...(block.note ? { note: block.note } : {}),
      };
      phrases.push(card);
      const narration: NarrationLine[] = [
        { text: block.text, language: target, pauseAfter: REPEAT_PAUSE_SECONDS },
        { text: block.text, language: target, pauseAfter: 0.4 },
        { text: `It means: ${speakableTranslation(block.translation)}`, language: en },
      ];
      if (block.note) narration.push({ text: block.note, language: en });
      scenes.push({ kind: "phrase", heading: "Listen and repeat", phrase: card, narration });
    } else {
      scenes.push({
        kind: "dialogue",
        heading: "In conversation",
        lines: block.lines.map((line) => ({ ...line })),
        narration: [
          { text: "Now listen to a short conversation.", language: en },
          ...block.lines.map((line) => ({ text: line.text, language: target, pauseAfter: 0.5 })),
        ],
      });
    }
  }

  if (phrases.length > 0) {
    scenes.push({
      kind: "recap",
      heading: "Recap",
      items: phrases,
      narration: [
        { text: "Let's recap.", language: en },
        ...phrases.map((p) => ({ text: p.text, language: target, pauseAfter: 0.6 })),
      ],
    });
  }

  scenes.push(
    input.exerciseCount > 0
      ? {
          kind: "next-step",
          heading: "Your turn",
          body: `Practise with ${String(input.exerciseCount)} short ${
            input.exerciseCount === 1 ? "exercise" : "exercises"
          } below the video.`,
          narration: [
            {
              text: "Now it's your turn. Practise with the exercises below the video.",
              language: en,
            },
          ],
        }
      : {
          kind: "next-step",
          heading: "Keep going",
          body: "Read the examples below the video at your own pace.",
          narration: [
            { text: "Read the examples below the video at your own pace.", language: en },
          ],
        },
  );

  return {
    scriptVersion: LESSON_SCRIPT_VERSION,
    content: { type: "lesson", id: lesson.id, languageId: lesson.languageId },
    purpose: "lesson-explanation",
    instructionLanguage: en,
    targetLanguage: target,
    level: lesson.levelId,
    title: lesson.title,
    narratorId: input.narratorId,
    scenes,
  };
}

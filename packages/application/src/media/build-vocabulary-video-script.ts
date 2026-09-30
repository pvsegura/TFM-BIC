import type {
  ContentItem,
  NarrationLine,
  VideoScene,
  VideoScript,
  VocabularyCategory,
  VocabularyItem,
} from "@tfm-bic/domain";

import { speakableTranslation } from "./build-lesson-video-script.js";

/** Bump when the wording rules below change: every vocabulary video is then out of date. */
export const VOCABULARY_SCRIPT_VERSION = 1;

const REPEAT_PAUSE_SECONDS = 1.2;

/** An example sentence the video may show, and where it comes from. */
export interface VocabularyExampleSource {
  text: string;
  translation: string;
  /** Title of the lesson it is quoted from; absent for the item's own example. */
  fromLesson?: string | undefined;
}

const PUNCTUATION = /[.,!?;:"“”()]/g;

function words(text: string, locale: string): string[] {
  return text.toLocaleLowerCase(locale).replace(PUNCTUATION, " ").split(/\s+/).filter(Boolean);
}

/**
 * The example a word's video uses: the item's own example when it has one, otherwise the first
 * example or dialogue line in a published lesson of the same language that contains the lemma
 * *verbatim as whole words* — a quotation, labelled with its lesson, never a sentence written for
 * the video. Returns `undefined` when the content has none: no example is ever invented (M21 §44).
 * Inflected forms (Polish "kota" for "kot") deliberately do not match — deciding that two forms
 * are the same word is linguistic analysis the content does not provide.
 */
export function findVocabularyExample(
  item: VocabularyItem,
  lessons: readonly ContentItem[],
  locale: string,
): VocabularyExampleSource | undefined {
  if (item.example) return { text: item.example.text, translation: item.example.translation };

  const lemma = words(item.lemma, locale);
  if (lemma.length === 0) return undefined;
  const containsLemma = (text: string) => {
    const w = words(text, locale);
    // A sentence that *is* the lemma adds nothing over the word scene itself.
    if (w.length <= lemma.length) return false;
    for (let i = 0; i + lemma.length <= w.length; i += 1) {
      if (lemma.every((part, j) => w[i + j] === part)) return true;
    }
    return false;
  };

  const sorted = [...lessons]
    .filter((l) => l.languageId === item.languageId && l.status === "published")
    .sort((a, b) => a.order - b.order);
  for (const lesson of sorted) {
    for (const block of lesson.blocks) {
      const candidates =
        block.type === "example"
          ? [{ text: block.text, translation: block.translation }]
          : block.type === "dialogue"
            ? block.lines.map((l) => ({ text: l.text, translation: l.translation }))
            : [];
      const hit = candidates.find((c) => containsLemma(c.text));
      if (hit) return { ...hit, fromLesson: lesson.title };
    }
  }
  return undefined;
}

export interface VocabularyScriptInput {
  item: VocabularyItem;
  category: VocabularyCategory;
  narratorId: string;
  /** Locale of the language being learned (from the catalog), for case-insensitive matching. */
  locale: string;
  example?: VocabularyExampleSource | undefined;
  /** A language-independent pictogram key from the content's visuals map, when there is one. */
  pictogram?: string | undefined;
}

const PART_OF_SPEECH_LABELS: Record<string, string> = {
  noun: "Noun",
  verb: "Verb",
  adjective: "Adjective",
  adverb: "Adverb",
  pronoun: "Pronoun",
  preposition: "Preposition",
  conjunction: "Conjunction",
  interjection: "Interjection",
  numeral: "Numeral",
  particle: "Particle",
  phrase: "Phrase",
};

function label(value: string): string {
  return PART_OF_SPEECH_LABELS[value] ?? value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * The storyboard of one word's explanation video (M21): the word appears and is pronounced twice,
 * its meaning (with a pictogram when the content maps one), what the content says about its
 * grammar, an example in context when the content has one, and a short recap. Word, meaning,
 * grammar facts, note and example are verbatim content; framing sentences are fixed.
 */
export function buildVocabularyVideoScript(input: VocabularyScriptInput): VideoScript {
  const { item, category } = input;
  const en = item.instructionLanguage;
  const target = item.languageId;
  const scenes: VideoScene[] = [];

  const facts: { label: string; value: string; spokenValue?: boolean }[] = [];
  if (item.partOfSpeech) facts.push({ label: "Part of speech", value: label(item.partOfSpeech) });
  if (item.gender) facts.push({ label: "Gender", value: label(item.gender) });
  if (item.plural) facts.push({ label: "Plural", value: item.plural, spokenValue: true });

  const wordNarration: NarrationLine[] = [
    { text: item.lemma, language: target, pauseAfter: REPEAT_PAUSE_SECONDS },
    { text: item.lemma, language: target, pauseAfter: 0.4 },
    { text: `It means: ${speakableTranslation(item.translation)}.`, language: en },
  ];
  if (item.plural) {
    wordNarration.push(
      { text: "The plural is:", language: en },
      { text: item.plural, language: target, pauseAfter: 0.4 },
    );
  }
  if (item.note) wordNarration.push({ text: item.note, language: en });

  scenes.push({
    kind: "title",
    eyebrow: `${category.title} · New word`,
    title: item.lemma,
    narration: [{ text: `A new word from ${category.title.toLowerCase()}.`, language: en }],
  });
  scenes.push({
    kind: "word",
    word: item.lemma,
    meaning: item.translation,
    ...(input.pictogram ? { pictogram: input.pictogram } : {}),
    facts,
    narration: wordNarration,
  });

  if (input.example) {
    scenes.push({
      kind: "phrase",
      heading: "In a sentence",
      phrase: { text: input.example.text, translation: input.example.translation },
      ...(input.example.fromLesson
        ? { source: `From the lesson “${input.example.fromLesson}”` }
        : {}),
      highlight: item.lemma,
      narration: [
        { text: input.example.text, language: target, pauseAfter: REPEAT_PAUSE_SECONDS },
        { text: `It means: ${speakableTranslation(input.example.translation)}`, language: en },
      ],
    });
  }

  scenes.push({
    kind: "recap",
    heading: "Remember",
    items: [{ text: item.lemma, translation: item.translation }],
    narration: [{ text: item.lemma, language: target, pauseAfter: 0.8 }],
  });
  scenes.push({
    kind: "next-step",
    heading: "Keep it",
    body: "Save the word to review it later, or mark it as learned.",
    narration: [{ text: "Save it to review later, or mark it as learned.", language: en }],
  });

  return {
    scriptVersion: VOCABULARY_SCRIPT_VERSION,
    content: { type: "vocabulary-item", id: item.id, languageId: item.languageId },
    purpose: "vocabulary-explanation",
    instructionLanguage: en,
    targetLanguage: target,
    level: item.levelId,
    title: item.lemma,
    narratorId: input.narratorId,
    scenes,
  };
}

import {
  CEFR_LEVELS,
  pedagogyFor,
  type ContentItem,
  type NarrationLine,
  type StageAction,
  type VideoScene,
  type VideoScript,
  type VocabularyCategory,
  type VocabularyItem,
} from "@tfm-bic/domain";

import {
  FRAMING,
  InvalidVideoPlanError,
  speakableTranslation,
  type ContentLanguage,
} from "./build-lesson-video-script.js";
import type { VocabularyCategoryVideoPlan, VocabularyVisual } from "./video-plan.js";

/** Bump when the wording rules below change: every vocabulary video is then out of date. */
export const VOCABULARY_SCRIPT_VERSION = 2;

/** An example sentence the video may use, and where it comes from. */
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
 * The example a word's video uses: the item's own example, otherwise the first lesson example or
 * dialogue line containing the lemma verbatim as whole words (labelled with its lesson). Lessons are
 * searched level by level, then by order, and never above the word's own level, so an A1 word is
 * not illustrated with a C1 sentence. Never invented; inflected forms deliberately do not match.
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
    if (w.length <= lemma.length) return false;
    for (let i = 0; i + lemma.length <= w.length; i += 1) {
      if (lemma.every((part, j) => w[i + j] === part)) return true;
    }
    return false;
  };
  const rank = (levelId: string) => CEFR_LEVELS.findIndex((level) => level.id === levelId);
  const ceiling = item.levelId === undefined ? Infinity : rank(item.levelId);
  const sorted = [...lessons]
    .filter(
      (l) =>
        l.languageId === item.languageId && l.status === "published" && rank(l.levelId) <= ceiling,
    )
    .sort((a, b) => rank(a.levelId) - rank(b.levelId) || a.order - b.order);
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
  plan: VocabularyCategoryVideoPlan;
  visual: VocabularyVisual;
  language: ContentLanguage;
  example?: VocabularyExampleSource | undefined;
}

function languageName(language: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(language) ?? language;
  } catch {
    return language;
  }
}

/**
 * The storyboard of one word's video (M22): a place where the meaning is visible, a character who
 * meets the object (or the situation) and says the word, its meaning, what the content says about its
 * form, its example in context when the content has one, a second context in another voice (talker
 * variability), a retrieval moment with the object as the cue, and a hand-off. Word, meaning, plural,
 * note and example are content; the rest is fixed framing.
 */
export function buildVocabularyVideoScript(input: VocabularyScriptInput): VideoScript {
  const { item, category, plan, visual, language } = input;
  const en = item.instructionLanguage;
  const target = item.languageId;
  const pedagogy = pedagogyFor(item.levelId);
  const problems: string[] = [];
  const castIds = new Set(plan.cast.map((c) => c.id));
  for (const id of [visual.actor, visual.actor2]) {
    if (id !== undefined && !castIds.has(id)) {
      problems.push(`actor "${id}" is not in the ${category.id} cast.`);
    }
  }
  const t = (text: string, extra: Partial<NarrationLine> = {}): NarrationLine => ({
    text,
    language: target,
    ...extra,
  });
  const say = (text: string, extra: Partial<NarrationLine> = {}): NarrationLine => ({
    text,
    language: en,
    ...extra,
  });
  const meaning = speakableTranslation(item.translation);
  const scenes: VideoScene[] = [];
  /** The first stage again, with everyone already in place (for the example and the retrieval cue). */
  const settled: typeof visual.stage = {
    ...visual.stage,
    actors: visual.stage.actors.map(({ offstage: _offstage, ...actor }) => actor),
  };

  // 1. Situation: the meaning is visible first, then the word is heard from someone in the scene.
  const entering = visual.stage.actors.find((a) => a.id === visual.actor);
  const entrance: StageAction[] = entering?.offstage
    ? [{ do: "enter", actor: visual.actor, to: entering.x }]
    : [];
  scenes.push({
    kind: "situation",
    segment: "situation",
    overlayTitle: category.title,
    stage: visual.stage,
    narration: [
      t(item.lemma, {
        speaker: visual.actor,
        leadIn: entrance.length ? 4.4 : 1.6,
        pauseAfter: 0.9,
      }),
      say(`It means: ${meaning}.`),
    ],
    beats: [
      {
        line: 0,
        actions: [...entrance, visual.action].map((action) => ({ when: "lead" as const, action })),
        card: { text: item.lemma, meaning: item.translation },
      },
      { line: 1 },
    ],
  });

  // 2. Form: the narrator's voice (a second talker), plural and note from the content.
  const form: NarrationLine[] = [t(item.lemma, { pauseAfter: 1.1 })];
  if (item.plural) form.push(say("The plural is:"), t(item.plural, { pauseAfter: 0.8 }));
  if (item.note) form.push(say(item.note));
  scenes.push({
    kind: "focus",
    segment: "target",
    heading: [item.partOfSpeech, item.gender].filter(Boolean).join(" · ") || "New word",
    phrase: item.lemma,
    meaning: item.translation,
    ...(item.plural ? { panels: [{ caption: "Plural", text: item.plural }] } : {}),
    narration: form,
  });

  // 3. Example in context, when the content has one.
  if (input.example) {
    scenes.push({
      kind: "situation",
      segment: "conversation",
      stage: settled,
      narration: [
        t(input.example.text, { speaker: visual.actor, leadIn: 0.6, pauseAfter: 0.8 }),
        say(`It means: ${speakableTranslation(input.example.translation)}`),
      ],
      beats: [
        { line: 0, card: { text: input.example.text, meaning: input.example.translation } },
        { line: 1 },
      ],
    });
  }

  // 4. A second context, another voice.
  if (visual.stage2 && visual.actor2) {
    scenes.push({
      kind: "situation",
      segment: "reuse",
      stage: visual.stage2,
      narration: [
        t(item.lemma, { speaker: visual.actor2, leadIn: 3.8, pauseAfter: 0.8 }),
        say(FRAMING.sameWordsNewPlace),
      ],
      beats: [
        {
          line: 0,
          actions: visual.action2 ? [{ when: "lead", action: visual.action2 }] : [],
          card: { text: item.lemma },
        },
        { line: 1 },
      ],
    });
  }

  // 5. Retrieval: the first context returns as the cue.
  const highlightTarget =
    visual.action.do === "point"
      ? visual.action.at
      : visual.action.do === "pick-up"
        ? visual.action.prop
        : visual.actor;
  const highlight: StageAction[] = [visual.action, { do: "highlight", target: highlightTarget }];
  scenes.push({
    kind: "retrieval",
    segment: "retrieval",
    stage: settled,
    setup: highlight,
    answerBy: visual.actor,
    answer: { text: item.lemma, meaning: item.translation },
    narration: [
      say(visual.prompt ?? `What is this in ${languageName(target)}?`, {
        pauseAfter: pedagogy.retrievalPauseSeconds,
      }),
      t(item.lemma, { speaker: visual.actor, pauseAfter: 0.8 }),
      say(FRAMING.selfCheck, { pauseAfter: 1.8 }),
      t(item.lemma, { speaker: visual.actor, pauseAfter: 0.6 }),
    ],
  });

  scenes.push({
    kind: "next-step",
    segment: "recap",
    heading: "Keep it",
    body: "Save the word to review it later, or mark it as learned.",
    narration: [say("Save it to review later, or mark it as learned.")],
  });

  if (!language.has(item.lemma)) problems.push(`"${item.lemma}" is not in the course content.`);
  if (problems.length > 0) throw new InvalidVideoPlanError(item.id, problems);

  return {
    scriptVersion: VOCABULARY_SCRIPT_VERSION,
    content: { type: "vocabulary-item", id: item.id, languageId: item.languageId },
    purpose: "vocabulary-explanation",
    objective: `Recognise, understand and recall "${item.lemma}" (${item.translation}).`,
    instructionLanguage: en,
    targetLanguage: target,
    level: item.levelId,
    title: item.lemma,
    narratorId: plan.narrator,
    cast: plan.cast,
    targetVocabularyIds: [item.id],
    targetPhrases: [item.lemma, ...(input.example ? [input.example.text] : [])],
    pedagogy,
    scenes,
  };
}

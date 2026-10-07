import {
  createContentId,
  createGrammarTopicId,
  createVocabularyCategoryId,
  createPhoneticRepresentationId,
  createVocabularyItemId,
  isPublished,
  sortGrammarTopics,
  type ContentBlock,
  type GrammarTopic,
} from "@tfm-bic/domain";

import type { GrammarReferenceRepository } from "../../grammar/grammar-reference.js";
import type { GetLessonUseCase } from "../../lesson/use-cases/get-lesson.use-case.js";
import type { ListLessonsUseCase } from "../../lesson/use-cases/list-lessons.use-case.js";
import type { ContentMediaCatalog } from "../../media/ports/media-generation-ports.js";
import type { GetPhoneticRepresentationUseCase } from "../../phonetics/use-cases/get-phonetic-representation.use-case.js";
import type { ListPhoneticsUseCase } from "../../phonetics/use-cases/list-phonetics.use-case.js";
import type { GetVocabularyItemUseCase } from "../../vocabulary/use-cases/get-vocabulary-item.use-case.js";
import type { ListVocabularyUseCase } from "../../vocabulary/use-cases/list-vocabulary.use-case.js";
import type { CoachTool, CoachToolContext } from "./coach-tool.js";
import {
  optionalCount,
  optionalEnum,
  optionalString,
  readArguments,
  requiredString,
} from "./tool-arguments.js";

/**
 * Tools that read educational content (M23, ADR-034).
 *
 * Every one of these goes through the **existing** use case, so M5's visibility rule is reused
 * rather than restated: an unpublished item, an inactive language or a level that is not
 * `available` is invisible to the coach exactly as it is to the learner, and every such case is
 * the same not-found. The coach is not a way around the catalog's own rules.
 *
 * Content is public in this product (the catalog routes are unauthenticated), so these tools are
 * not the sensitive ones — but they are still bounded: a lesson's blocks, a transcript and a word
 * list are all capped, because an unbounded transcript is an unbounded bill.
 */

export interface ContentToolDependencies {
  readonly listLessons: ListLessonsUseCase;
  readonly getLesson: GetLessonUseCase;
  readonly listVocabulary: ListVocabularyUseCase;
  readonly getVocabularyItem: GetVocabularyItemUseCase;
  readonly listPhonetics: ListPhoneticsUseCase;
  readonly getPhonetic: GetPhoneticRepresentationUseCase;
  /** Absent in a fixture or before any grammar content exists: the tools then report "none". */
  readonly grammar: GrammarReferenceRepository | undefined;
  /** Absent before any media is published: the video tool then reports "no video". */
  readonly media: ContentMediaCatalog | undefined;
}

const MAX_BLOCKS = 12;
const MAX_WORDS = 15;
const MAX_TRANSCRIPT_LINES = 40;
const MAX_GRAMMAR_ROWS = 20;
const MAX_TOPICS = 25;

/** A lesson block as the coach needs it: the text, nothing about rendering. */
function toBlock(block: ContentBlock) {
  switch (block.type) {
    case "explanation":
      return { type: block.type, text: block.text };
    case "example":
      return {
        type: block.type,
        text: block.text,
        translation: block.translation,
        note: block.note ?? null,
      };
    case "dialogue":
      return {
        type: block.type,
        lines: block.lines.map((line) => ({
          speaker: line.speaker,
          text: line.text,
          translation: line.translation,
        })),
      };
  }
}

function lessonsTool(deps: ContentToolDependencies): CoachTool {
  return {
    declaration: {
      name: "list_lessons",
      description:
        "The lessons available to this learner at a CEFR level, in course order, each with their own progress status (not-started, in-progress, completed).",
      parameters: {
        type: "object",
        properties: {
          level: {
            type: "string",
            description: "CEFR level id, e.g. 'a1'. Defaults to the learner's own level.",
          },
        },
        additionalProperties: false,
      },
    },
    async execute(context: CoachToolContext, args: unknown) {
      const record = readArguments(args, ["level"]);
      const level = optionalEnum(record, "level", ["a1", "a2", "b1", "b2", "c1", "c2"]);
      const levelId = level ?? context.levelId;
      if (!levelId) {
        return { lessons: [], note: "No level known for this learner and none given." };
      }
      const lessons = await deps.listLessons.execute({
        userId: context.userId,
        languageId: context.languageId,
        levelId,
      });
      return {
        level: levelId,
        lessons: lessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          status: lesson.progress.status,
        })),
      };
    },
  };
}

function lessonTool(deps: ContentToolDependencies): CoachTool {
  return {
    declaration: {
      name: "get_lesson",
      description:
        "One lesson's actual teaching content: title, objective and its explanation, example and dialogue blocks, plus this learner's progress. Use it to answer within a lesson instead of inventing material.",
      parameters: {
        type: "object",
        properties: {
          lessonId: { type: "string", description: "The lesson's id, e.g. 'pl-greetings'." },
        },
        required: ["lessonId"],
        additionalProperties: false,
      },
    },
    async execute(context: CoachToolContext, args: unknown) {
      const record = readArguments(args, ["lessonId"]);
      const lessonId = createContentId(requiredString(record, "lessonId", 64));
      const detail = await deps.getLesson.execute({ userId: context.userId, lessonId });
      return {
        id: detail.lesson.id,
        title: detail.lesson.title,
        description: detail.lesson.description,
        level: detail.lesson.levelId,
        instructionLanguage: detail.lesson.instructionLanguage,
        blocks: detail.lesson.blocks.slice(0, MAX_BLOCKS).map(toBlock),
        blocksOmitted: Math.max(0, detail.lesson.blocks.length - MAX_BLOCKS),
        learnerProgress: detail.progress.status,
      };
    },
  };
}

function vocabularyListTool(deps: ContentToolDependencies): CoachTool {
  return {
    declaration: {
      name: "list_vocabulary",
      description:
        "Vocabulary entries of the learner's language with their own status for each word (new, saved, learning, learned). Filter by category, level or status — for example status 'learning' to find words they are still working on.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["new", "saved", "learning", "learned"],
            description: "Only words the learner has this status for.",
          },
          level: { type: "string", description: "CEFR level id, e.g. 'a1'." },
          category: { type: "string", description: "A vocabulary category id." },
          limit: { type: "integer", description: "How many words (1-15). Default 10." },
        },
        additionalProperties: false,
      },
    },
    async execute(context: CoachToolContext, args: unknown) {
      const record = readArguments(args, ["status", "level", "category", "limit"]);
      const categoryId = optionalString(record, "category", 64);
      const result = await deps.listVocabulary.execute({
        userId: context.userId,
        languageId: context.languageId,
        levelId: optionalEnum(record, "level", ["a1", "a2", "b1", "b2", "c1", "c2"]),
        categoryId: categoryId === undefined ? undefined : createVocabularyCategoryId(categoryId),
        status: optionalEnum(record, "status", ["new", "saved", "learning", "learned"]),
        limit: optionalCount(record, "limit", { min: 1, max: MAX_WORDS, fallback: 10 }),
      });
      return {
        total: result.total,
        words: result.items.map((entry) => ({
          id: entry.item.id,
          lemma: entry.item.lemma,
          translation: entry.item.translation,
          category: entry.category.title,
          level: entry.item.levelId ?? null,
          learnerStatus: entry.userState.status,
        })),
      };
    },
  };
}

function vocabularyItemTool(deps: ContentToolDependencies): CoachTool {
  return {
    declaration: {
      name: "get_vocabulary_item",
      description:
        "One vocabulary entry in full: the word, its meaning, grammar (part of speech, gender, plural), the authored example sentence, any usage note, and the learner's status for it.",
      parameters: {
        type: "object",
        properties: {
          vocabularyItemId: { type: "string", description: "The entry's id, e.g. 'pl-dom'." },
        },
        required: ["vocabularyItemId"],
        additionalProperties: false,
      },
    },
    async execute(context: CoachToolContext, args: unknown) {
      const record = readArguments(args, ["vocabularyItemId"]);
      const detail = await deps.getVocabularyItem.execute({
        userId: context.userId,
        vocabularyItemId: createVocabularyItemId(requiredString(record, "vocabularyItemId", 64)),
      });
      const { item } = detail;
      return {
        id: item.id,
        lemma: item.lemma,
        translation: item.translation,
        instructionLanguage: item.instructionLanguage,
        level: item.levelId ?? null,
        partOfSpeech: item.partOfSpeech ?? null,
        gender: item.gender ?? null,
        plural: item.plural ?? null,
        note: item.note ?? null,
        example: item.example
          ? { text: item.example.text, translation: item.example.translation }
          : null,
        category: detail.category.title,
        learnerStatus: detail.userState.status,
      };
    },
  };
}

function phoneticsListTool(deps: ContentToolDependencies): CoachTool {
  return {
    declaration: {
      name: "list_phonetics",
      description:
        "The pronunciation entries of the learner's language: each sound's IPA, a short description and the learner's own practice progress.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "integer", description: "How many entries (1-15). Default 10." },
        },
        additionalProperties: false,
      },
    },
    async execute(context: CoachToolContext, args: unknown) {
      const record = readArguments(args, ["limit"]);
      const result = await deps.listPhonetics.execute({
        userId: context.userId,
        languageId: context.languageId,
        limit: optionalCount(record, "limit", { min: 1, max: MAX_WORDS, fallback: 10 }),
      });
      return {
        sounds: result.items.map((entry) => ({
          id: entry.representation.id,
          ipa: entry.representation.ipa,
          description: entry.representation.description,
          topic: entry.topic?.title ?? null,
          learnerProgress: entry.progress.status,
        })),
      };
    },
  };
}

function phoneticTool(deps: ContentToolDependencies): CoachTool {
  return {
    declaration: {
      name: "get_phonetic_information",
      description:
        "One pronunciation entry in full: IPA, how the sound is produced, example words, and any contrast note. This is the application's authored phonetics data — use it instead of describing sounds from memory. It does not let you hear the learner.",
      parameters: {
        type: "object",
        properties: {
          phoneticId: { type: "string", description: "The entry's id, e.g. 'pl-sz'." },
        },
        required: ["phoneticId"],
        additionalProperties: false,
      },
    },
    async execute(context: CoachToolContext, args: unknown) {
      const record = readArguments(args, ["phoneticId"]);
      const detail = await deps.getPhonetic.execute({
        userId: context.userId,
        phoneticRepresentationId: createPhoneticRepresentationId(
          requiredString(record, "phoneticId", 64),
        ),
      });
      const { representation } = detail;
      return {
        id: representation.id,
        ipa: representation.ipa,
        description: representation.description,
        note: representation.note ?? null,
        level: representation.levelId ?? null,
        topic: detail.topic?.title ?? null,
        exampleWords: (representation.exampleWords ?? []).slice(0, MAX_WORDS),
        learnerProgress: detail.progress.status,
        note_for_coach:
          "You cannot hear the learner. Describe what to do and what to compare with; never score their pronunciation.",
      };
    },
  };
}

/** Grammar tables are flattened to rows of plain strings: readable to a model, cheap in tokens. */
function toGrammarSections(topic: GrammarTopic) {
  return topic.sections.slice(0, 6).map((section) => ({
    heading: section.heading ?? null,
    text: section.text ?? null,
    table: section.table
      ? {
          caption: section.table.caption ?? null,
          columns: section.table.columns,
          rows: section.table.rows.slice(0, MAX_GRAMMAR_ROWS),
        }
      : null,
    examples: (section.examples ?? []).slice(0, 6).map((example) => ({
      text: example.text,
      translation: example.translation,
    })),
  }));
}

function grammarTopicsTool(deps: ContentToolDependencies): CoachTool {
  return {
    declaration: {
      name: "list_grammar_topics",
      description:
        "The grammar reference topics this language has (cases, verbs, pronouns, numbers and so on), by category. Use it to find the right topic id before calling get_grammar_topic.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
    async execute(context: CoachToolContext, args: unknown) {
      readArguments(args, []);
      if (!deps.grammar) return { topics: [], note: "No grammar reference is loaded." };
      const topics = sortGrammarTopics(
        (await deps.grammar.listTopics(context.languageId)).filter(isPublished),
      );
      return {
        topics: topics.slice(0, MAX_TOPICS).map((topic) => ({
          id: topic.id,
          title: topic.title,
          category: topic.category,
          description: topic.description,
        })),
      };
    },
  };
}

function grammarTopicTool(deps: ContentToolDependencies): CoachTool {
  return {
    declaration: {
      name: "get_grammar_topic",
      description:
        "One grammar reference topic: its explanation, its conjugation/declension tables and authored examples. Explain grammar from this, not from memory, so the learner sees the same forms the application shows.",
      parameters: {
        type: "object",
        properties: {
          topicId: { type: "string", description: "The topic's id, e.g. 'pl-present-tense'." },
        },
        required: ["topicId"],
        additionalProperties: false,
      },
    },
    async execute(context: CoachToolContext, args: unknown) {
      const record = readArguments(args, ["topicId"]);
      if (!deps.grammar) return { error: "No grammar reference is loaded." };
      const topic = await deps.grammar.findTopic(
        createGrammarTopicId(requiredString(record, "topicId", 64)),
      );
      // Another language's topic is the same "not found" as a missing one: the coach never crosses
      // from the learner's language into another's content.
      if (!topic || !isPublished(topic) || topic.languageId !== context.languageId) {
        return { error: "No such grammar topic for this learner's language." };
      }
      return {
        id: topic.id,
        title: topic.title,
        category: topic.category,
        description: topic.description,
        level: topic.levelId ?? null,
        sections: toGrammarSections(topic),
      };
    },
  };
}

/**
 * The published video of a lesson, with its transcript — the M21/M22 media the learner is actually
 * watching. The transcript is the only reason the coach can answer "what did she just say?"
 * honestly, and the tool says plainly when there is no video, so the model does not invent a scene.
 */
function lessonVideoTool(deps: ContentToolDependencies): CoachTool {
  return {
    declaration: {
      name: "get_lesson_video_context",
      description:
        "The published video for a lesson: its learning objective, the words it teaches, and its transcript line by line (speaker, target-language line, translation). Answer questions about a video only from this transcript.",
      parameters: {
        type: "object",
        properties: {
          lessonId: { type: "string", description: "The lesson's id, e.g. 'pl-greetings'." },
        },
        required: ["lessonId"],
        additionalProperties: false,
      },
    },
    async execute(context: CoachToolContext, args: unknown) {
      const record = readArguments(args, ["lessonId"]);
      const lessonId = createContentId(requiredString(record, "lessonId", 64));
      // The lesson's own visibility is checked first, so media cannot be read for a lesson the
      // learner may not open (an unpublished lesson, or a level that is not available).
      const detail = await deps.getLesson.execute({ userId: context.userId, lessonId });
      const media = deps.media?.find({ type: "lesson", id: detail.lesson.id });
      const video = media?.video;
      if (!video) {
        return {
          lessonId: detail.lesson.id,
          video: null,
          note: "This lesson has no published video yet. Do not describe one.",
        };
      }
      return {
        lessonId: detail.lesson.id,
        objective: video.objective ?? null,
        narrator: video.narrator,
        durationSeconds: video.durationSeconds,
        targetVocabularyIds: (video.targetVocabularyIds ?? []).slice(0, MAX_WORDS),
        transcript: video.transcript.slice(0, MAX_TRANSCRIPT_LINES).map((line) => ({
          speaker: line.speaker ?? null,
          text: line.text,
          language: line.language,
          translation: line.translation ?? null,
        })),
        linesOmitted: Math.max(0, video.transcript.length - MAX_TRANSCRIPT_LINES),
        note: "The voices are synthesized. Never claim a line that is not in this transcript.",
      };
    },
  };
}

export function createContentTools(deps: ContentToolDependencies): readonly CoachTool[] {
  return [
    lessonsTool(deps),
    lessonTool(deps),
    vocabularyListTool(deps),
    vocabularyItemTool(deps),
    phoneticsListTool(deps),
    phoneticTool(deps),
    grammarTopicsTool(deps),
    grammarTopicTool(deps),
    lessonVideoTool(deps),
  ];
}

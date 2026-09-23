import { isPublished } from "../content/content-status.js";
import type { LanguageId } from "../language/language-id.js";
import type { LanguageLevel } from "../language/language-level.js";
import type { LevelId } from "../language/level-id.js";
import { phoneticRepresentationIdBelongsToLanguage } from "./phonetic-representation-id.js";
import type { PhoneticRepresentation } from "./phonetic-representation.js";
import type { PhoneticTopic } from "./phonetic-topic.js";

/** What the phonetics rules need to know about the rest of the catalog. */
export interface PhoneticsCatalogContext {
  languageIds: ReadonlySet<LanguageId>;
  /** The declared availability of a language's level, or `undefined` when it does not declare it. */
  levelStatusOf: (languageId: LanguageId, levelId: LevelId) => LanguageLevel["status"] | undefined;
}

const topicKey = (languageId: LanguageId, topicId: string) => `${languageId}/${topicId}`;

/**
 * The phonetics rules that no single file can see: identity (a representation id is unique
 * everywhere and namespaced by its language, a topic id is unique within its language), the topic
 * each representation belongs to when it has one (it must exist in the representation's own
 * language), ordering, and honest availability.
 *
 * Availability is held to the same standard as vocabulary: a *published* representation lives
 * only in a level that is `available` (when it declares one), and only in a *published* topic
 * (when it declares one), and a published topic always has at least one published representation
 * — so a student is never offered a hidden sound or an empty topic. Drafts are exempt: they are
 * being prepared. Unlike vocabulary, a representation's topic is itself optional (a sound need not
 * belong to a grouping), so an untopicked representation is exempt from the topic checks.
 *
 * Problems are appended to `issues`, so an author fixes them all in one pass.
 */
export function validatePhonetics(
  phoneticTopics: readonly PhoneticTopic[],
  phonetics: readonly PhoneticRepresentation[],
  context: PhoneticsCatalogContext,
  issues: string[],
): void {
  const topics = validateTopics(phoneticTopics, context, issues);
  const publishedTopics = validateRepresentations(phonetics, topics, context, issues);

  for (const [key, topic] of topics) {
    if (isPublished(topic) && !publishedTopics.has(key)) {
      issues.push(
        `Phonetic topic "${topic.id}" of "${topic.languageId}" is published but has no published representations.`,
      );
    }
  }
}

/** Checks each topic and returns the ones that can be referenced, by `language/topic` key. */
function validateTopics(
  phoneticTopics: readonly PhoneticTopic[],
  context: PhoneticsCatalogContext,
  issues: string[],
): Map<string, PhoneticTopic> {
  const byKey = new Map<string, PhoneticTopic>();
  const orders = new Set<string>();

  for (const topic of phoneticTopics) {
    const { id, languageId } = topic;

    if (!context.languageIds.has(languageId)) {
      issues.push(`Phonetic topic "${id}" references unknown language "${languageId}".`);
      continue;
    }

    const key = topicKey(languageId, id);
    if (byKey.has(key)) {
      issues.push(`Duplicate phonetic topic "${id}" in language "${languageId}".`);
      continue;
    }
    byKey.set(key, topic);

    const orderKey = `${languageId}#${String(topic.order)}`;
    if (orders.has(orderKey)) {
      issues.push(
        `Phonetic topic "${id}" reuses order ${String(topic.order)} in language "${languageId}".`,
      );
    }
    orders.add(orderKey);
  }
  return byKey;
}

/** Checks each representation and returns the topics (by key) that hold at least one published representation. */
function validateRepresentations(
  phonetics: readonly PhoneticRepresentation[],
  topics: ReadonlyMap<string, PhoneticTopic>,
  context: PhoneticsCatalogContext,
  issues: string[],
): Set<string> {
  const representationIds = new Set<string>();
  const orders = new Set<string>();
  const topicsWithPublishedRepresentations = new Set<string>();

  for (const representation of phonetics) {
    const { id, languageId } = representation;

    if (representationIds.has(id)) {
      issues.push(`Duplicate phonetic representation id "${id}".`);
    }
    representationIds.add(id);

    if (!context.languageIds.has(languageId)) {
      issues.push(`Phonetic representation "${id}" references unknown language "${languageId}".`);
      continue;
    }
    if (!phoneticRepresentationIdBelongsToLanguage(id, languageId)) {
      issues.push(
        `Phonetic representation id "${id}" must start with its language id "${languageId}-".`,
      );
    }

    if (representation.topicId !== undefined) {
      const key = topicKey(languageId, representation.topicId);
      const topic = topics.get(key);
      if (!topic) {
        issues.push(
          `Phonetic representation "${id}" references unknown topic "${representation.topicId}" in language "${languageId}".`,
        );
      } else {
        const orderKey = `${key}#${String(representation.order)}`;
        if (orders.has(orderKey)) {
          issues.push(
            `Phonetic representation "${id}" reuses order ${String(representation.order)} in topic "${representation.topicId}" of "${languageId}".`,
          );
        }
        orders.add(orderKey);

        if (isPublished(representation)) {
          topicsWithPublishedRepresentations.add(key);
          if (!isPublished(topic)) {
            issues.push(
              `Published phonetic representation "${id}" belongs to topic "${representation.topicId}", which is not published.`,
            );
          }
        }
      }
    }

    if (representation.levelId !== undefined) {
      const status = context.levelStatusOf(languageId, representation.levelId);
      if (status === undefined) {
        issues.push(
          `Phonetic representation "${id}" is in level "${representation.levelId}", which language "${languageId}" does not declare.`,
        );
      } else if (isPublished(representation) && status !== "available") {
        issues.push(
          `Published phonetic representation "${id}" is in ${languageId}/${representation.levelId}, which is not available.`,
        );
      }
    }
  }
  return topicsWithPublishedRepresentations;
}

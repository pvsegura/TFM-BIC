import { isPublished } from "@tfm-bic/domain";

import type { LoadContentResult } from "./load-content-catalog.js";

export interface ContentReport {
  text: string;
  exitCode: 0 | 1;
}

function plural(count: number, noun: string, pluralNoun = `${noun}s`): string {
  return `${String(count)} ${count === 1 ? noun : pluralNoun}`;
}

/** Human-readable outcome of validating the content tree, for `pnpm content:validate`. */
export function formatContentReport(result: LoadContentResult): ContentReport {
  if (result.ok) {
    const {
      languages,
      content,
      exercises,
      vocabulary,
      vocabularyCategories,
      phonetics,
      phoneticTopics,
    } = result.catalog;
    const published = content.filter(isPublished).length;
    const publishedExercises = exercises.filter(isPublished).length;
    const publishedVocabulary = vocabulary.filter(isPublished).length;
    const publishedPhonetics = phonetics.filter(isPublished).length;
    return {
      exitCode: 0,
      text: `Content is valid: ${plural(languages.length, "language")}, ${plural(content.length, "content item")} (${String(published)} published), ${plural(exercises.length, "exercise")} (${String(publishedExercises)} published), ${plural(vocabulary.length, "vocabulary entry", "vocabulary entries")} (${String(publishedVocabulary)} published) in ${plural(vocabularyCategories.length, "category", "categories")}, ${plural(phonetics.length, "phonetic representation")} (${String(publishedPhonetics)} published) in ${plural(phoneticTopics.length, "topic")}.`,
    };
  }

  const lines = result.issues.map((issue) => `  - ${issue.location}: ${issue.message}`);
  return {
    exitCode: 1,
    text: `Content is invalid: ${plural(result.issues.length, "problem")}.\n${lines.join("\n")}`,
  };
}

import { LANGUAGE } from "../i18n/index.js";

/**
 * Which course of a language the learner follows, when the language offers several (Polish is
 * taught both in English and in Spanish). Choosing a course on "Other courses" remembers it per
 * browser; without a choice the interface language picks it, and the server falls back to the
 * language's default course when that one does not exist.
 */
const key = (language: string) => `verbysia-course:${language}`;

export function instructionFor(language: string): string {
  try {
    return globalThis.localStorage?.getItem(key(language)) ?? LANGUAGE;
  } catch {
    return LANGUAGE;
  }
}

export function chooseCourse(language: string, instruction: string): void {
  try {
    globalThis.localStorage?.setItem(key(language), instruction);
  } catch {
    // Storage blocked: the interface language keeps picking the course.
  }
}

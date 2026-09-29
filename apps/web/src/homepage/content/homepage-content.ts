import en from "./homepage.en.json";

/**
 * Every word the public homepage shows (M20A) lives in one JSON file per interface locale, never in
 * the components — so the page can be translated by adding a file, the same idea as the achievement
 * texts, the one locale seam the product already has
 * (packages/application/src/gamification/achievement-texts.ts). The interface is English-only today.
 *
 * Two kinds of content are in the file:
 * - **copy** — what the product is and does, written only from what exists in the repository;
 * - **examples** — words, sounds, an exercise and lesson titles copied verbatim from the shipped A1
 *   content (`content/languages/pl/`: levels/a1/content/pl-spelling-and-sounds.json,
 *   phonetics/*.json, videos/pl-a1-nasal-vowels-demo.json, levels/a1/exercises/pl-polite-words-sorry.json,
 *   vocabulary/greetings.json), point amounts from packages/domain/src/gamification/point-amount.ts,
 *   achievement titles from achievement-texts.ts and roadmap languages from docs/product/roadmap.md.
 *   The page always labels them as examples.
 *
 * Live facts — which languages and levels are open — are not in the file: they come from the
 * public catalog API.
 */

export interface CallToAction {
  label: string;
  to: string;
}

export interface CallToActionPair {
  primary: CallToAction;
  secondary: CallToAction;
}

export type SceneKey =
  | "hero"
  | "understand"
  | "listen"
  | "watch"
  | "practise"
  | "remember"
  | "progress"
  | "journey"
  | "languages"
  | "begin";

export interface ExerciseOption {
  id: string;
  text: string;
  meaning: string;
}

export interface HomepageContent {
  meta: { title: string; description: string };
  chapters: Readonly<Record<SceneKey, string>>;
  /** Visitors are invited to register; signed-in students are sent back to their work. */
  cta: { guest: CallToActionPair; member: CallToActionPair };
  hero: { eyebrow: string; title: string; lead: string; scrollCue: string };
  word: {
    headword: string;
    syllables: readonly string[];
    ipa: string;
    gloss: string;
    partOfSpeech: string;
    source: string;
  };
  understand: {
    title: string;
    lead: string;
    facets: readonly { term: string; detail: string }[];
  };
  listen: { title: string; lead: string; speeds: readonly string[]; figureLabel: string };
  watch: {
    title: string;
    lead: string;
    videoTitle: string;
    keyframes: readonly { glyph: string; caption: string }[];
    status: string;
  };
  practise: {
    title: string;
    lead: string;
    note: string;
    prompt: string;
    options: readonly ExerciseOption[];
    correctOptionId: string;
    check: string;
    correct: string;
    /** `{text}` and `{meaning}` are replaced with the chosen option's. */
    incorrect: string;
    explanation: string;
  };
  remember: {
    title: string;
    lead: string;
    listLabel: string;
    words: readonly { word: string; gloss: string; status: string }[];
    statusesNote: string;
  };
  progress: {
    title: string;
    lead: string;
    illustrationLabel: string;
    lessonsHeading: string;
    lessons: readonly { title: string; status: string; fraction: number }[];
    pointsHeading: string;
    points: readonly { reason: string; amount: string }[];
    achievementsHeading: string;
    achievements: readonly string[];
  };
  journey: {
    title: string;
    lead: string;
    disclaimer: string;
    available: string;
    planned: string;
    loading: string;
    unavailable: string;
    /** Shown only while the catalog cannot be read: the CEFR scale itself is not product data. */
    cefrLevels: readonly string[];
  };
  languages: {
    title: string;
    lead: string;
    availableHeading: string;
    availableStatus: string;
    roadmapHeading: string;
    roadmapStatus: string;
    roadmap: readonly { code: string; nativeName: string }[];
    loading: string;
    unavailable: string;
  };
  begin: { title: string; lead: string };
}

export const DEFAULT_HOMEPAGE_LOCALE = "en";

// Typed here, so a JSON file with a missing or misspelled key fails the type check.
const EN: HomepageContent = en;

const HOMEPAGE_CONTENT: Readonly<Record<string, HomepageContent>> = { en: EN };

/** The homepage copy for an interface locale (`en`, `en-GB`, …), falling back to the default. */
export function homepageContent(locale: string = DEFAULT_HOMEPAGE_LOCALE): HomepageContent {
  const base = locale.toLowerCase().split("-")[0] ?? DEFAULT_HOMEPAGE_LOCALE;
  return HOMEPAGE_CONTENT[base] ?? EN;
}

/** Replaces `{name}` placeholders; unknown names are left as they are. */
export function fillTemplate(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => values[name] ?? match);
}

import { InvalidLevelIdError } from "./errors/invalid-level-id.error.js";

/** The six CEFR levels, lowest first. A closed union: a plain string cannot be used as a `LevelId`. */
export const LEVEL_IDS = ["a1", "a2", "b1", "b2", "c1", "c2"] as const;
export type LevelId = (typeof LEVEL_IDS)[number];

export interface Level {
  readonly id: LevelId;
  /** Display text only — never used as an identifier. */
  readonly label: string;
  /** 1 (lowest) to 6; the only thing level ordering depends on. */
  readonly rank: number;
}

/**
 * The CEFR proficiency scale (Council of Europe): A1 (lowest) to C2. This is
 * the vocabulary of the model — a fixed, language-independent standard — so it
 * lives in code, and which levels a given language actually offers is data
 * (see `LanguageLevel`). The stable `id` is what URLs, files and (later)
 * database rows reference.
 *
 * No level descriptors are stored on purpose: the app does not restate the
 * CEFR "can do" statements, and does not claim its content is CEFR-certified —
 * see docs/architecture/content-architecture.md.
 */
export const CEFR_LEVELS: readonly Level[] = [
  { id: "a1", label: "A1", rank: 1 },
  { id: "a2", label: "A2", rank: 2 },
  { id: "b1", label: "B1", rank: 3 },
  { id: "b2", label: "B2", rank: 4 },
  { id: "c1", label: "C1", rank: 5 },
  { id: "c2", label: "C2", rank: 6 },
];

export function isValidLevelId(value: string): value is LevelId {
  return LEVEL_IDS.some((id) => id === value);
}

export function createLevelId(value: string): LevelId {
  if (!isValidLevelId(value)) {
    throw new InvalidLevelIdError(value);
  }
  return value;
}

export function getLevel(id: LevelId): Level {
  const level = CEFR_LEVELS.find((candidate) => candidate.id === id);
  if (!level) {
    // Unreachable for a LevelId; keeps the return type honest.
    throw new InvalidLevelIdError(id);
  }
  return level;
}

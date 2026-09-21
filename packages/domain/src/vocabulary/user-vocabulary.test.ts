import { describe, expect, it } from "vitest";

import { InvalidVocabularyTransitionError } from "./errors/invalid-vocabulary-transition.error.js";
import {
  ALLOWED_STATUS_CHANGES,
  changeVocabularyStatus,
  evaluateStatusChange,
  saveVocabularyItem,
  statusOf,
  STORED_VOCABULARY_STATUSES,
  VOCABULARY_VIEW_STATUSES,
  type StoredVocabularyStatus,
  type UserVocabularyEntry,
} from "./user-vocabulary.js";
import { createVocabularyItemId } from "./vocabulary-item-id.js";

const USER = "user-1";
const WORD = createVocabularyItemId("pl-dom");
const T0 = new Date("2026-01-01T10:00:00.000Z");
const T1 = new Date("2026-01-01T10:05:00.000Z");
const T2 = new Date("2026-01-01T10:10:00.000Z");

const saved: UserVocabularyEntry = {
  userId: USER,
  vocabularyItemId: WORD,
  status: "saved",
  createdAt: T0,
  updatedAt: T0,
  learnedAt: null,
};
const learning: UserVocabularyEntry = { ...saved, status: "learning", updatedAt: T1 };
const learned: UserVocabularyEntry = {
  ...saved,
  status: "learned",
  updatedAt: T1,
  learnedAt: T1,
};

describe("statuses", () => {
  it("stores saved, learning and learned; `new` is derived from the absence of a record", () => {
    expect(STORED_VOCABULARY_STATUSES).toEqual(["saved", "learning", "learned"]);
    expect(VOCABULARY_VIEW_STATUSES).toEqual(["new", "saved", "learning", "learned"]);
    expect(STORED_VOCABULARY_STATUSES).not.toContain("new");
  });

  it("derives the status a student sees from the record, or its absence", () => {
    expect(statusOf(null)).toBe("new");
    expect(statusOf(saved)).toBe("saved");
    expect(statusOf(learning)).toBe("learning");
    expect(statusOf(learned)).toBe("learned");
  });
});

describe("evaluateStatusChange", () => {
  it("lets a word that has no record take any stored status", () => {
    for (const target of STORED_VOCABULARY_STATUSES) {
      expect(evaluateStatusChange(null, target)).toBe("apply");
    }
  });

  it("treats asking for the status a word already has as a no-op, not an error", () => {
    for (const status of STORED_VOCABULARY_STATUSES) {
      expect(evaluateStatusChange(status, status)).toBe("unchanged");
    }
  });

  it("allows moving forward, including skipping a step", () => {
    expect(evaluateStatusChange("saved", "learning")).toBe("apply");
    expect(evaluateStatusChange("learning", "learned")).toBe("apply");
    expect(evaluateStatusChange("saved", "learned")).toBe("apply");
  });

  it("allows exactly one step back: a learned word can return to learning", () => {
    expect(evaluateStatusChange("learned", "learning")).toBe("apply");
  });

  it("refuses every other step back", () => {
    expect(evaluateStatusChange("learned", "saved")).toBe("invalid");
    expect(evaluateStatusChange("learning", "saved")).toBe("invalid");
  });

  it("publishes the allowed changes as data, which is exactly what evaluateStatusChange accepts", () => {
    const stored: (StoredVocabularyStatus | null)[] = [null, ...STORED_VOCABULARY_STATUSES];
    const applied: [StoredVocabularyStatus | null, StoredVocabularyStatus][] = [];
    for (const from of stored) {
      for (const to of STORED_VOCABULARY_STATUSES) {
        if (evaluateStatusChange(from, to) === "apply") {
          applied.push([from, to]);
        }
      }
    }

    // Changes from an existing record are listed; creating one (from null) is always allowed.
    expect(applied.filter(([from]) => from !== null)).toEqual(
      ALLOWED_STATUS_CHANGES.map(([from, to]) => [from, to]),
    );
  });
});

describe("saveVocabularyItem", () => {
  it("creates a saved record stamped with the given time", () => {
    expect(saveVocabularyItem(null, USER, WORD, T0)).toEqual(saved);
  });

  it("returns an existing record untouched, whatever its status, so saving never regresses a word", () => {
    expect(saveVocabularyItem(saved, USER, WORD, T2)).toBe(saved);
    expect(saveVocabularyItem(learning, USER, WORD, T2)).toBe(learning);
    expect(saveVocabularyItem(learned, USER, WORD, T2)).toBe(learned);
  });
});

describe("changeVocabularyStatus", () => {
  it("creates a learned record for a word never saved, learned now", () => {
    expect(changeVocabularyStatus(null, USER, WORD, "learned", T1)).toEqual({
      change: "apply",
      entry: { ...saved, status: "learned", createdAt: T1, updatedAt: T1, learnedAt: T1 },
    });
  });

  it("creates a learning record for a word never saved, with no learned time", () => {
    expect(changeVocabularyStatus(null, USER, WORD, "learning", T1)).toEqual({
      change: "apply",
      entry: { ...saved, status: "learning", createdAt: T1, updatedAt: T1, learnedAt: null },
    });
  });

  it("moves a saved word to learned, keeping when it was saved and recording when it was learned", () => {
    expect(changeVocabularyStatus(saved, USER, WORD, "learned", T1)).toEqual({
      change: "apply",
      entry: learned,
    });
  });

  it("moves a learned word back to learning and clears the learned time", () => {
    const result = changeVocabularyStatus(learned, USER, WORD, "learning", T2);

    expect(result).toEqual({
      change: "apply",
      entry: { ...saved, status: "learning", updatedAt: T2, learnedAt: null },
    });
  });

  it("returns the record as it is when the word already has the requested status, keeping its original learned time", () => {
    const result = changeVocabularyStatus(learned, USER, WORD, "learned", T2);

    expect(result.change).toBe("unchanged");
    expect(result.entry).toBe(learned);
    expect(result.entry.learnedAt).toEqual(T1);
  });

  it("refuses a step back other than learned to learning, and returns the record untouched", () => {
    const toSaved = changeVocabularyStatus(learned, USER, WORD, "saved", T2);
    const learningToSaved = changeVocabularyStatus(learning, USER, WORD, "saved", T2);

    expect(toSaved).toEqual({ change: "invalid", entry: learned });
    expect(learningToSaved).toEqual({ change: "invalid", entry: learning });
  });

  it("keeps the invariant: learnedAt is set if and only if the status is learned", () => {
    const stored: (UserVocabularyEntry | null)[] = [null, saved, learning, learned];
    for (const existing of stored) {
      for (const target of STORED_VOCABULARY_STATUSES) {
        const { entry } = changeVocabularyStatus(existing, USER, WORD, target, T2);
        expect(entry.learnedAt !== null).toBe(entry.status === "learned");
      }
    }
  });
});

describe("InvalidVocabularyTransitionError", () => {
  it("names the two statuses and nothing about the student", () => {
    const error = new InvalidVocabularyTransitionError("learned", "saved");

    expect(error.name).toBe("InvalidVocabularyTransitionError");
    expect(error.message).toBe('A vocabulary item cannot change from "learned" to "saved".');
  });
});

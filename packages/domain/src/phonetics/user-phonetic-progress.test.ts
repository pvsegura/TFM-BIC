import { describe, expect, it } from "vitest";

import { createPhoneticRepresentationId } from "./phonetic-representation-id.js";
import {
  completePhonetic,
  PHONETIC_PROGRESS_STATUSES,
  PHONETIC_PROGRESS_VIEW_STATUSES,
  phoneticProgressStatusOf,
  recordPhoneticPractice,
  recordPhoneticView,
  type UserPhoneticProgress,
} from "./user-phonetic-progress.js";

const USER = "user-1";
const REPRESENTATION = createPhoneticRepresentationId("pl-ipa-ts");
const T0 = new Date("2026-01-01T10:00:00.000Z");
const T1 = new Date("2026-01-01T10:05:00.000Z");
const T2 = new Date("2026-01-01T10:10:00.000Z");

const viewed: UserPhoneticProgress = {
  userId: USER,
  phoneticRepresentationId: REPRESENTATION,
  status: "viewed",
  firstViewedAt: T0,
  lastViewedAt: T0,
  practicedAt: null,
  completedAt: null,
};

const practiced: UserPhoneticProgress = {
  ...viewed,
  status: "practiced",
  lastViewedAt: T1,
  practicedAt: T1,
};

const completed: UserPhoneticProgress = {
  ...practiced,
  status: "completed",
  lastViewedAt: T1,
  completedAt: T1,
};

describe("phoneticProgressStatusOf", () => {
  it("derives not_started from the absence of a record, so it is never stored", () => {
    expect(phoneticProgressStatusOf(null)).toBe("not_started");
    expect(PHONETIC_PROGRESS_STATUSES).not.toContain("not_started");
  });

  it("reports the stored status otherwise", () => {
    expect(phoneticProgressStatusOf(viewed)).toBe("viewed");
    expect(phoneticProgressStatusOf(practiced)).toBe("practiced");
    expect(phoneticProgressStatusOf(completed)).toBe("completed");
  });
});

describe("PHONETIC_PROGRESS_VIEW_STATUSES", () => {
  it("is the stored statuses plus the derived not_started, in progression order", () => {
    expect(PHONETIC_PROGRESS_VIEW_STATUSES).toEqual([
      "not_started",
      "viewed",
      "practiced",
      "completed",
    ]);
  });
});

describe("recordPhoneticView", () => {
  it("creates a viewed record stamped with the given time", () => {
    expect(recordPhoneticView(null, USER, REPRESENTATION, T0)).toEqual(viewed);
  });

  it("keeps the first view time but refreshes the last view time on a repeat visit", () => {
    const again = recordPhoneticView(viewed, USER, REPRESENTATION, T2);

    expect(again).toEqual({ ...viewed, lastViewedAt: T2 });
  });

  it("never takes a practiced representation back to viewed, but still refreshes the last view time", () => {
    const again = recordPhoneticView(practiced, USER, REPRESENTATION, T2);

    expect(again).toEqual({ ...practiced, lastViewedAt: T2 });
  });

  it("never takes a completed representation back to an earlier status", () => {
    const again = recordPhoneticView(completed, USER, REPRESENTATION, T2);

    expect(again).toEqual({ ...completed, lastViewedAt: T2 });
  });
});

describe("recordPhoneticPractice", () => {
  it("creates a practiced record directly, viewed and practiced at the same moment", () => {
    expect(recordPhoneticPractice(null, USER, REPRESENTATION, T0)).toEqual({
      userId: USER,
      phoneticRepresentationId: REPRESENTATION,
      status: "practiced",
      firstViewedAt: T0,
      lastViewedAt: T0,
      practicedAt: T0,
      completedAt: null,
    });
  });

  it("advances a viewed representation to practiced", () => {
    expect(recordPhoneticPractice(viewed, USER, REPRESENTATION, T1)).toEqual(practiced);
  });

  it("refreshes the practice time on a representation practiced again, without changing its status", () => {
    const again = recordPhoneticPractice(practiced, USER, REPRESENTATION, T2);

    expect(again).toEqual({ ...practiced, lastViewedAt: T2, practicedAt: T2 });
  });

  it("never takes a completed representation back to practiced, but still refreshes its practice time", () => {
    const again = recordPhoneticPractice(completed, USER, REPRESENTATION, T2);

    expect(again).toEqual({ ...completed, lastViewedAt: T2, practicedAt: T2 });
    expect(again.status).toBe("completed");
  });
});

describe("completePhonetic", () => {
  it("completes a representation that was never viewed or practiced, all at the same moment", () => {
    expect(completePhonetic(null, USER, REPRESENTATION, T1)).toEqual({
      userId: USER,
      phoneticRepresentationId: REPRESENTATION,
      status: "completed",
      firstViewedAt: T1,
      lastViewedAt: T1,
      practicedAt: null,
      completedAt: T1,
    });
  });

  it("completes a viewed representation, keeping its first view time", () => {
    expect(completePhonetic(viewed, USER, REPRESENTATION, T1)).toEqual({
      ...viewed,
      status: "completed",
      lastViewedAt: T1,
      completedAt: T1,
    });
  });

  it("completes a practiced representation, keeping its practice time", () => {
    expect(completePhonetic(practiced, USER, REPRESENTATION, T2)).toEqual({
      ...practiced,
      status: "completed",
      lastViewedAt: T2,
      completedAt: T2,
    });
  });

  it("is idempotent: completing again changes nothing, not even the completion time", () => {
    const again = completePhonetic(completed, USER, REPRESENTATION, T2);

    expect(again).toEqual(completed);
    expect(again.completedAt).toEqual(T1);
  });

  it("does not mutate the record it was given", () => {
    const before = { ...viewed };

    completePhonetic(viewed, USER, REPRESENTATION, T1);

    expect(viewed).toEqual(before);
  });
});
